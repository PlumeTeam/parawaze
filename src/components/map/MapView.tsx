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
import type { WeatherReport } from '@/lib/types';

// mapbox-gl types only — the actual library is loaded dynamically below
import type mapboxgl from 'mapbox-gl';

export interface MapViewHandle {
  getCenter: () => { lat: number; lng: number } | null;
}

interface MapViewProps {
  reports: WeatherReport[];
  onReportClick: (report: WeatherReport) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ reports, onReportClick, onMapMove }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mbRef = useRef<typeof mapboxgl | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expose getCenter to parent via ref
  useImperativeHandle(ref, () => ({
    getCenter: () => {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return { lat: c.lat, lng: c.lng };
    },
  }));

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
          if (!cancelled) setMapLoaded(true);
        });

        map.on('moveend', () => {
          const center = map.getCenter();
          onMapMove?.({ lat: center.lat, lng: center.lng });
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

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mbRef.current) return;
    const mb = mbRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (!report.location) return;

      const coords = report.location.coordinates;
      if (!coords || coords.length < 2) return;

      const color = flyabilityColor(report.flyability_score || 3);

      // Create marker element
      const el = document.createElement('div');
      el.className = 'parawaze-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: transform 0.2s;
      `;

      const icon = report.report_type === 'observation' ? '\u{1F441}\uFE0F' : report.report_type === 'forecast' ? '\u{1F52E}' : '\u{1F4F7}';
      el.innerHTML = icon;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mb.Marker({ element: el })
        .setLngLat([coords[0], coords[1]])
        .addTo(mapRef.current!);

      el.addEventListener('click', () => {
        onReportClick(report);
      });

      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

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

  return (
    <div className="relative w-full h-full">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-sm px-4 py-2 z-50">
          Map error: {error}
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

      {/* Center crosshair — shows user where their report will be placed */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="opacity-40">
          <line x1="15" y1="4" x2="15" y2="12" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="18" x2="15" y2="26" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="15" x2="12" y2="15" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="15" x2="26" y2="15" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15" cy="15" r="3" stroke="#374151" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

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
    </div>
  );
});

export default MapView;
