'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePois } from '@/hooks/usePois';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Poi, PoiType } from '@/lib/types';

type FilterTab = 'all' | 'official' | 'wild';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Tous',
  official: 'Sites officiels',
  wild: 'Sites sauvages',
};

const POI_TYPE_CONFIG: Record<PoiType, { label: string; emoji: string; color: string; bgColor: string }> = {
  official: { label: 'Site officiel', emoji: 'O', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  wild: { label: 'Site sauvage', emoji: 'S', color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Facile',
  moderate: 'Modéré',
  difficult: 'Difficile',
  expert: 'Expert',
};

function StarRating({ rating, votes }: { rating: number; votes: number }) {
  const displayVotes = votes > 11 ? votes - 11 : 0; // Subtract initial fake votes for display
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">
        {rating.toFixed(1)} ({displayVotes} vote{displayVotes !== 1 ? 's' : ''})
      </span>
    </div>
  );
}

function PoiCard({ poi, onClick }: { poi: Poi; onClick: () => void }) {
  const config = POI_TYPE_CONFIG[poi.poi_type];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`flex-shrink-0 w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center`}>
          <span className={`font-bold text-lg ${config.color}`}>{config.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 truncate">{poi.location_name}</h3>
            {poi.ffvl_approved && (
              <span className="flex-shrink-0 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium">
                FFVL
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{config.label}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {poi.altitude_m && (
              <span className="text-xs text-gray-500">{poi.altitude_m}m</span>
            )}
            {poi.difficulty && (
              <span className="text-xs text-gray-500">{DIFFICULTY_LABELS[poi.difficulty]}</span>
            )}
          </div>
          <div className="mt-1.5">
            <StarRating rating={poi.average_rating} votes={poi.total_votes} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SitesPage() {
  const { user, loading: authLoading } = useAuth();
  const { pois, loading, fetchPois } = usePois();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchPois();
  }, [fetchPois]);

  const filteredPois = activeTab === 'all'
    ? pois
    : pois.filter((p) => p.poi_type === activeTab);

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
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/map')} className="p-1 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Sites de vol</h1>
          </div>
          <button
            onClick={() => router.push('/sites/pick-location')}
            className="flex items-center gap-1.5 bg-sky-500 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(TAB_LABELS) as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* POI list */}
      <div className="px-4 pt-2 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredPois.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {activeTab === 'all' ? 'Aucun site pour le moment' : `Aucun site de type "${TAB_LABELS[activeTab]}"`}
            </p>
            <button
              onClick={() => router.push('/sites/pick-location')}
              className="mt-4 text-sky-500 text-sm font-medium hover:text-sky-600"
            >
              Ajouter le premier site
            </button>
          </div>
        ) : (
          filteredPois.map((poi) => (
            <PoiCard
              key={poi.id}
              poi={poi}
              onClick={() => router.push(`/sites/${poi.id}`)}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}