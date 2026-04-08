'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Search, UserPlus, UserCheck, UserX, Users, Check, X, Trash2 } from 'lucide-react';
import type { Friendship, Profile } from '@/lib/types';

function Avatar({ profile, size = 40 }: { profile: Profile | undefined; size?: number }) {
  const initials = (profile?.display_name?.[0] || profile?.username?.[0] || '?').toUpperCase();
  return (
    <div
      className="rounded-full bg-sky-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function ProfileRow({
  profile,
  action,
}: {
  profile: Profile | undefined;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      <Avatar profile={profile} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {profile?.display_name || profile?.username || 'Pilote'}
        </p>
        {profile?.username && profile?.display_name && (
          <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    friends,
    pendingReceived,
    pendingSent,
    searchResults,
    loading,
    fetchFriends,
    fetchPendingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    setSearchResults,
  } = useFriends();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [fetchFriends, fetchPendingRequests]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (!value.trim()) { setSearchResults([]); return; }
      setSearchLoading(true);
      try {
        await searchUsers(value);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchUsers, setSearchResults]
  );

  const handleSendRequest = async (userId: string) => {
    setActionLoading(userId);
    try {
      await sendFriendRequest(userId);
      setToast('Demande envoyée !');
    } catch (e: any) {
      setToast(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await acceptFriendRequest(friendshipId);
      setToast('Ami ajouté !');
    } catch (e: any) {
      setToast(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await rejectFriendRequest(friendshipId);
    } catch (e: any) {
      setToast(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await removeFriend(friendshipId);
      setToast('Ami retiré');
    } catch (e: any) {
      setToast(e.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  // Determine if a profile is already a friend or has pending request
  const getFriendshipState = (profileId: string) => {
    if (friends.some((f) => f.requester_id === profileId || f.addressee_id === profileId)) {
      return 'friend';
    }
    if (pendingSent.some((f) => f.addressee_id === profileId)) {
      return 'sent';
    }
    if (pendingReceived.some((f) => f.requester_id === profileId)) {
      return 'received';
    }
    return 'none';
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!user) return null;

  const pendingCount = pendingReceived.length;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-4 pt-safe-top border-b border-gray-100">
        <div className="pt-4 pb-4">
          <h1 className="text-xl font-bold text-gray-900">Amis</h1>
          <p className="text-sm text-gray-500">Gérez vos contacts pilotes</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              handleSearch(e.target.value);
              if (e.target.value) setTab('search');
              else setTab('friends');
            }}
            placeholder="Rechercher un pilote..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Tabs */}
        {!query && (
          <div className="flex gap-2 pb-1">
            {(['friends', 'requests'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: tab === t ? '#3A3A3A' : '#F3F4F6',
                  color: tab === t ? 'white' : '#6B7280',
                }}
              >
                {t === 'friends' ? `Amis (${friends.length})` : `Demandes`}
                {t === 'requests' && pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">

        {/* Search results */}
        {tab === 'search' && (
          <>
            {searchLoading ? (
              <div className="flex justify-center pt-8">
                <LoadingSpinner size="md" />
              </div>
            ) : searchResults.length === 0 && query ? (
              <div className="text-center py-12 text-gray-400 text-sm">Aucun pilote trouvé</div>
            ) : (
              searchResults.map((profile) => {
                const state = getFriendshipState(profile.id);
                return (
                  <ProfileRow
                    key={profile.id}
                    profile={profile}
                    action={
                      state === 'friend' ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <UserCheck size={14} /> Ami
                        </div>
                      ) : state === 'sent' ? (
                        <div className="text-xs text-gray-400 font-medium">Envoyée</div>
                      ) : state === 'received' ? (
                        <div className="text-xs text-sky-600 font-medium">Reçue</div>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(profile.id)}
                          disabled={actionLoading === profile.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white active:opacity-70 disabled:opacity-50"
                          style={{ background: '#3A3A3A' }}
                        >
                          {actionLoading === profile.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <UserPlus size={14} />
                              Ajouter
                            </>
                          )}
                        </button>
                      )
                    }
                  />
                );
              })
            )}
          </>
        )}

        {/* Friends list */}
        {tab === 'friends' && (
          <>
            {loading && friends.length === 0 ? (
              <div className="flex justify-center pt-8">
                <LoadingSpinner size="md" />
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-12 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
                  <Users size={28} className="text-sky-400" />
                </div>
                <h2 className="font-semibold text-gray-700 mb-1">Aucun ami</h2>
                <p className="text-sm text-gray-500">
                  Recherchez d'autres pilotes pour les ajouter
                </p>
              </div>
            ) : (
              friends.map((f) => (
                <ProfileRow
                  key={f.id}
                  profile={f.profiles}
                  action={
                    <button
                      onClick={() => handleRemove(f.id)}
                      disabled={actionLoading === f.id}
                      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:opacity-60 disabled:opacity-50"
                    >
                      {actionLoading === f.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 size={15} className="text-gray-500" />
                      )}
                    </button>
                  }
                />
              ))
            )}
          </>
        )}

        {/* Requests tab */}
        {tab === 'requests' && (
          <div className="space-y-4">
            {/* Received */}
            {pendingReceived.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Reçues ({pendingReceived.length})
                </h3>
                <div className="space-y-2">
                  {pendingReceived.map((f) => (
                    <ProfileRow
                      key={f.id}
                      profile={f.profiles}
                      action={
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(f.id)}
                            disabled={actionLoading === f.id}
                            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:opacity-60"
                          >
                            <X size={15} className="text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleAccept(f.id)}
                            disabled={actionLoading === f.id}
                            className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center active:opacity-70"
                          >
                            {actionLoading === f.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Check size={15} stroke="white" />
                            )}
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sent */}
            {pendingSent.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Envoyées ({pendingSent.length})
                </h3>
                <div className="space-y-2">
                  {pendingSent.map((f) => (
                    <ProfileRow
                      key={f.id}
                      profile={f.profiles}
                      action={
                        <span className="text-xs text-gray-400 font-medium">En attente</span>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aucune demande en cours
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed top-safe-top left-1/2 -translate-x-1/2 mt-16 z-50 bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
          {toast}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
