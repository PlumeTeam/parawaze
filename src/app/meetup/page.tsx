'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMeetups } from '@/hooks/useMeetups';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Calendar, MapPin, Users, Plus, Lock, Globe, Clock, ArrowLeft } from 'lucide-react';
import type { Meetup } from '@/lib/types';

type Filter = 'all' | 'mine' | 'friends';

function formatMeetingTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Aujourd'hui à ${timeStr}`;
  if (diffDays === 1) return `Demain à ${timeStr}`;
  if (diffDays === -1) return `Hier à ${timeStr}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ` à ${timeStr}`;
}

function MeetupCard({
  meetup,
  userId,
  onJoin,
  onLeave,
  onCancel,
}: {
  meetup: Meetup;
  userId: string | undefined;
  onJoin: (id: string) => Promise<void>;
  onLeave: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const participants = meetup.meetup_participants || [];
  const participantCount = participants.filter((p) => p.status !== 'cancelled').length;
  const isAuthor = meetup.author_id === userId;
  const isParticipant = participants.some((p) => p.user_id === userId && p.status !== 'cancelled');
  const isFull = participantCount >= meetup.max_participants;
  const isPast = new Date(meetup.meeting_time) < new Date();

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isParticipant && !isAuthor) {
        await onLeave(meetup.id);
      } else if (!isParticipant && !isFull) {
        await onJoin(meetup.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(meetup.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base truncate">{meetup.title}</h3>
            {meetup.visibility === 'friends_only' ? (
              <Lock size={13} className="text-gray-400 flex-shrink-0" />
            ) : (
              <Globe size={13} className="text-gray-400 flex-shrink-0" />
            )}
          </div>
          {meetup.profiles && (
            <p className="text-xs text-gray-500">
              par{' '}
              <span className="font-medium text-gray-700">
                {meetup.profiles.display_name || meetup.profiles.username || 'Pilote'}
              </span>
            </p>
          )}
        </div>
        {isAuthor && !isPast && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg active:opacity-60"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={14} className="text-amber-500 flex-shrink-0" />
          <span>{formatMeetingTime(meetup.meeting_time)}</span>
        </div>
        {meetup.location_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={14} className="text-sky-500 flex-shrink-0" />
            <span className="truncate">{meetup.location_name}</span>
            {meetup.altitude_m != null && (
              <span className="text-gray-400 text-xs">{meetup.altitude_m}m</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users size={14} className="text-green-500 flex-shrink-0" />
          <span>
            {participantCount}/{meetup.max_participants} participant{participantCount !== 1 ? 's' : ''}
          </span>
          {isFull && <span className="text-xs text-red-500 font-medium">(complet)</span>}
        </div>
      </div>

      {meetup.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{meetup.description}</p>
      )}

      {/* Action button */}
      {!isPast && !isAuthor && (
        <button
          onClick={handleAction}
          disabled={loading || (isFull && !isParticipant)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            background: isParticipant ? '#F3F4F6' : '#3A3A3A',
            color: isParticipant ? '#1C1C1C' : '#FFFFFF',
          }}
        >
          {loading ? '...' : isParticipant ? 'Se désinscrire' : isFull ? 'Complet' : 'Rejoindre'}
        </button>
      )}

      {isParticipant && isAuthor && !isPast && (
        <div
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{ background: '#F0FDF4', color: '#16A34A' }}
        >
          Vous organisez ce RDV
        </div>
      )}

      {isPast && (
        <div
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{ background: '#F9FAFB', color: '#9CA3AF' }}
        >
          Terminé
        </div>
      )}
    </div>
  );
}

export default function MeetupPage() {
  const { user, loading: authLoading } = useAuth();
  const { meetups, loading, joinMeetup, leaveMeetup, cancelMeetup } = useMeetups();
  const [filter, setFilter] = useState<Filter>('all');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  const filtered = meetups.filter((m) => {
    if (filter === 'mine') {
      return (
        m.author_id === user?.id ||
        (m.meetup_participants || []).some((p) => p.user_id === user?.id && p.status !== 'cancelled')
      );
    }
    if (filter === 'friends') return m.visibility === 'friends_only';
    return true;
  });

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-4 pt-safe-top pb-4 border-b border-gray-100">
        <div className="pt-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/map')}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:opacity-60"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rendez-vous</h1>
              <p className="text-sm text-gray-500">Retrouvez d'autres pilotes</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/meetup/pick-location')}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: '#3A3A3A' }}
          >
            <Plus size={20} stroke="white" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'mine', 'friends'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: filter === f ? '#3A3A3A' : '#F3F4F6',
                color: filter === f ? '#FFFFFF' : '#6B7280',
              }}
            >
              {f === 'all' ? 'Tous' : f === 'mine' ? 'Mes RDV' : 'Amis'}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {loading && meetups.length === 0 ? (
          <div className="flex items-center justify-center pt-16">
            <LoadingSpinner size="md" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Calendar size={28} className="text-amber-400" />
            </div>
            <h2 className="font-semibold text-gray-700 mb-1">Aucun rendez-vous</h2>
            <p className="text-sm text-gray-500">
              {filter === 'mine'
                ? 'Vous n\'êtes inscrit à aucun RDV'
                : filter === 'friends'
                ? 'Aucun RDV entre amis disponible'
                : 'Aucun rendez-vous pour le moment'}
            </p>
            <button
              onClick={() => router.push('/meetup/new')}
              className="mt-6 px-6 py-3 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform"
              style={{ background: '#3A3A3A' }}
            >
              Créer un RDV
            </button>
          </div>
        ) : (
          filtered.map((m) => (
            <MeetupCard
              key={m.id}
              meetup={m}
              userId={user?.id}
              onJoin={joinMeetup}
              onLeave={leaveMeetup}
              onCancel={cancelMeetup}
            />
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
