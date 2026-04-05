'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, ExternalLink, MapPin, Mountain, Wind, Shield, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePois } from '@/hooks/usePois';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Poi, PoiType } from '@/lib/types';

const POI_TYPE_CONFIG: Record<PoiType, { label: string; emoji: string; color: string; bgColor: string }> = {
  landing: { label: 'Atterrissage', emoji: 'A', color: 'text-green-600', bgColor: 'bg-green-100' },
  takeoff: { label: 'Décollage', emoji: 'D', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  weather_station: { label: 'Balise météo', emoji: 'M', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  webcam: { label: 'Webcam', emoji: 'W', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'bg-green-100 text-green-700' },
  moderate: { label: 'Modéré', color: 'bg-yellow-100 text-yellow-700' },
  difficult: { label: 'Difficile', color: 'bg-orange-100 text-orange-700' },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-700' },
};

function VotingStars({
  currentRating,
  userVote,
  onVote,
  totalVotes,
}: {
  currentRating: number;
  userVote: number | null;
  onVote: (rating: number) => void;
  totalVotes: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayVotes = totalVotes > 11 ? totalVotes - 11 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = hovered !== null ? i <= hovered : i <= Math.round(currentRating);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onVote(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          );
        })}
        <span className="text-sm text-gray-600 ml-2">
          {currentRating.toFixed(1)} / 5
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {displayVotes} vote{displayVotes !== 1 ? 's' : ''}
        {userVote !== null && (
          <span className="ml-2 text-sky-500">
            (votre note : {userVote}/5)
          </span>
        )}
      </p>
    </div>
  );
}

export default function PoiDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { getPoi, votePoi, getUserVote } = usePois();
  const router = useRouter();
  const params = useParams();
  const poiId = params.id as string;

  const [poi, setPoi] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  const loadPoi = useCallback(async () => {
    if (!poiId) return;
    setLoading(true);
    const data = await getPoi(poiId);
    setPoi(data);
    setLoading(false);
  }, [poiId, getPoi]);

  const loadUserVote = useCallback(async () => {
    if (!poiId) return;
    const vote = await getUserVote(poiId);
    setUserVote(vote);
  }, [poiId, getUserVote]);

  useEffect(() => {
    loadPoi();
    loadUserVote();
  }, [loadPoi, loadUserVote]);

  const handleVote = async (rating: number) => {
    if (!user || voteLoading) return;
    setVoteLoading(true);
    try {
      await votePoi(poiId, rating);
      setUserVote(rating);
      // Refresh POI to get updated rating
      await loadPoi();
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoteLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !poi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Site introuvable</p>
          <button
            onClick={() => router.push('/sites')}
            className="mt-3 text-sky-500 text-sm font-medium"
          >
            Retour aux sites
          </button>
        </div>
      </div>
    );
  }

  const config = POI_TYPE_CONFIG[poi.poi_type];
  const isFlightSite = poi.poi_type === 'takeoff' || poi.poi_type === 'landing';
  const coords = poi.location?.coordinates;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 truncate">{poi.location_name}</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Type badge + name */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center`}>
              <span className={`font-bold text-xl ${config.color}`}>{config.emoji}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{poi.location_name}</h2>
              <p className="text-sm text-gray-500">{config.label}</p>
            </div>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {poi.altitude_m && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                <Mountain className="h-3 w-3" />
                {poi.altitude_m}m
              </span>
            )}
            {poi.difficulty && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${DIFFICULTY_LABELS[poi.difficulty]?.color || 'bg-gray-100 text-gray-600'}`}>
                {DIFFICULTY_LABELS[poi.difficulty]?.label || poi.difficulty}
              </span>
            )}
            {poi.ffvl_approved && (
              <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <Shield className="h-3 w-3" />
                FFVL
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {coords && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Coordonnées
            </h3>
            <p className="text-sm text-gray-600">
              {coords[1].toFixed(5)}°N, {coords[0].toFixed(5)}°E
            </p>
          </div>
        )}

        {/* Description */}
        {poi.description && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{poi.description}</p>
          </div>
        )}

        {/* Wind orientations */}
        {isFlightSite && poi.wind_orientations.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Wind className="h-4 w-4" />
              Orientations favorables
            </h3>
            <div className="flex flex-wrap gap-2">
              {poi.wind_orientations.map((dir) => (
                <span
                  key={dir}
                  className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium"
                >
                  {dir}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weather station info */}
        {poi.poi_type === 'weather_station' && (poi.station_url || poi.station_provider) && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Station météo</h3>
            {poi.station_provider && (
              <p className="text-sm text-gray-600 mb-2">Fournisseur : {poi.station_provider}</p>
            )}
            {poi.station_url && (
              <a
                href={poi.station_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-sky-500 font-medium hover:text-sky-600"
              >
                <ExternalLink className="h-4 w-4" />
                Voir les données
              </a>
            )}
          </div>
        )}

        {/* Webcam */}
        {poi.poi_type === 'webcam' && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Webcam</h3>
            {poi.webcam_orientation && (
              <p className="text-sm text-gray-600 mb-2">Orientation : {poi.webcam_orientation}</p>
            )}
            {poi.webcam_url && (
              <>
                <div className="rounded-lg overflow-hidden mb-3 bg-gray-100">
                  <iframe
                    src={poi.webcam_url}
                    className="w-full h-48 border-0"
                    title="Webcam"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
                <a
                  href={poi.webcam_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-sky-500 font-medium hover:text-sky-600"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir en plein écran
                </a>
              </>
            )}
          </div>
        )}

        {/* Rating / Voting */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Noter ce site</h3>
          <VotingStars
            currentRating={poi.average_rating}
            userVote={userVote}
            onVote={handleVote}
            totalVotes={poi.total_votes}
          />
        </div>

        {/* Author */}
        {poi.profiles && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {poi.profiles.avatar_url ? (
                  <img src={poi.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {poi.profiles.display_name || poi.profiles.username || 'Pilote anonyme'}
                </p>
                <p className="text-xs text-gray-400">Ajouté par</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
