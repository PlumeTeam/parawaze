'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Users, Euro } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShuttles } from '@/hooks/useShuttles';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Shuttle, ShuttlePassenger } from '@/lib/types';

function formatDepartureTime(iso: string): string {
  const d = new Date(iso);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${date} ${month} à ${hours}h${minutes}`;
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

export default function ShuttleDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { getShuttle, getShuttlePassengers, joinShuttle, leaveShuttle, isUserInShuttle } = useShuttles();
  const router = useRouter();
  const params = useParams();
  const shuttleId = params.id as string;

  const [shuttle, setShuttle] = useState<Shuttle | null>(null);
  const [passengers, setPassengers] = useState<ShuttlePassenger[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Détail de la navette</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
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
              <span className="text-xs text-gray-500">Départ</span>
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
              <span className="text-xs text-gray-500">{'\u{1F504}'} Retour souhaité</span>
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

        {/* Passengers */}
        {passengers.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-3">Passagers ({passengers.length})</p>
            <div className="space-y-2">
              {passengers.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                    {p.profiles?.avatar_url ? (
                      <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (p.profiles?.display_name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  <span className="text-sm text-gray-700">
                    {p.profiles?.display_name || 'Pilote'}
                  </span>
                  {p.seats_taken > 1 && (
                    <span className="text-xs text-gray-400">({p.seats_taken} places)</span>
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
      </div>

      {/* Bottom action bar */}
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
