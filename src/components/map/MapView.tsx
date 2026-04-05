'use client';

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  flyabilityColor,
  type MapStyleKey,
} from '@/lib/mapbox';
import type { WeatherReport, Shuttle } from '@/lib/types';

// mapbox-gl types only — the actual library is loaded dynamically below
import type mapboxgl from 'mapbox-gl';

export interface MarkerPosition {
  lat: number;
  lng: number;
  alt: number | null;
}

export interface MapViewHandle {
  getCenter: () => { lat: number; lng: number } | null;
  getMarkerPosition: () => MarkerPosition | null;
}

interface MapViewProps {
  reports: WeatherReport[];
  shuttles?: Shuttle[];
  onReportClick: (report: WeatherReport) => void;
  onShuttleClick?: (shuttle: Shuttle) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
  onMarkerPlaced?: (pos: MarkerPosition) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ reports, shuttles = [], onReportClick, onShuttleClick, onMapMove, onMarkerPlaced }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const shuttleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const mbRef = useRef<typeof mapboxgl | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tap-to-place marker state
  const placedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markerPositionRef = useRef<MarkerPosition | null>(null);
  const [markerInfo, setMarkerInfo] = useState<MarkerPosition | null>(null);

  // Guard to prevent map click from firing when a marker was just clicked
  const lastMarkerClickTime = useRef(0);

  // (tap detection handled by Mapbox GL's built-in click event)

  // Expose getCenter and getMarkerPosition to parent via ref
  useImperativeHandle(ref, () => ({
    getCenter: () => {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return { lat: c.lat, lng: c.lng };
    },
    getMarkerPosition: () => {
      return markerPositionRef.current;
    },
  }));

  // No custom pin element needed — we use Mapbox's default red marker

  /** Place (or move) the marker at given coordinates */
  const placeMarker = useCallback((lngLat: { lng: number; lat: number }) => {
    if (!mapRef.current || !mbRef.current) return;
    const map = mapRef.current;
    const mb = mbRef.current;

    // Altitude not queried on main map (terrain disabled to prevent marker drift)
    const alt: number | null = null;

    const pos: MarkerPosition = { lat: lngLat.lat, lng: lngLat.lng, alt };
    markerPositionRef.current = pos;
    setMarkerInfo(pos);

    // Remove existing placed marker
    if (placedMarkerRef.current) {
      placedMarkerRef.current.remove();
      placedMarkerRef.current = null;
    }

    // Create new marker using Mapbox default red pin (simple & reliable)
    const marker = new mb.Marker({ color: '#EF4444' })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(map);

    placedMarkerRef.current = marker;

    // Notify parent so it can store the position
    onMarkerPlaced?.(pos);
  }, [onMarkerPlaced]);

  // Initialize map — dynamically import mapbox-gl to avoid SSR issues
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import ensures mapbox-gl is only loaded in the browser
        const mb = (await import('mapbox-gl')).default;

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

          // NOTE: Terrain DEM removed from main map — it causes markers to drift
          // when zooming because setTerrain enables 3D projection.
          // Elevation queries are only done on the shuttle pick-locations page.
        });

        // No terrain re-add on style change (removed to prevent marker drift)

        map.on('moveend', () => {
          const center = map.getCenter();
          onMapMove?.({ lat: center.lat, lng: center.lng });
        });

        // --- Tap-to-place: use Mapbox GL's built-in click event ---
        // This automatically distinguishes clicks from drags and provides
        // geographic coordinates directly (no manual pixel→lngLat conversion).
        map.on('click', (e) => {
          if (Date.now() - lastMarkerClickTime.current < 300) return;
          const target = e.originalEvent.target as HTMLElement;
          if (target?.closest('.parawaze-marker, .parawaze-shuttle-marker, .mapboxgl-marker')) return;
          placeMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });

        mapRef.current = map;
      } catch (err) {
        console.error('[ParaWaze] Failed to load mapbox-gl:', err);
        setError(err instanceof Error ? err.message : String(err));
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

  // Change style
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  // Update report markers
  useEffect(() => {
    if (!mapRef.current || !mbRef.current) return;
    const mb = mbRef.current;

    // Clear existing report markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (!report.location) return;

      const coords = report.location.coordinates;
      if (!coords || coords.length < 2) return;

      const color = flyabilityColor(report.flyability_score || 3);

      // Use native Mapbox colored marker — reliable positioning, no drift
      const marker = new mb.Marker({ color })
        .setLngLat([coords[0], coords[1]])
        .addTo(mapRef.current!);

      // Get the marker element to add click handler
      const markerEl = marker.getElement();
      markerEl.classList.add('parawaze-marker');
      markerEl.style.cursor = 'pointer';

      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        lastMarkerClickTime.current = Date.now();
        onReportClick(report);
      });

      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

  // Update shuttle markers
  useEffect(() => {
    if (!mapRef.current || !mbRef.current) return;
    const mb = mbRef.current;

    // Clear existing shuttle markers
    shuttleMarkersRef.current.forEach((m) => m.remove());
    shuttleMarkersRef.current = [];

    shuttles.forEach((shuttle) => {
      if (!shuttle.meeting_point) return;
      const coords = shuttle.meeting_point.coordinates;
      if (!coords || coords.length < 2) return;

      const isFull = shuttle.taken_seats >= shuttle.total_seats;
      const borderColor = isFull ? '#ef4444' : '#22c55e';

      // Departure marker — native Mapbox marker (green or red based on capacity)
      const depMarker = new mb.Marker({ color: borderColor })
        .setLngLat([coords[0], coords[1]])
        .addTo(mapRef.current!);

      const depEl = depMarker.getElement();
      depEl.classList.add('parawaze-shuttle-marker');
      depEl.style.cursor = 'pointer';

      depEl.addEventListener('click', (e) => {
        e.stopPropagation();
        lastMarkerClickTime.current = Date.now();
        onShuttleClick?.(shuttle);
      });

      shuttleMarkersRef.current.push(depMarker);

      // Arrival marker (blue) — if destination exists
      if (shuttle.destination?.coordinates && shuttle.destination.coordinates.length >= 2) {
        const destCoords = shuttle.destination.coordinates;

        const arrMarker = new mb.Marker({ color: '#3b82f6' })
          .setLngLat([destCoords[0], destCoords[1]])
          .addTo(mapRef.current!);

        const arrEl = arrMarker.getElement();
        arrEl.classList.add('parawaze-shuttle-marker');
        arrEl.style.cursor = 'pointer';

        arrEl.addEventListener('click', (e) => {
          e.stopPropagation();
          lastMarkerClickTime.current = Date.now();
          onShuttleClick?.(shuttle);
        });

        shuttleMarkersRef.current.push(arrMarker);
      }
    });

    // Draw lines between meeting_point and destination for each shuttle
    const map = mapRef.current;
    const lineFeatures = shuttles
      .filter(s => s.meeting_point?.coordinates && s.destination?.coordinates)
      .map(s => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            s.meeting_point!.coordinates,
            s.destination!.coordinates,
          ],
        },
      }));

    const geojson = { type: 'FeatureCollection' as const, features: lineFeatures };

    // Draw shuttle route lines
    const addRouteLines = () => {
      try {
        if (map.getSource('shuttle-routes')) {
          (map.getSource('shuttle-routes') as any).setData(geojson);
        } else {
          map.addSource('shuttle-routes', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'shuttle-routes-line',
            type: 'line',
            source: 'shuttle-routes',
            paint: {
              'line-color': '#6366f1',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
              'line-opacity': 0.7,
            },
          });
        }
      } catch { /* style not ready */ }
    };

    if (map.isStyleLoaded()) {
      addRouteLines();
    } else {
      map.once('style.load', addRouteLines);
    }
  }, [shuttles, onShuttleClick]);

  const flyToLocation = useCallback((lng: number, lat: number, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 });
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyToLocation(pos.coords.longitude, pos.coords.latitude, 12);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [flyToLocation]);

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

  /** Format coordinates for the floating label */
  const formatLabel = (pos: MarkerPosition) => {
    const latDir = pos.lat >= 0 ? 'N' : 'S';
    const lngDir = pos.lng >= 0 ? 'E' : 'W';
    const coords = `${Math.abs(pos.lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(pos.lng).toFixed(4)}\u00B0 ${lngDir}`;
    const alt = pos.alt !== null ? ` \u00B7 ${pos.alt}m` : '';
    return `\u{1F4CD} ${coords}${alt}`;
  };

  return (
    <div className="relative w-full h-full">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-sm px-4 py-2 z-50">
          Map error: {error}
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

      {/* Marker info label — shown when a marker is placed */}
      {markerInfo && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg pointer-events-none whitespace-nowrap font-medium">
          {formatLabel(markerInfo)}
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Style toggle */}
        <button
          onClick={cycleStyle}
          className="bg-white rounded-xl shadow-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
        >
          {styleLabels[mapStyle]}
        </button>

        {/* Locate me */}
        <button
          onClick={locateMe}
          className="bg-white rounded-xl shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
          title="Ma position"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sky-500"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {/* Pin drop animation removed — using Mapbox default marker */}
    </div>
  );
});

export default MapView;
