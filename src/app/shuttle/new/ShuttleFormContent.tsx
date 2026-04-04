'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShuttles } from '@/hooks/useShuttles';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ShuttleType } from '@/lib/types';

export default function ShuttleFormContent() {
  const { user, loading: authLoading } = useAuth();
  const { createShuttle } = useShuttles();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read map pin coords from query params (same as observation flow)
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const alt = searchParams.get('alt') ? parseFloat(searchParams.get('alt')!) : undefined;
  const typeParam = searchParams.get('type') as ShuttleType | null;

  const [shuttleType, setShuttleType] = useState<ShuttleType>(typeParam || 'offer');
  const [meetingPointName, setMeetingPointName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState(4);
  const [pricePerPerson, setPricePerPerson] = useState<string>('');
  const [returnRequested, setReturnRequested] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Set default departure time to next round hour
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDepartureTime(iso);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!meetingPointName.trim()) {
      setError('Indiquez un lieu de rencontre');
      return;
    }
    if (!destinationName.trim()) {
      setError('Indiquez la destination');
      return;
    }
    if (!departureTime) {
      setError("Indiquez l'heure de d\u00e9part");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createShuttle(
        {
          shuttle_type: shuttleType,
          meeting_point_name: meetingPointName.trim(),
          destination_name: destinationName.trim(),
          departure_time: new Date(departureTime).toISOString(),
          total_seats: totalSeats,
          price_per_person: pricePerPerson ? parseFloat(pricePerPerson) : null,
          return_requested: returnRequested,
          return_time: returnRequested && returnTime ? new Date(returnTime).toISOString() : null,
          description: description.trim() || null,
          latitude: lat,
          longitude: lng,
          altitude_m: alt,
        },
        user.id
      );

      router.push('/shuttle');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la cr\u00e9ation');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const hasCoords = lat !== undefined && lng !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Nouvelle navette</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-5">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShuttleType('offer')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                shuttleType === 'offer'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {'\u{1F690}'} Je propose
            </button>
            <button
              type="button"
              onClick={() => setShuttleType('request')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                shuttleType === 'request'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {'\u{1F44D}'} Je cherche
            </button>
          </div>
        </div>

        {/* Meeting point */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lieu de rencontre (atterrissage)
          </label>
          {hasCoords && (
            <p className="text-xs text-green-600 mb-1">
              {'\u{1F4CD}'} Position plac\u00e9e sur la carte ({lat!.toFixed(4)}, {lng!.toFixed(4)}
              {alt ? ` \u00b7 ${alt}m` : ''})
            </p>
          )}
          {!hasCoords && (
            <p className="text-xs text-gray-400 mb-1">
              Astuce : placez un point sur la carte avant de cr\u00e9er la navette
            </p>
          )}
          <input
            type="text"
            value={meetingPointName}
            onChange={(e) => setMeetingPointName(e.target.value)}
            placeholder="Ex: Parking de l'atterro de Doussard"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lieu de d\u00e9collage (destination)
          </label>
          <input
            type="text"
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            placeholder="Ex: Col de la Forclaz"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Departure time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure de d\u00e9part
          </label>
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Seats */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de places
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTotalSeats(Math.max(1, totalSeats - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-200"
            >
              -
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{totalSeats}</span>
            <button
              type="button"
              onClick={() => setTotalSeats(Math.min(8, totalSeats + 1))}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-200"
            >
              +
            </button>
            <span className="text-sm text-gray-400 ml-2">place{totalSeats > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix par personne (optionnel)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.5"
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(e.target.value)}
              placeholder="Gratuit"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u20ac'}</span>
          </div>
        </div>

        {/* Return checkbox */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={returnRequested}
              onChange={(e) => setReturnRequested(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {'\u{1F504}'} Je cherche aussi une navette retour
            </span>
          </label>
          {returnRequested && (
            <div className="mt-3 ml-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de retour souhait\u00e9e
              </label>
              <input
                type="datetime-local"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Van 7 places, d\u00e9part parking de l'atterro"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-base shadow-lg disabled:opacity-50 active:from-sky-600 active:to-sky-700 transition-all"
        >
          {submitting ? 'Cr\u00e9ation...' : shuttleType === 'offer' ? 'Proposer la navette' : 'Publier ma recherche'}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
