'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import dynamic from 'next/dynamic';
import type { MapViewHandle, MarkerPosition } from '@/components/map/MapView';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

export default function PickLocationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapViewHandle>(null);
  const [marker, setMarker] = useState<MarkerPosition | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  const handleMarkerPlaced = useCallback((pos: MarkerPosition) => {
    setMarker(pos);
  }, []);

  const handleConfirm = () => {
    const pos = mapRef.current?.getMarkerPosition() || marker;
    if (pos) {
      const altParam = pos.alt !== null ? `&alt=${pos.alt}` : '';
      router.push(`/sites/new?lat=${pos.lat.toFixed(6)}&lng=${pos.lng.toFixed(6)}${altParam}`);
    }
  };

  // Dummy handlers required by MapView
  const noop = () => {};

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900 text-white px-4 py-3 flex items-center justify-between z-50 safe-area-top">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-800 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold">Choisir l&apos;emplacement</span>
        </div>
        {marker && (
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 bg-sky-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-sky-600"
          >
            <Check className="h-4 w-4" />
            Confirmer
          </button>
        )}
      </header>

      {/* Instruction */}
      <div className="flex-shrink-0 bg-sky-50 border-b border-sky-100 px-4 py-2.5 text-sm text-sky-700 text-center font-medium">
        Touchez la carte pour placer le site
      </div>

      {/* Map */}
      <main className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapView
          ref={mapRef}
          reports={[]}
          onReportClick={noop}
          onMarkerPlaced={handleMarkerPlaced}
        />
      </main>
    </div>
  );
}
