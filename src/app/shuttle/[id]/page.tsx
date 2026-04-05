'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Users, Euro, Pencil, X, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShuttles } from '@/hooks/useShuttles';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Shuttle, ShuttlePassenger, UpdateShuttleInput } from '@/lib/types';

function formatDepartureTime(iso: string): string {
  const d = new Date(iso);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janv.', 'f\u00e9vr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'ao\u00fbt', 'sept.', 'oct.', 'nov.', 'd\u00e9c.'];
  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${date} ${month} \u00e0 ${hours}h${minutes}`;
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return 'Gratuit';
  return `${price}\u20ac / personne`;
}

function getBadgeEmoji(level: string | undefined): string {
  switch (level) {
    case 'legend': return '\u{1F451}';
    case 'expert': return '\u{2B50}';
    case 'observer': return '\u{1F440}';
    default: return '\u{1F331}';
  }
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ShuttleDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    getShuttle, getShuttlePassengers, joinShuttle, leaveShuttle,
    isUserInShuttle, updateShuttle, cancelShuttle, acceptPassenger, rejectPassenger,
  } = useShuttles();
  const router = useRouter();
  const params = useParams();
  const shuttleId = params.id as string;

  const [shuttle, setShuttle] = useState<Shuttle | null>(null);
  const [passengers, setPassengers] = useState<ShuttlePassenger[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateShuttleInput>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!shuttleId) return;
    setLoading(true);
    try {
      const [shuttleData, passengersData] = await Promise.all([
        getShuttle(shuttleId),
        getShuttlePassengers(shuttleId),
      ]);
      setShuttle(shuttleData);
      setPassengers(passengersData);
      if (user) {
        const joined = await isUserInShuttle(shuttleId, user.id);
        setIsJoined(joined);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shuttleId, user, getShuttle, getShuttlePassengers, isUserInShuttle]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  const handleJoin = async () => {
    if (!user || !shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await joinShuttle(shuttle.id, user.id, 1);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await leaveShuttle(shuttle.id, user.id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Owner actions ---
  const startEditing = () => {
    if (!shuttle) return;
    setEditForm({
      departure_time: shuttle.departure_time,
      total_seats: shuttle.total_seats,
      price_per_person: shuttle.price_per_person,
      description: shuttle.description,
      return_requested: shuttle.return_requested,
      return_time: shuttle.return_time,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateShuttle(shuttle.id, editForm);
      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelShuttle = async () => {
    if (!shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await cancelShuttle(shuttle.id);
      router.push('/shuttle');
    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleAcceptPassenger = async (userId: string) => {
    if (!shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await acceptPassenger(shuttle.id, userId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPassenger = async (userId: string) => {
    if (!shuttle) return;
    setActionLoading(true);
    setError(null);
    try {
      await rejectPassenger(shuttle.id, userId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !shuttle) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Navette introuvable</p>
      </div>
    );
  }

  const isFull = shuttle.taken_seats >= shuttle.total_seats;
  const isAuthor = shuttle.author_id === user.id;
  const seatsArray = Array.from({ length: shuttle.total_seats }, (_, i) => i < shuttle.taken_seats);

  const statusLabel = (s: string) => {
    switch (s) {
      case 'accepted': return 'Accept\u00e9';
      case 'rejected': return 'Refus\u00e9';
      default: return 'En attente';
    }
  };
  const statusColor = (s: string) => {
    switch (s) {
      case 'accepted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-orange-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex-1">D\u00e9tail de la navette</h1>
          {isAuthor && !isEditing && (
            <button onClick={startEditing} className="p-2 hover:bg-gray-100 rounded-full">
              <Pencil className="h-4 w-4 text-sky-600" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Owner badge */}
        {isAuthor && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <span className="text-lg">{'\u{1F451}'}</span>
            <span className="text-sm font-semibold text-amber-700">Vous \u00eates l&apos;organisateur</span>
          </div>
        )}

        {/* Edit modal */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-800">Modifier la navette</h2>
                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure de d\u00e9part</label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  value={editForm.departure_time ? toLocalDatetimeValue(editForm.departure_time) : ''}
                  onChange={(e) => setEditForm({ ...editForm, departure_time: new Date(e.target.value).toISOString() })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  value={editForm.total_seats ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, total_seats: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix par personne (&euro;)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  value={editForm.price_per_person ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, price_per_person: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0 = Gratuit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                  rows={3}
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value || null })}
                  placeholder="Infos suppl&eacute;mentaires..."
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.return_requested ?? false}
                    onChange={(e) => setEditForm({ ...editForm, return_requested: e.target.checked, return_time: e.target.checked ? editForm.return_time : null })}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Retour souhait&eacute;</span>
                </label>
              </div>

              {editForm.return_requested && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure de retour</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    value={editForm.return_time ? toLocalDatetimeValue(editForm.return_time) : ''}
                    onChange={(e) => setEditForm({ ...editForm, return_time: new Date(e.target.value).toISOString() })}
                  />
                </div>
              )}

              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-sm disabled:opacity-50 active:bg-sky-600 transition-all"
              >
                {actionLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            shuttle.shuttle_type === 'offer'
              ? 'bg-sky-100 text-sky-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {shuttle.shuttle_type === 'offer' ? '\u{1F690} Propose une navette' : '\u{1F44D} Cherche une navette'}
          </span>
          {shuttle.return_requested && (
            <span className="text-sm text-gray-500">{'\u{1F504}'} Aller-retour</span>
          )}
        </div>

        {/* Route card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-0.5 h-8 bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  {shuttle.meeting_point_name || 'Point de rencontre'}
                </p>
                {shuttle.meeting_point_alt && (
                  <p className="text-xs text-gray-400">{shuttle.meeting_point_alt}m</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {shuttle.destination_name || 'Destination'}
                </p>
                {shuttle.destination_alt && (
                  <p className="text-xs text-gray-400">{shuttle.destination_alt}m</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">D&eacute;part</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDepartureTime(shuttle.departure_time)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Prix</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(shuttle.price_per_person)}
            </p>
          </div>
        </div>

        {shuttle.return_requested && shuttle.return_time && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">{'\u{1F504}'} Retour souhait&eacute;</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDepartureTime(shuttle.return_time)}
            </p>
          </div>
        )}

        {/* Seats visualization */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Places ({shuttle.taken_seats}/{shuttle.total_seats})
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {seatsArray.map((taken, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  taken
                    ? 'bg-sky-100 border-2 border-sky-300'
                    : 'bg-gray-100 border-2 border-dashed border-gray-300'
                }`}
              >
                {taken ? '\u{1F9D1}' : ''}
              </div>
            ))}
          </div>
          <p className={`text-sm mt-2 font-medium ${isFull ? 'text-red-600' : 'text-green-600'}`}>
            {isFull
              ? 'Complet'
              : `${shuttle.total_seats - shuttle.taken_seats} place${shuttle.total_seats - shuttle.taken_seats > 1 ? 's' : ''} disponible${shuttle.total_seats - shuttle.taken_seats > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Driver / requester info */}
        {shuttle.profiles && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              {shuttle.shuttle_type === 'offer' ? 'Conducteur' : 'Demandeur'}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {shuttle.profiles.avatar_url ? (
                  <img src={shuttle.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (shuttle.profiles.display_name?.[0] || '?').toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {shuttle.profiles.display_name || 'Pilote'}
                  {' '}{getBadgeEmoji(shuttle.profiles.badge_level)}
                </p>
                <p className="text-xs text-gray-400">
                  {shuttle.profiles.total_reports} observations
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {shuttle.description && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{shuttle.description}</p>
          </div>
        )}

        {/* Passengers section */}
        {passengers.length > 0 && (
          <div className={`rounded-2xl p-4 shadow-sm border ${isAuthor ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
            <p className="text-xs text-gray-500 mb-3">
              Passagers ({passengers.length})
              {isAuthor && <span className="ml-2 text-amber-600 font-medium">- G&eacute;rer</span>}
            </p>
            <div className="space-y-3">
              {passengers.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                    {p.profiles?.avatar_url ? (
                      <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (p.profiles?.display_name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 block truncate">
                      {p.profiles?.display_name || 'Pilote'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {p.seats_taken > 1 && (
                        <span className="text-xs text-gray-400">({p.seats_taken} places)</span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${statusColor(p.status || 'pending')}`} />
                      <span className="text-xs text-gray-500">{statusLabel(p.status || 'pending')}</span>
                    </div>
                  </div>

                  {/* Owner action buttons */}
                  {isAuthor && (p.status === 'pending' || !p.status) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAcceptPassenger(p.user_id)}
                        disabled={actionLoading}
                        className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-50 transition-all"
                        title="Accepter"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRejectPassenger(p.user_id)}
                        disabled={actionLoading}
                        className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-all"
                        title="Refuser"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {isAuthor && p.status === 'accepted' && (
                    <span className="text-xs text-green-600 font-medium shrink-0">{'\u2705'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Cancel shuttle button (owner only) */}
        {isAuthor && (
          <div className="pt-2 pb-4">
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-3 rounded-xl border-2 border-red-300 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
              >
                Annuler la navette
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">
                    &Ecirc;tes-vous s&ucirc;r de vouloir annuler cette navette ?
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all"
                  >
                    Non, garder
                  </button>
                  <button
                    onClick={handleCancelShuttle}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-red-600 transition-all"
                  >
                    {actionLoading ? 'Annulation...' : 'Oui, annuler'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar (non-owner) */}
      {!isAuthor && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4">
          {isJoined ? (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-red-500 text-white font-bold text-base shadow-lg disabled:opacity-50 active:bg-red-600 transition-all"
            >
              {actionLoading ? 'En cours...' : 'Quitter la navette'}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading || isFull}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-base shadow-lg disabled:opacity-50 active:from-sky-600 active:to-sky-700 transition-all"
            >
              {actionLoading ? 'En cours...' : isFull ? 'Complet' : 'Rejoindre la navette'}
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
