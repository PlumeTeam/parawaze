'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MAPBOX_TOKEN, MAP_STYLES, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/mapbox';
import type mapboxgl from 'mapbox-gl';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type MapStyleKey = keyof typeof MAP_STYLES;
type PinMode = 'takeoff' | 'landing' | null;

interface PinData {
  lat: number;
  lng: number;
  alt: number | null;
}

function formatCoord(pin: PinData): string {
  const latDir = pin.lat >= 0 ? 'N' : 'S';
  const lngDir = pin.lng >= 0 ? 'E' : 'W';
  const alt = pin.alt !== null ? ` · ${pin.alt}m` : '';
  return `${Math.abs(pin.lat).toFixed(4)}° ${latDir}, ${Math.abs(pin.lng).toFixed(4)}° ${lngDir}${alt}`;
}

function PickLocationContent() {
  const router = useRouter();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mbRef = useRef<typeof mapboxgl | null>(null);

  const marker1Ref = useRef<mapboxgl.Marker | null>(null);
  const marker2Ref = useRef<mapboxgl.Marker | null>(null);

  const [takeoff, setTakeoff] = useState<PinData | null>(null);
  const [landing, setLanding] = useState<PinData | null>(null);
  const [activeMode, setActiveMode] = useState<PinMode>('takeoff');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');

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

          // Auto-center on GPS
          try {
            if (navigator?.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  try {
                    if (pos?.coords) {
                      map.flyTo({
                        center: [pos.coords.longitude, pos.coords.latitude],
                        zoom: 11,
                        duration: 1500,
                      });
                    }
                  } catch (e) {
                    console.debug('Geolocation: flyTo error', e);
                  }
                },
                (error) => {
                  console.debug('Geolocation error:', error?.code, error?.message);
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }
          } catch (e) {
            console.debug('Geolocation: getCurrentPosition error', e);
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

        // Click handler
        map.on('click', (e) => {
          const mode = activeModeRef.current;
          if (!mode) return;

          const lngLat = e.lngLat;
          const alt = queryElevation(map, lngLat);
          const pinData: PinData = { lat: lngLat.lat, lng: lngLat.lng, alt };

          if (mode === 'takeoff') {
            if (marker1Ref.current) marker1Ref.current.remove();
            marker1Ref.current = new mb.Marker({ color: '#22c55e' })
              .setLngLat([lngLat.lng, lngLat.lat])
              .addTo(map);
            setTakeoff(pinData);
          } else {
            if (marker2Ref.current) marker2Ref.current.remove();
            marker2Ref.current = new mb.Marker({ color: '#3b82f6' })
              .setLngLat([lngLat.lng, lngLat.lat])
              .addTo(map);
            setLanding(pinData);
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
    if (!takeoff && !landing) return;
    const params = new URLSearchParams();
    if (takeoff) {
      params.append('tlat', takeoff.lat.toFixed(6));
      params.append('tlng', takeoff.lng.toFixed(6));
      if (takeoff.alt !== null) params.append('talt', String(takeoff.alt));
    }
    if (landing) {
      params.append('llat', landing.lat.toFixed(6));
      params.append('llng', landing.lng.toFixed(6));
      if (landing.alt !== null) params.append('lalt', String(landing.alt));
    }
    router.push(`/sites/new?${params.toString()}`);
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
  const canValidate = takeoff !== null || landing !== null;

  return (
    <div className="relative w-screen h-screen overflow-y-auto flex flex-col">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

        {/* Back button */}
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        {/* Instructions */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-2xl shadow-lg text-center">
          {activeMode === 'takeoff' && <span>Touchez la carte pour placer le <span className="text-green-400 font-semibold">d&eacute;collage</span></span>}
          {activeMode === 'landing' && <span>Touchez la carte pour placer l&apos;<span className="text-blue-400 font-semibold">att&eacute;rissage</span></span>}
          {!activeMode && canValidate && <span>&#x1F7E2; D&eacute;collage{takeoff ? ' ✓' : ''} · &#x1F535; Att&eacute;rissage{landing ? ' ✓' : ''}</span>}
          {!activeMode && !canValidate && <span>S&eacute;lectionnez D&eacute;collage ou Att&eacute;rissage</span>}
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

      {/* Bottom panel — pin info */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 space-y-3 safe-area-bottom">
        {/* Pin info */}
        <div className="flex gap-2">
          <div className={`flex-1 text-xs px-3 py-2 rounded-xl ${takeoff ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            &#x1F7E2; {takeoff ? formatCoord(takeoff) : 'D\u00e9collage non plac\u00e9'}
          </div>
          <div className={`flex-1 text-xs px-3 py-2 rounded-xl ${landing ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
            &#x1F535; {landing ? formatCoord(landing) : 'Att\u00e9rissage non plac\u00e9'}
          </div>
        </div>
      </div>

      {/* Fixed Validate Button */}
      <button
        onClick={handleValidate}
        disabled={!canValidate}
        className={`fixed left-4 right-4 z-30 py-3.5 rounded-xl font-bold text-base transition-all ${
          canValidate
            ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        style={{ bottom: '80px' }}
      >
        {canValidate ? 'Valider' : 'Placez au moins un point'}
      </button>

      {/* Mode buttons */}
      <div className="fixed left-4 right-4 z-30 flex gap-2" style={{ bottom: '32px' }}>
        <button
          onClick={() => setActiveMode(activeMode === 'takeoff' ? null : 'takeoff')}
          style={{ height: '44px' }}
          className={`flex-1 rounded-xl font-semibold text-sm transition-all shadow ${
            activeMode === 'takeoff'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 border border-gray-300'
          }`}
        >
          &#x1F7E2; D&eacute;co
        </button>
        <button
          onClick={() => setActiveMode(activeMode === 'landing' ? null : 'landing')}
          style={{ height: '44px' }}
          className={`flex-1 rounded-xl font-semibold text-sm transition-all shadow ${
            activeMode === 'landing'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 border border-gray-300'
          }`}
        >
          &#x1F535; Att&eacute;ro
        </button>
      </div>
    </div>
  );
}

export default function PickLocationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <PickLocationContent />
    </Suspense>
  );
}
