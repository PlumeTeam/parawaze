'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/mapbox';
import type mapboxgl from 'mapbox-gl';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type MapStyleKey = keyof typeof MAP_STYLES;
type PinMode = 'departure' | 'arrival' | null;

interface PinData {
  lat: number;
  lng: number;
  alt: number | null;
}

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
  const alt = pin.alt !== null ? ` · ${pin.alt}m` : '';
  return `${Math.abs(pin.lat).toFixed(4)}° ${latDir}, ${Math.abs(pin.lng).toFixed(4)}° ${lngDir}${alt}`;
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

  const [departure, setDeparture] = useState<PinData | null>(null);
  const [arrival, setArrival] = useState<PinData | null>(null);
  const [activeMode, setActiveMode] = useState<PinMode>('departure'); // Start with departure selected
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');

  // Store activeMode in a ref so the map click handler always has the latest value
  const activeModeRef = useRef<PinMode>(activeMode);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  const queryElevation = useCallback((map: mapboxgl.Map, lngLat: { lng: number; lat: number }): number | null => {
    try {
      const elev = map.queryTerrainElevation([lngLat.lng, lngLat.lat]);
      if (elev !== null && elev !== undefined) return Math.round(elev);
    } catch {}
    return null;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mb = (await import('mapbox-gl')).default;
        // Load CSS
        if (!document.querySelector('link[href*="mapbox-gl"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
          document.head.appendChild(link);
        }
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

        // Click handler — uses activeModeRef to always get current mode
        map.on('click', (e) => {
          const mode = activeModeRef.current;
          if (!mode) return; // No mode selected, ignore click

          const lngLat = e.lngLat;
          const alt = queryElevation(map, lngLat);
          const pinData: PinData = { lat: lngLat.lat, lng: lngLat.lng, alt };

          if (mode === 'departure') {
            if (marker1Ref.current) marker1Ref.current.remove();
            marker1Ref.current = new mb.Marker({ color: '#22c55e' })
              .setLngLat([lngLat.lng, lngLat.lat])
              .addTo(map);
            setDeparture(pinData);
          } else {
            if (marker2Ref.current) marker2Ref.current.remove();
            marker2Ref.current = new mb.Marker({ color: '#3b82f6' })
              .setLngLat([lngLat.lng, lngLat.lat])
              .addTo(map);
            setArrival(pinData);
          }
        });

        mapRef.current = map;
      } catch (err) {
        console.error('[ParaWaze] Failed to load mapbox-gl:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  const handleValidate = () => {
    if (!departure || !arrival) return;
    const params = new URLSearchParams({
      type: typeParam,
      mlat: departure.lat.toFixed(6),
      mlng: departure.lng.toFixed(6),
      malt: String(departure.alt ?? ''),
      dlat: arrival.lat.toFixed(6),
      dlng: arrival.lng.toFixed(6),
      dalt: String(arrival.alt ?? ''),
    });
    router.push(`/shuttle/new?${params.toString()}`);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, duration: 1500 });
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

  const styleLabels: Record<MapStyleKey, string> = { outdoors: 'Topo', satellite: 'Sat', standard: 'Plan' };
  const distance = departure && arrival ? haversineKm(departure, arrival) : null;
  const canValidate = departure !== null && arrival !== null;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

        {/* Back button */}
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        {/* Instructions */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-2xl shadow-lg text-center">
          {activeMode === 'departure' && <span>Touchez la carte pour placer le <span className="text-green-400 font-semibold">d&eacute;part</span></span>}
          {activeMode === 'arrival' && <span>Touchez la carte pour placer l&apos;<span className="text-blue-400 font-semibold">arriv&eacute;e</span></span>}
          {!activeMode && canValidate && distance !== null && (
            <span>&#x1F7E2; &#x2192; &#x1F535; {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`}</span>
          )}
          {!activeMode && !canValidate && <span>S&eacute;lectionnez D&eacute;part ou Arriv&eacute;e</span>}
        </div>

        {/* Map controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <button onClick={cycleStyle} className="bg-white rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700">{styleLabels[mapStyle]}</button>
          <button onClick={locateMe} className="bg-white rounded-xl shadow-lg p-2.5" title="Ma position">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 space-y-3 safe-area-bottom">
        {/* Pin info */}
        <div className="flex gap-2">
          <div className={`flex-1 text-xs px-3 py-2 rounded-xl ${departure ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            &#x1F7E2; {departure ? formatCoord(departure) : 'D\u00e9part non plac\u00e9'}
          </div>
          <div className={`flex-1 text-xs px-3 py-2 rounded-xl ${arrival ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
            &#x1F535; {arrival ? formatCoord(arrival) : 'Arriv\u00e9e non plac\u00e9e'}
          </div>
        </div>

        {/* Mode buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveMode(activeMode === 'departure' ? null : 'departure')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeMode === 'departure'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            &#x1F7E2; D&eacute;part
          </button>
          <button
            onClick={() => setActiveMode(activeMode === 'arrival' ? null : 'arrival')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeMode === 'arrival'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            &#x1F535; Arriv&eacute;e
          </button>
        </div>

        {/* Validate */}
        <button
          onClick={handleValidate}
          disabled={!canValidate}
          className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
            canValidate
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canValidate ? `Valider (${distance !== null ? (distance < 1 ? `${Math.round(distance! * 1000)}m` : `${distance!.toFixed(1)} km`) : ''})` : 'Placez les deux points'}
        </button>
      </div>
    </div>
  );
}

export default function PickLocationsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <PickLocationsContent />
    </Suspense>
  );
}
