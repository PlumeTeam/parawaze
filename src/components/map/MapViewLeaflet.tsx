'use client';

import { useEffect, useRef, useState } from 'react';
import type { WeatherReport, Shuttle, Poi } from '@/lib/types';
import type { DayFilter } from '@/hooks/useReports';

export interface MapViewLeafletProps {
  reports: WeatherReport[];
  pois: Poi[];
  shuttles: Shuttle[];
  dayFilter: DayFilter;
  onObservationsClick?: (observations: WeatherReport[]) => void;
  onPoiClick?: (poi: Poi) => void;
  onShuttleClick?: (shuttle: Shuttle) => void;
  onMarkerPlaced?: (pos: { lat: number; lng: number; alt: number | null }) => void;
  onMapLoaded?: () => void;
}

function obsColor(report: WeatherReport): string {
  const w = report.wind_speed_kmh;
  if (w == null) return '#3B82F6';
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export default function MapViewLeaflet({
  reports,
  pois,
  shuttles,
  onObservationsClick,
  onPoiClick,
  onShuttleClick,
  onMarkerPlaced,
  onMapLoaded,
}: MapViewLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const cbMarkerPlaced = useRef(onMarkerPlaced);
  cbMarkerPlaced.current = onMarkerPlaced;
  const cbMapLoaded = useRef(onMapLoaded);
  cbMapLoaded.current = onMapLoaded;

  // Initialise Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      // Inject Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise<void>((res) => { link.onload = () => res(); link.onerror = () => res(); });
      }

      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { center: [45.5, 6.5], zoom: 9 });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);

      map.on('click', (e: any) => {
        cbMarkerPlaced.current?.({ lat: e.latlng.lat, lng: e.latlng.lng, alt: null });
      });

      mapRef.current = map;
      setMapReady(true);
      cbMapLoaded.current?.();
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw markers whenever data changes
  useEffect(() => {
    if (!mapReady || !markersRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const group = markersRef.current;
      if (!group) return;
      group.clearLayers();

      // Observations
      reports
        .filter((r) => r.location && r.report_type !== 'forecast')
        .forEach((r) => {
          const [lng, lat] = r.location!.coordinates;
          const m = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: obsColor(r),
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9,
          });
          const author = r.profiles?.display_name || r.profiles?.username || 'Anonyme';
          const wind = r.wind_speed_kmh != null ? `<br/>${r.wind_speed_kmh} km/h` : '';
          m.bindPopup(`<b>${author}</b>${r.location_name ? `<br/>${r.location_name}` : ''}${wind}`);
          m.on('click', (e: any) => { e.originalEvent?.stopPropagation(); onObservationsClick?.([r]); });
          m.addTo(group);
        });

      // POIs
      pois.forEach((p) => {
        if (!p.location) return;
        const [lng, lat] = p.location.coordinates;
        const m = L.circleMarker([lat, lng], {
          radius: 12,
          fillColor: p.poi_type === 'official' ? '#0ea5e9' : '#22c55e',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.95,
        });
        m.bindPopup(`<b>${p.location_name}</b><br/>${p.poi_type === 'official' ? 'Site officiel' : 'Site sauvage'}`);
        m.on('click', (e: any) => { e.originalEvent?.stopPropagation(); onPoiClick?.(p); });
        m.addTo(group);
      });

      // Shuttles (departure point only)
      shuttles.forEach((s) => {
        if (!s.meeting_point) return;
        const [lng, lat] = s.meeting_point.coordinates;
        const m = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: '#22c55e',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.95,
        });
        m.bindPopup(`<b>Navette</b><br/>${s.meeting_point_name || ''}`);
        m.on('click', (e: any) => { e.originalEvent?.stopPropagation(); onShuttleClick?.(s); });
        m.addTo(group);
      });
    })();
  }, [mapReady, reports, pois, shuttles, onObservationsClick, onPoiClick, onShuttleClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
