'use client';

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type MapStyleKey,
} from '@/lib/mapbox';
import type { WeatherReport, Shuttle, WindDirection } from '@/lib/types';

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

/* ------------------------------------------------------------------ */
/*  Condition-based color                                             */
/* ------------------------------------------------------------------ */
function getConditionColor(report: WeatherReport): string {
  const wind = report.wind_speed_kmh ?? 0;
  const gust = report.wind_gust_kmh ?? 0;
  const thermal = report.thermal_quality ?? 0;
  const turbulence = report.turbulence_level ?? 0;
  const flyability = report.flyability_score ?? 3;

  // GREEN: calm conditions
  if (wind <= 10 && gust <= 15 && thermal <= 2 && turbulence <= 1 && flyability >= 4) {
    return '#22c55e';
  }
  // RED: dangerous conditions
  if (wind >= 25 || gust >= 30 || thermal >= 4 || turbulence >= 4 || flyability <= 2) {
    return '#ef4444';
  }
  // YELLOW: moderate / in-between
  return '#eab308';
}

/* ------------------------------------------------------------------ */
/*  Wind direction → angle (degrees, 0 = North, clockwise)           */
/* ------------------------------------------------------------------ */
const WIND_ANGLE_MAP: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};
function getWindAngle(dir: WindDirection | null | undefined): number {
  if (!dir || dir === 'variable') return -1; // -1 means hide arrow
  return WIND_ANGLE_MAP[dir] ?? -1;
}

/* ------------------------------------------------------------------ */
/*  GeoJSON helpers                                                   */
/* ------------------------------------------------------------------ */
function buildReportFeatures(reports: WeatherReport[]): GeoJSON.Feature[] {
  return reports
    .filter((r) => r.location && r.location.coordinates && r.location.coordinates.length >= 2)
    .map((r) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: r.location!.coordinates,
      },
      properties: {
        id: r.id,
        report_type: r.report_type,
        color: getConditionColor(r),
        wind_angle: getWindAngle(r.wind_direction),
      },
    }));
}

function buildShuttleFeatures(shuttles: Shuttle[]): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  shuttles.forEach((s) => {
    if (s.meeting_point?.coordinates && s.meeting_point.coordinates.length >= 2) {
      const isFull = s.taken_seats >= s.total_seats;
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: s.meeting_point.coordinates },
        properties: { id: s.id, shuttle_role: 'departure', color: isFull ? '#ef4444' : '#22c55e' },
      });
    }
    if (s.destination?.coordinates && s.destination.coordinates.length >= 2) {
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: s.destination.coordinates },
        properties: { id: s.id, shuttle_role: 'arrival', color: '#3b82f6' },
      });
    }
  });
  return features;
}

/* ------------------------------------------------------------------ */
/*  Layer IDs (constants to avoid typos)                              */
/* ------------------------------------------------------------------ */
const SRC_REPORTS = 'parawaze-reports';
const LYR_OBS_CIRCLES = 'parawaze-obs-circles';
const LYR_FORECAST_CIRCLES = 'parawaze-forecast-circles';
const LYR_WIND_ARROWS = 'parawaze-wind-arrows';
const SRC_SHUTTLES = 'parawaze-shuttles';
const LYR_SHUTTLE_ICONS = 'parawaze-shuttle-icons';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { reports, shuttles = [], onReportClick, onShuttleClick, onMapMove, onMarkerPlaced },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mbRef = useRef<typeof mapboxgl | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('outdoors');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tap-to-place marker state
  const placedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markerPositionRef = useRef<MarkerPosition | null>(null);
  const [markerInfo, setMarkerInfo] = useState<MarkerPosition | null>(null);

  // Stable refs for callbacks used inside map events
  const reportsRef = useRef<WeatherReport[]>(reports);
  reportsRef.current = reports;
  const shuttlesRef = useRef<Shuttle[]>(shuttles);
  shuttlesRef.current = shuttles;
  const onReportClickRef = useRef(onReportClick);
  onReportClickRef.current = onReportClick;
  const onShuttleClickRef = useRef(onShuttleClick);
  onShuttleClickRef.current = onShuttleClick;

  // Expose getCenter and getMarkerPosition to parent via ref
  useImperativeHandle(ref, () => ({
    getCenter: () => {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return { lat: c.lat, lng: c.lng };
    },
    getMarkerPosition: () => markerPositionRef.current,
  }));

  /** Place (or move) the red placement marker at given coordinates */
  const placeMarker = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      if (!mapRef.current || !mbRef.current) return;
      const map = mapRef.current;
      const mb = mbRef.current;

      const pos: MarkerPosition = { lat: lngLat.lat, lng: lngLat.lng, alt: null };
      markerPositionRef.current = pos;
      setMarkerInfo(pos);

      if (placedMarkerRef.current) {
        placedMarkerRef.current.remove();
        placedMarkerRef.current = null;
      }

      const marker = new mb.Marker({ color: '#EF4444' })
        .setLngLat([lngLat.lng, lngLat.lat])
        .addTo(map);
      placedMarkerRef.current = marker;

      onMarkerPlaced?.(pos);
    },
    [onMarkerPlaced],
  );

  /* ---------------------------------------------------------------- */
  /*  Add GeoJSON sources & layers                                    */
  /* ---------------------------------------------------------------- */
  const addLayersToMap = useCallback((map: mapboxgl.Map) => {
    // --- Reports source ---
    if (!map.getSource(SRC_REPORTS)) {
      map.addSource(SRC_REPORTS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Observation circles (report_type = 'observation' or 'image_share')
    if (!map.getLayer(LYR_OBS_CIRCLES)) {
      map.addLayer({
        id: LYR_OBS_CIRCLES,
        type: 'circle',
        source: SRC_REPORTS,
        filter: ['any',
          ['==', ['get', 'report_type'], 'observation'],
          ['==', ['get', 'report_type'], 'image_share'],
        ],
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    // Forecast circles — larger stroke to distinguish
    if (!map.getLayer(LYR_FORECAST_CIRCLES)) {
      map.addLayer({
        id: LYR_FORECAST_CIRCLES,
        type: 'circle',
        source: SRC_REPORTS,
        filter: ['==', ['get', 'report_type'], 'forecast'],
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    // Wind direction arrows — symbol layer on top of circles
    if (!map.getLayer(LYR_WIND_ARROWS)) {
      map.addLayer({
        id: LYR_WIND_ARROWS,
        type: 'symbol',
        source: SRC_REPORTS,
        filter: ['!=', ['get', 'wind_angle'], -1],
        layout: {
          'text-field': '↑',
          'text-size': 16,
          'text-rotate': ['get', 'wind_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
        },
      });
    }

    // --- Shuttles source ---
    if (!map.getSource(SRC_SHUTTLES)) {
      map.addSource(SRC_SHUTTLES, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Shuttle markers — square shape using circle with large stroke
    if (!map.getLayer(LYR_SHUTTLE_ICONS)) {
      map.addLayer({
        id: LYR_SHUTTLE_ICONS,
        type: 'circle',
        source: SRC_SHUTTLES,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });
    }
    // Shuttle text label "N" for Navette
    if (!map.getLayer('parawaze-shuttle-label')) {
      map.addLayer({
        id: 'parawaze-shuttle-label',
        type: 'symbol',
        source: SRC_SHUTTLES,
        layout: {
          'text-field': 'N',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Initialize map                                                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
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

        const onStyleReady = () => {
          if (cancelled) return;
          addLayersToMap(map);
          // Populate with current data
          updateReportSource(map, reportsRef.current);
          updateShuttleSource(map, shuttlesRef.current);
          setMapLoaded(true);
        };

        map.on('load', onStyleReady);

        // Re-add layers after style change (style.load fires after setStyle)
        map.on('style.load', () => {
          if (cancelled) return;
          addLayersToMap(map);
          updateReportSource(map, reportsRef.current);
          updateShuttleSource(map, shuttlesRef.current);
          // Re-add shuttle route lines
          addShuttleRouteLines(map, shuttlesRef.current);
        });

        map.on('moveend', () => {
          const center = map.getCenter();
          onMapMove?.({ lat: center.lat, lng: center.lng });
        });

        // Tap-to-place: map click (ignoring clicks on GeoJSON layers)
        map.on('click', (e) => {
          // Check if the click was on one of our layers
          const layerFeatures = map.queryRenderedFeatures(e.point, {
            layers: [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS].filter(
              (l) => !!map.getLayer(l),
            ),
          });
          if (layerFeatures.length > 0) return; // handled by layer click
          // Also ignore clicks on native placement marker
          const target = e.originalEvent.target as HTMLElement;
          if (target?.closest('.mapboxgl-marker')) return;

          placeMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });

        // --- Click handlers for GeoJSON layers ---
        map.on('click', LYR_OBS_CIRCLES, (e) => {
          if (e.features && e.features[0]) {
            const reportId = e.features[0].properties?.id;
            const report = reportsRef.current.find((r) => r.id === reportId);
            if (report) onReportClickRef.current(report);
          }
        });
        map.on('click', LYR_FORECAST_CIRCLES, (e) => {
          if (e.features && e.features[0]) {
            const reportId = e.features[0].properties?.id;
            const report = reportsRef.current.find((r) => r.id === reportId);
            if (report) onReportClickRef.current(report);
          }
        });
        map.on('click', LYR_SHUTTLE_ICONS, (e) => {
          if (e.features && e.features[0]) {
            const shuttleId = e.features[0].properties?.id;
            const shuttle = shuttlesRef.current.find((s) => s.id === shuttleId);
            if (shuttle) onShuttleClickRef.current?.(shuttle);
          }
        });

        // Pointer cursor on interactive layers
        const interactiveLayers = [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, 'parawaze-shuttle-label'];
        interactiveLayers.forEach((layerId) => {
          map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
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

  /* ---------------------------------------------------------------- */
  /*  Source data update helpers                                       */
  /* ---------------------------------------------------------------- */
  function updateReportSource(map: mapboxgl.Map, rpts: WeatherReport[]) {
    const src = map.getSource(SRC_REPORTS) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildReportFeatures(rpts) });
    }
  }

  function updateShuttleSource(map: mapboxgl.Map, sht: Shuttle[]) {
    const features = buildShuttleFeatures(sht);
    console.log('[ParaWaze] updateShuttleSource:', features.length, 'features, source exists:', !!map.getSource(SRC_SHUTTLES));
    const src = map.getSource(SRC_SHUTTLES) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features });
    } else {
      console.warn('[ParaWaze] shuttle source not found!');
    }
  }

  function addShuttleRouteLines(map: mapboxgl.Map, sht: Shuttle[]) {
    const lineFeatures = sht
      .filter((s) => s.meeting_point?.coordinates && s.destination?.coordinates)
      .map((s) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [s.meeting_point!.coordinates, s.destination!.coordinates],
        },
      }));

    const geojson = { type: 'FeatureCollection' as const, features: lineFeatures };

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
    } catch {
      /* style not ready */
    }
  }

  // Change style
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  // Update report data when reports change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || reports.length === 0) return;
    const doUpdate = () => {
      if (map.getSource(SRC_REPORTS)) {
        updateReportSource(map, reports);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [reports]);

  // Update shuttle data when shuttles change — don't depend on mapLoaded
  // because shuttles may arrive before the map finishes loading
  useEffect(() => {
    const map = mapRef.current;
    if (!map || shuttles.length === 0) return;
    // Wait for map style to be ready before updating
    const doUpdate = () => {
      if (map.getSource(SRC_SHUTTLES)) {
        updateShuttleSource(map, shuttles);
        addShuttleRouteLines(map, shuttles);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [shuttles]);

  /* ---------------------------------------------------------------- */
  /*  Utility callbacks                                               */
  /* ---------------------------------------------------------------- */
  const flyToLocation = useCallback((lng: number, lat: number, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 });
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => flyToLocation(pos.coords.longitude, pos.coords.latitude, 12),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
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

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
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
