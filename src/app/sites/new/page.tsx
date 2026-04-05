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
  { value: 'takeoff', label: 'Décollage', emoji: 'D' },
  { value: 'landing', label: 'Atterrissage', emoji: 'A' },
  { value: 'weather_station', label: 'Balise météo', emoji: 'M' },
  { value: 'webcam', label: 'Webcam', emoji: 'W' },
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

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const alt = searchParams.get('alt');

  const [poiType, setPoiType] = useState<PoiType>('takeoff');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [altitude, setAltitude] = useState(alt || '');
  const [windOrientations, setWindOrientations] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<PoiDifficulty | ''>('');
  const [ffvlApproved, setFfvlApproved] = useState(false);
  const [stationProvider, setStationProvider] = useState('');
  const [stationUrl, setStationUrl] = useState('');
  const [webcamUrl, setWebcamUrl] = useState('');
  const [webcamOrientation, setWebcamOrientation] = useState('');
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
      const input: CreatePoiInput = {
        poi_type: poiType,
        location_name: name.trim(),
        description: description.trim() || undefined,
        altitude_m: altitude ? parseInt(altitude) : undefined,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
      };

      if (poiType === 'takeoff' || poiType === 'landing') {
        input.wind_orientations = windOrientations;
        input.difficulty = difficulty as PoiDifficulty || undefined;
        input.ffvl_approved = ffvlApproved;
      }
      if (poiType === 'weather_station') {
        input.station_provider = stationProvider.trim() || undefined;
        input.station_url = stationUrl.trim() || undefined;
      }
      if (poiType === 'webcam') {
        input.webcam_url = webcamUrl.trim() || undefined;
        input.webcam_orientation = webcamOrientation.trim() || undefined;
      }

      await createPoi(input);
      router.push('/sites');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du site');
    } finally {
      setSubmitting(false);
    }
  };

  const isFlightSite = poiType === 'takeoff' || poiType === 'landing';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Coordinates display */}
      {lat && lng && (
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <span className="font-medium">Position :</span> {parseFloat(lat).toFixed(4)}°N, {parseFloat(lng).toFixed(4)}°E
          {alt && <span> · {alt}m</span>}
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

      {/* Flight site specific fields */}
      {isFlightSite && (
        <>
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

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(difficulty === value ? '' : value)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    difficulty === value
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* FFVL approved */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full relative transition-colors ${
                ffvlApproved ? 'bg-sky-500' : 'bg-gray-300'
              }`}
              onClick={() => setFfvlApproved(!ffvlApproved)}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  ffvlApproved ? 'translate-x-5' : ''
                }`}
              />
            </div>
            <span className="text-sm text-gray-700">Approuvé FFVL</span>
          </label>
        </>
      )}

      {/* Weather station fields */}
      {poiType === 'weather_station' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              value={stationProvider}
              onChange={(e) => setStationProvider(e.target.value)}
              placeholder="Ex: Holfuy, Pioupiou, FFVL..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la station</label>
            <input
              type="url"
              value={stationUrl}
              onChange={(e) => setStationUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
            />
          </div>
        </>
      )}

      {/* Webcam fields */}
      {poiType === 'webcam' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la webcam</label>
            <input
              type="url"
              value={webcamUrl}
              onChange={(e) => setWebcamUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orientation de la webcam</label>
            <input
              type="text"
              value={webcamOrientation}
              onChange={(e) => setWebcamOrientation(e.target.value)}
              placeholder="Ex: Nord, panoramique..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-sm"
            />
          </div>
        </>
      )}

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
