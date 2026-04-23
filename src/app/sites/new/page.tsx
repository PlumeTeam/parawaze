'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePois } from '@/hooks/usePois';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { PoiType, PoiDifficulty, CreatePoiInput } from '@/lib/types';

const POI_TYPES: { value: PoiType; label: string; emoji: string }[] = [
  { value: 'official', label: 'Site officiel', emoji: 'O' },
  { value: 'wild', label: 'Site sauvage', emoji: 'W' },
];

const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DIFFICULTIES: { value: PoiDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'difficult', label: 'Difficile' },
  { value: 'expert', label: 'Expert' },
];

function NewSiteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createPoi } = usePois();

  // Get takeoff location
  const tlat = searchParams.get('tlat');
  const tlng = searchParams.get('tlng');
  const talt = searchParams.get('talt');

  // Get landing location
  const llat = searchParams.get('llat');
  const llng = searchParams.get('llng');
  const lalt = searchParams.get('lalt');

  const [poiType, setPoiType] = useState<PoiType>('official');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [altitude, setAltitude] = useState(talt || lalt || '');
  const [windOrientations, setWindOrientations] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<PoiDifficulty | ''>('');
  const [ffvlApproved, setFfvlApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWind = (dir: string) => {
    setWindOrientations((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom du site est requis');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use either takeoff or landing location
      const lat = tlat || llat;
      const lng = tlng || llng;
      const alt = altitude ? parseInt(altitude) : undefined;

      const input: CreatePoiInput = {
        poi_type: poiType,
        location_name: name.trim(),
        description: description.trim() || undefined,
        altitude_m: alt,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
        wind_orientations: windOrientations,
        difficulty: difficulty as PoiDifficulty || undefined,
        ffvl_approved: ffvlApproved,
      };

      await createPoi(input);
      router.push('/sites');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du site');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Coordinates display */}
      {(tlat || llat) && (
        <div className="space-y-2">
          {tlat && tlng && (
            <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
              <span className="font-medium">🟢 Décollage :</span> {parseFloat(tlat).toFixed(4)}°N, {parseFloat(tlng).toFixed(4)}°E
              {talt && <span> · {talt}m</span>}
            </div>
          )}
          {llat && llng && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
              <span className="font-medium">🔵 Atterrissage :</span> {parseFloat(llat).toFixed(4)}°N, {parseFloat(llng).toFixed(4)}°E
              {lalt && <span> · {lalt}m</span>}
            </div>
          )}
        </div>
      )}

      {/* POI Type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de site</label>
        <div className="grid grid-cols-2 gap-2">
          {POI_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPoiType(value)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                poiType === value
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du site *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Col de la Forclaz"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Informations utiles sur le site..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm resize-none"
        />
      </div>

      {/* Altitude */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
        <input
          type="number"
          value={altitude}
          onChange={(e) => setAltitude(e.target.value)}
          placeholder="Ex: 1200"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
        />
      </div>

      {/* Wind orientations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Orientations de vent favorables</label>
        <div className="flex flex-wrap gap-2">
          {WIND_DIRS.map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => toggleWind(dir)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                windOrientations.includes(dir)
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Création en cours...' : 'Créer le site'}
      </button>
    </form>
  );
}

export default function NewSitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Nouveau site</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <NewSiteForm />
        </Suspense>
      </div>

      <BottomNav />
    </div>
  );
}