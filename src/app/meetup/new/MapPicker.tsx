'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_ZOOM } from '@/lib/mapbox';
import { Check, X } from 'lucide-react';
import type mapboxgl from 'mapbox-gl';

interface MapPickerProps {
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number, alt: number | null, name?: string) => void;
  onClose: () => void;
}

export default function MapPicker({ initialLat, initialLng, onConfirm, onClose }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mbRef = useRef<typeof mapboxgl | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mb = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;
      mb.accessToken = MAPBOX_TOKEN;
      mbRef.current = mb;

      const map = new mb.Map({
        container: containerRef.current,
        style: MAP_STYLES.outdoors,
        center: [initialLng, initialLat],
        zoom: DEFAULT_ZOOM,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!cancelled) setMapLoaded(true);
      });

      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setPosition({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new mb.Marker({ color: '#F59E0B' })
            .setLngLat([lng, lat])
            .addTo(map);
        }
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLng]);

  const handleConfirm = useCallback(() => {
    if (!position) return;
    onConfirm(position.lat, position.lng, null);
  }, [position, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Map */}
      <div ref={containerRef} className="flex-1" />

      {/* Overlay instructions */}
      {!position && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
            Touchez la carte pour placer le lieu
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex gap-3 safe-area-bottom">
        <button
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl bg-white/90 text-gray-800 font-semibold flex items-center justify-center gap-2 active:opacity-70 backdrop-blur-sm"
        >
          <X size={18} />
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!position}
          className="flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:opacity-70 disabled:opacity-40 text-white"
          style={{ background: '#3A3A3A' }}
        >
          <Check size={18} />
          Confirmer
        </button>
      </div>

      {/* Close button top left */}
      <button
        onClick={onClose}
        className="absolute top-safe-top left-4 top-12 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md active:opacity-70 backdrop-blur-sm"
      >
        <X size={18} className="text-gray-700" />
      </button>
    </div>
  );
}
