'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShuttles } from '@/hooks/useShuttles';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ShuttleType } from '@/lib/types';

function formatCoordDisplay(lat: number, lng: number, alt?: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const coords = `${Math.abs(lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0 ${lngDir}`;
  const altStr = alt != null ? ` \u00B7 ${alt}m` : '';
  return `${coords}${altStr}`;
}

export default function ShuttleFormContent() {
  const { user, loading: authLoading } = useAuth();
  const { createShuttle } = useShuttles();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Two-pin location coords from pick-locations page
  const mlat = searchParams.get('mlat') ? parseFloat(searchParams.get('mlat')!) : undefined;
  const mlng = searchParams.get('mlng') ? parseFloat(searchParams.get('mlng')!) : undefined;
  const malt = searchParams.get('malt') ? parseFloat(searchParams.get('malt')!) : undefined;
  const dlat = searchParams.get('dlat') ? parseFloat(searchParams.get('dlat')!) : undefined;
  const dlng = searchParams.get('dlng') ? parseFloat(searchParams.get('dlng')!) : undefined;
  const dalt = searchParams.get('dalt') ? parseFloat(searchParams.get('dalt')!) : undefined;

  // Legacy single-pin params
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const alt = searchParams.get('alt') ? parseFloat(searchParams.get('alt')!) : undefined;

  const typeParam = searchParams.get('type') as ShuttleType | null;

  const hasTwoPins = mlat != null && mlng != null && dlat != null && dlng != null;

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

    if (!hasTwoPins && !meetingPointName.trim()) {
      setError('Indiquez un lieu de rencontre ou choisissez sur la carte');
      return;
    }
    if (!departureTime) {
      setError("Indiquez l'heure de départ");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createShuttle(
        {
          shuttle_type: shuttleType,
          meeting_point_name: meetingPointName.trim() || (hasTwoPins ? 'Point sur la carte' : ''),
          destination_name: destinationName.trim() || (hasTwoPins ? 'Point sur la carte' : ''),
          departure_time: new Date(departureTime).toISOString(),
          total_seats: totalSeats,
          price_per_person: pricePerPerson ? parseFloat(pricePerPerson) : null,
          return_requested: returnRequested,
          return_time: returnRequested && returnTime ? new Date(returnTime).toISOString() : null,
          description: description.trim() || null,
          // Two-pin coords
          meeting_lat: mlat,
          meeting_lng: mlng,
          meeting_alt: malt,
          dest_lat: dlat,
          dest_lng: dlng,
          dest_alt: dalt,
          // Legacy single-pin
          latitude: lat,
          longitude: lng,
          altitude_m: alt,
        },
        user.id
      );

      router.push('/shuttle');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
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
              {'\uD83D\uDE90'} Je propose
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
              {'\uD83D\uDC4D'} Je cherche
            </button>
          </div>
        </div>

        {/* Locations section */}
        {hasTwoPins ? (
          <div className="space-y-3">
            {/* Meeting point display */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{'\uD83D\uDFE2'}</span>
                <span className="text-sm font-semibold text-green-800">Départ</span>
              </div>
              <p className="text-xs text-green-700 ml-7">
                {formatCoordDisplay(mlat!, mlng!, malt)}
              </p>
              <input
                type="text"
                value={meetingPointName}
                onChange={(e) => setMeetingPointName(e.target.value)}
                placeholder="Nom du point de départ (optionnel)"
                className="w-full mt-2 px-3 py-2 rounded-lg border border-green-200 bg-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none"
              />
            </div>

            {/* Destination display */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{'\uD83D\uDD35'}</span>
                <span className="text-sm font-semibold text-blue-800">Arrivée (décollage)</span>
              </div>
              <p className="text-xs text-blue-700 ml-7">
                {formatCoordDisplay(dlat!, dlng!, dalt)}
              </p>
              <input
                type="text"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="Nom du lieu de décollage (optionnel)"
                className="w-full mt-2 px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              />
            </div>

            {/* Change locations link */}
            <button
              type="button"
              onClick={() => router.push(`/shuttle/pick-locations?type=${shuttleType}`)}
              className="flex items-center gap-1.5 text-xs text-sky-600 font-medium"
            >
              <MapPin className="h-3.5 w-3.5" />
              Modifier les positions sur la carte
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* No coords — show pick on map button */}
            <button
              type="button"
              onClick={() => router.push(`/shuttle/pick-locations?type=${shuttleType}`)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl py-3.5 font-semibold text-sm shadow-sm active:opacity-90 transition-opacity"
            >
              <MapPin className="h-4 w-4" />
              Choisir les lieux sur la carte
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="absolute bg-gray-50 px-3 text-xs text-gray-400">ou saisir manuellement</span>
            </div>

            {/* Meeting point text input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de rencontre (atterrissage)
              </label>
              <input
                type="text"
                value={meetingPointName}
                onChange={(e) => setMeetingPointName(e.target.value)}
                placeholder="Ex: Parking de l'atterro de Doussard"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Destination text input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de décollage (destination)
              </label>
              <input
                type="text"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="Ex: Col de la Forclaz"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        )}

        {/* Departure time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure de départ
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
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u20AC'}</span>
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
              {'\uD83D\uDD04'} Je cherche aussi une navette retour
            </span>
          </label>
          {returnRequested && (
            <div className="mt-3 ml-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de retour souhaitée
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
            placeholder="Ex: Van 7 places, départ parking de l'atterro"
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
          {submitting ? 'Création...' : shuttleType === 'offer' ? 'Proposer la navette' : 'Publier ma recherche'}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
