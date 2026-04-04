'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/mapbox';
import type mapboxgl from 'mapbox-gl';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type MapStyleKey = keyof typeof MAP_STYLES;

interface PinData {
  lat: number;
  lng: number;
  alt: number | null;
}

/** Haversine distance in km */
function haversineKm(a: PinData, b: PinData): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatCoord(pin: PinData): string {
  const latDir = pin.lat >= 0 ? 'N' : 'S';
  const lngDir = pin.lng >= 0 ? 'E' : 'W';
  const coords = `${Math.abs(pin.lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(pin.lng).toFixed(4)}\u00B0 ${lngDir}`;
  const alt = pin.alt !== null ? ` \u00B7 ${pin.alt}m` : '';
  return `${coords}${alt}`;
}

function PickLocationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') || 'offer';

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mbRef = useRef<typeof mapboxgl | null>(null);

  const marker1Ref = useRef<mapboxgl.Marker | null>(null);
  const marker2Ref = useRef<mapboxgl.Marker | null>(null);

  const [pin1, setPin1] = useState<PinData | null>(null);
  const [pin2, setPin2] = useState<PinData | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');

  const queryElevation = useCallback((map: mapboxgl.Map, lngLat: { lng: number; lat: number }): number | null => {
    try {
      const elev = map.queryTerrainElevation([lngLat.lng, lngLat.lat]);
      if (elev !== null && elev !== undefined) return Math.round(elev);
    } catch { /* terrain not loaded */ }
    return null;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mb = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        if (cancelled) return;

        mb.accessToken = MAPBOX_TOKEN;
        mbRef.current = mb;

        const map = new mb.Map({
          container: mapContainer.current!,
          style: MAP_STYLES[mapStyle],
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
        });

        map.addControl(new mb.AttributionControl({ compact: true }), 'bottom-left');

        map.on('load', () => {
          if (cancelled) return;
          setMapLoaded(true);

          if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 0 });
          }
        });

        map.on('style.load', () => {
          if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 0 });
          }
        });

        mapRef.current = map;
      } catch (err) {
        console.error('[ParaWaze] Failed to load mapbox-gl:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const mb = mbRef.current;
      if (!mb) return;

      const lngLat = e.lngLat;
      const alt = queryElevation(map, lngLat);
      const pinData: PinData = { lat: lngLat.lat, lng: lngLat.lng, alt };

      setStep((currentStep) => {
        setPin1((currentPin1) => {
          setPin2((currentPin2) => {
            if (currentStep === 1 && !currentPin1) {
              // Place first pin (green = departure)
              if (marker1Ref.current) marker1Ref.current.remove();
              marker1Ref.current = new mb.Marker({ color: '#22c55e' })
                .setLngLat([lngLat.lng, lngLat.lat])
                .addTo(map);
              // Don't update pin2
              return currentPin2;
            } else if (currentStep === 1 && currentPin1 && !currentPin2) {
              // This shouldn't happen but handle gracefully
              return currentPin2;
            } else {
              // Step 2 or both placed: update destination (blue)
              if (marker2Ref.current) marker2Ref.current.remove();
              marker2Ref.current = new mb.Marker({ color: '#3b82f6' })
                .setLngLat([lngLat.lng, lngLat.lat])
                .addTo(map);
              return pinData;
            }
          });

          if (currentStep === 1 && !currentPin1) {
            return pinData; // set pin1
          }
          return currentPin1; // keep pin1
        });

        if (currentStep === 1) {
          // After placing first pin, move to step 2
          return 2;
        }
        return 2; // stay on step 2
      });
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [mapLoaded, queryElevation]);

  // Style changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  const handleReset = () => {
    marker1Ref.current?.remove();
    marker2Ref.current?.remove();
    marker1Ref.current = null;
    marker2Ref.current = null;
    setPin1(null);
    setPin2(null);
    setStep(1);
  };

  const handleValidate = () => {
    if (!pin1 || !pin2) return;
    const params = new URLSearchParams({
      type: typeParam,
      mlat: pin1.lat.toFixed(6),
      mlng: pin1.lng.toFixed(6),
      malt: String(pin1.alt ?? ''),
      dlat: pin2.lat.toFixed(6),
      dlng: pin2.lng.toFixed(6),
      dalt: String(pin2.alt ?? ''),
    });
    router.push(`/shuttle/new?${params.toString()}`);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 12,
          duration: 1500,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const cycleStyle = () => {
    const styles: MapStyleKey[] = ['outdoors', 'satellite', 'standard'];
    const idx = styles.indexOf(mapStyle);
    setMapStyle(styles[(idx + 1) % styles.length]);
  };

  const styleLabels: Record<MapStyleKey, string> = {
    outdoors: 'Topo',
    satellite: 'Sat',
    standard: 'Plan',
  };

  const distance = pin1 && pin2 ? haversineKm(pin1, pin2) : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Instruction overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg max-w-[85vw] text-center">
        {step === 1 && !pin1 && (
          <span>
            <span className="font-semibold text-green-400">{'\u00C9'}tape 1/2</span>
            {' \u2014 '}Touchez la carte pour le <span className="text-green-400 font-semibold">point de d{'\u00E9'}part</span>
          </span>
        )}
        {step === 2 && !pin2 && (
          <span>
            <span className="font-semibold text-blue-400">{'\u00C9'}tape 2/2</span>
            {' \u2014 '}Touchez la carte pour le <span className="text-blue-400 font-semibold">lieu de d{'\u00E9'}collage</span>
          </span>
        )}
        {pin1 && pin2 && distance !== null && (
          <span>
            {'\uD83D\uDFE2'} D{'\u00E9'}part {'\u2192'} {'\uD83D\uDD35'} Arriv{'\u00E9'}e ({distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`})
          </span>
        )}
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={cycleStyle}
          className="bg-white rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
        >
          {styleLabels[mapStyle]}
        </button>
        <button
          onClick={locateMe}
          className="bg-white rounded-xl shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
          title="Ma position"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {/* Pin info labels */}
      {pin1 && (
        <div className="absolute bottom-32 left-4 z-20 bg-green-600/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-xl shadow-lg max-w-[60vw]">
          {'\uD83D\uDFE2'} D{'\u00E9'}part: {formatCoord(pin1)}
        </div>
      )}
      {pin2 && (
        <div className="absolute bottom-32 right-4 z-20 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-xl shadow-lg max-w-[60vw]">
          {'\uD83D\uDD35'} Arriv{'\u00E9'}e: {formatCoord(pin2)}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex gap-3">
        {/* Reset button */}
        {(pin1 || pin2) && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm text-gray-700 rounded-xl py-3.5 px-4 font-semibold text-sm shadow-lg active:bg-gray-100 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Recommencer
          </button>
        )}

        {/* Validate button */}
        {pin1 && pin2 && (
          <button
            onClick={handleValidate}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl py-3.5 font-bold text-base shadow-lg active:from-sky-600 active:to-sky-700 transition-all"
          >
            Valider les positions
          </button>
        )}
      </div>
    </div>
  );
}

export default function PickLocationsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <PickLocationsContent />
    </Suspense>
  );
}
