'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type L from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM, flyabilityColor } from '@/lib/mapbox';
import type { MapViewProps, MapViewHandle } from './MapView';

type LType = typeof L;

const TILE_LAYERS = [
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
];

function makeCircleIcon(L: LType, color: string, size = 14): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeShuttleIcon(L: LType): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:6px;background:#f97316;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);font-size:14px">🚗</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makePoiIcon(L: LType): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#0ea5e9;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);font-size:14px">🪂</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeMeetupIcon(L: LType): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);font-size:14px">📅</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeStoryIcon(L: LType, count: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#f97316);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);color:white;font-size:11px;font-weight:700">${count > 1 ? count : '▶'}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const MapViewLeaflet = forwardRef<MapViewHandle, MapViewProps>(function MapViewLeaflet(
  {
    reports = [],
    shuttles = [],
    pois = [],
    stories = [],
    meetups = [],
    onObservationsClick,
    onShuttleClick,
    onPoiClick,
    onStoryClick,
    onMeetupClick,
    onMapMove,
    onMarkerPlaced,
    onMapLoaded,
    onMapReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileIndexRef = useRef(0);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerPosRef = useRef<{ lat: number; lng: number; alt: number | null } | null>(null);
  const placedMarkerRef = useRef<L.Marker | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Stable callback refs so layer effects don't re-run when callbacks change identity
  const onObsClickRef = useRef(onObservationsClick);
  const onShuttleClickRef = useRef(onShuttleClick);
  const onPoiClickRef = useRef(onPoiClick);
  const onStoryClickRef = useRef(onStoryClick);
  const onMeetupClickRef = useRef(onMeetupClick);
  const onMarkerPlacedRef = useRef(onMarkerPlaced);
  const onMapMoveRef = useRef(onMapMove);

  useEffect(() => { onObsClickRef.current = onObservationsClick; }, [onObservationsClick]);
  useEffect(() => { onShuttleClickRef.current = onShuttleClick; }, [onShuttleClick]);
  useEffect(() => { onPoiClickRef.current = onPoiClick; }, [onPoiClick]);
  useEffect(() => { onStoryClickRef.current = onStoryClick; }, [onStoryClick]);
  useEffect(() => { onMeetupClickRef.current = onMeetupClick; }, [onMeetupClick]);
  useEffect(() => { onMarkerPlacedRef.current = onMarkerPlaced; }, [onMarkerPlaced]);
  useEffect(() => { onMapMoveRef.current = onMapMove; }, [onMapMove]);

  useImperativeHandle(ref, () => ({
    getCenter() {
      const c = mapInstanceRef.current?.getCenter();
      return c ? { lat: c.lat, lng: c.lng } : { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] };
    },
    getMarkerPosition() {
      return markerPosRef.current;
    },
  }));

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapInstanceRef.current) return;

      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const firstTile = TILE_LAYERS[0];
      tileLayerRef.current = L.tileLayer(firstTile.url, { attribution: firstTile.attribution }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerPosRef.current = { lat, lng, alt: null };
        if (placedMarkerRef.current) {
          placedMarkerRef.current.setLatLng([lat, lng]);
        } else {
          placedMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              html: `<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
              className: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          }).addTo(map);
        }
        onMarkerPlacedRef.current?.({ lat, lng, alt: null });
      });

      map.on('moveend', () => {
        const c = map.getCenter();
        onMapMoveRef.current?.({ lat: c.lat, lng: c.lng });
      });

      mapInstanceRef.current = map;
      onMapLoaded?.();
      onMapReady?.({
        cycleStyle: () => {
          if (!mapInstanceRef.current || !tileLayerRef.current) return;
          tileIndexRef.current = (tileIndexRef.current + 1) % TILE_LAYERS.length;
          const next = TILE_LAYERS[tileIndexRef.current];
          mapInstanceRef.current.removeLayer(tileLayerRef.current);
          tileLayerRef.current = L.tileLayer(next.url, { attribution: next.attribution }).addTo(mapInstanceRef.current);
        },
        locateMe: () => {
          mapInstanceRef.current?.locate({ setView: true, maxZoom: 14 });
        },
      });
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      placedMarkerRef.current = null;
      tileLayerRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw all data markers when data props change
  useEffect(() => {
    const group = layerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;

    import('leaflet').then((L) => {
      group.clearLayers();

      // Observations: group by ~200m proximity
      const obsFeatures = reports.filter(
        (r) => r.report_type === 'observation' && r.location?.coordinates,
      );

      // Simple grid-based grouping (0.002° ≈ 200m)
      const obsGroups = new Map<string, typeof obsFeatures>();
      for (const r of obsFeatures) {
        const [lng, lat] = r.location!.coordinates;
        const key = `${(lat / 0.002).toFixed(0)},${(lng / 0.002).toFixed(0)}`;
        if (!obsGroups.has(key)) obsGroups.set(key, []);
        obsGroups.get(key)!.push(r);
      }

      for (const group_reports of Array.from(obsGroups.values())) {
        const rep = group_reports[0];
        const [lng, lat] = rep.location!.coordinates;
        const score = rep.flyability_score ?? 0;
        const color = flyabilityColor(score);
        const size = group_reports.length > 1 ? 20 : 14;
        const marker = L.marker([lat, lng], { icon: makeCircleIcon(L, color, size) });
        if (group_reports.length > 1) {
          marker.bindTooltip(String(group_reports.length), { permanent: true, className: 'obs-count-tooltip', direction: 'center', offset: [0, 0] });
        }
        marker.on('click', () => onObsClickRef.current?.(group_reports));
        group.addLayer(marker);
      }

      // Forecasts
      for (const r of reports.filter((r) => r.report_type === 'forecast' && r.location?.coordinates)) {
        const [lng, lat] = r.location!.coordinates;
        const color = flyabilityColor(r.flyability_score ?? 0);
        const marker = L.marker([lat, lng], { icon: makeCircleIcon(L, color, 12) });
        marker.on('click', () => onObsClickRef.current?.([r]));
        group.addLayer(marker);
      }

      // Shuttles
      for (const s of shuttles) {
        if (!s.meeting_point?.coordinates) continue;
        const [lng, lat] = s.meeting_point.coordinates;
        const marker = L.marker([lat, lng], { icon: makeShuttleIcon(L) });
        marker.bindTooltip(s.profiles?.display_name ?? 'Shuttle', { direction: 'top', offset: [0, -14] });
        marker.on('click', () => onShuttleClickRef.current?.(s));
        group.addLayer(marker);
      }

      // POIs
      for (const p of pois) {
        if (!p.location?.coordinates) continue;
        const [lng, lat] = p.location.coordinates;
        const marker = L.marker([lat, lng], { icon: makePoiIcon(L) });
        marker.bindTooltip(p.location_name, { direction: 'top', offset: [0, -14] });
        marker.on('click', () => onPoiClickRef.current?.(p));
        group.addLayer(marker);
      }

      // Stories — group by proximity
      const storyGroups = new Map<string, typeof stories>();
      for (const s of stories) {
        if (!s.location?.coordinates) continue;
        const [lng, lat] = s.location.coordinates;
        const key = `${(lat / 0.005).toFixed(0)},${(lng / 0.005).toFixed(0)}`;
        if (!storyGroups.has(key)) storyGroups.set(key, []);
        storyGroups.get(key)!.push(s);
      }
      for (const group_stories of Array.from(storyGroups.values())) {
        const first = group_stories[0];
        const [lng, lat] = first.location!.coordinates;
        const marker = L.marker([lat, lng], { icon: makeStoryIcon(L, group_stories.length) });
        marker.on('click', () => onStoryClickRef.current?.(group_stories));
        group.addLayer(marker);
      }

      // Meetups
      for (const m of meetups) {
        if (!m.location?.coordinates) continue;
        const [lng, lat] = m.location.coordinates;
        const marker = L.marker([lat, lng], { icon: makeMeetupIcon(L) });
        marker.bindTooltip(m.title, { direction: 'top', offset: [0, -14] });
        marker.on('click', () => onMeetupClickRef.current?.(m));
        group.addLayer(marker);
      }
    });
  }, [reports, shuttles, pois, stories, meetups]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

export default MapViewLeaflet;
