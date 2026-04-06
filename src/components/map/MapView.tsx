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
import type { WeatherReport, Shuttle, WindDirection, Poi } from '@/lib/types';
import type { PioupiouStation } from '@/hooks/usePioupiou';
import type { FFVLStation } from '@/hooks/useFFVL';
import type { WindsMobiStation } from '@/hooks/useWindsMobi';

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
  pois?: Poi[];
  pioupiouStations?: PioupiouStation[];
  ffvlStations?: FFVLStation[];
  windsMobiStations?: WindsMobiStation[];
  onReportClick: (report: WeatherReport) => void;
  onShuttleClick?: (shuttle: Shuttle) => void;
  onPoiClick?: (poi: Poi) => void;
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
  // Wind direction means "where the wind comes FROM"
  // Arrow ➤ points right by default (90°), so subtract 90 to align with north=0
  // Then add 180° to show where wind BLOWS TO
  const angle = WIND_ANGLE_MAP[dir];
  return angle !== undefined ? (angle + 180 - 90 + 360) % 360 : -1;
}

/* ------------------------------------------------------------------ */
/*  GeoJSON helpers                                                   */
/* ------------------------------------------------------------------ */
function getAgeOpacity(createdAt: string, reportType: string): number {
  // Only observations fade over time, forecasts stay at full opacity
  if (reportType === 'forecast') return 0.95;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageMinutes = ageMs / (1000 * 60);
  if (ageMinutes < 30) return 1.0;     // < 30min: 100%
  // After 30min: lose 5% every 30 minutes, minimum 40%
  const halfHours = Math.floor(ageMinutes / 30);
  const opacity = 1.0 - halfHours * 0.05;
  return Math.max(0.40, Math.min(1.0, opacity));
}

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
        opacity: getAgeOpacity(r.created_at, r.report_type),
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
/*  POI GeoJSON                                                       */
/* ------------------------------------------------------------------ */
function buildPoiFeatures(pois: Poi[]): GeoJSON.Feature[] {
  return pois
    .filter((p) => p.location && p.location.coordinates && p.location.coordinates.length >= 2)
    .map((p) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: p.location!.coordinates,
      },
      properties: {
        id: p.id,
        poi_type: p.poi_type,
        label:
          p.poi_type === 'landing' ? 'A' :
          p.poi_type === 'takeoff' ? 'D' :
          p.poi_type === 'weather_station' ? 'M' : 'W',
        color:
          p.poi_type === 'landing' ? '#22c55e' :
          p.poi_type === 'takeoff' ? '#3b82f6' :
          p.poi_type === 'weather_station' ? '#eab308' : '#a855f7',
      },
    }));
}

/* ------------------------------------------------------------------ */
/*  Pioupiou GeoJSON                                                  */
/* ------------------------------------------------------------------ */
function getPioupiouColor(station: PioupiouStation): string {
  if (!station.isOnline || station.windAvg == null) return '#9ca3af'; // gray
  const w = station.windAvg;
  if (w < 15) return '#22c55e';  // green
  if (w < 25) return '#eab308';  // yellow
  if (w < 35) return '#f97316';  // orange
  return '#ef4444';              // red
}

function buildPioupiouFeatures(stations: PioupiouStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lng, s.lat],
    },
    properties: {
      id: s.id,
      name: s.name,
      color: getPioupiouColor(s),
      windAvg: s.windAvg,
      windMax: s.windMax,
      windMin: s.windMin,
      windHeading: s.windHeading,
      isOnline: s.isOnline,
      lastUpdate: s.lastUpdate,
      // Wind arrow rotation: heading is where wind comes FROM, arrow shows direction it blows TO
      // ➤ points right (90°) by default, so subtract 90
      wind_arrow_angle:
        s.windHeading != null && s.isOnline && s.windAvg != null
          ? (s.windHeading + 180 - 90 + 360) % 360
          : -1,
      windLabel:
        s.isOnline && s.windAvg != null ? `${Math.round(s.windAvg)}` : '',
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  FFVL GeoJSON                                                      */
/* ------------------------------------------------------------------ */
function getFFVLColor(station: FFVLStation): string {
  if (station.windAvg == null) return '#9ca3af'; // gray — no data
  const w = station.windAvg;
  if (w < 15) return '#22c55e';  // green
  if (w < 25) return '#eab308';  // yellow
  if (w < 35) return '#f97316';  // orange
  return '#ef4444';              // red
}

function buildFFVLFeatures(stations: FFVLStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lng, s.lat],
    },
    properties: {
      id: s.id,
      name: s.name,
      color: getFFVLColor(s),
      altitude: s.altitude,
      departement: s.departement,
      windAvg: s.windAvg,
      windMax: s.windMax,
      windMin: s.windMin,
      windDirection: s.windDirection,
      temperature: s.temperature,
      humidity: s.humidity,
      pressure: s.pressure,
      lastUpdate: s.lastUpdate,
      url: s.url,
      // Arrow angle: direction is where wind comes FROM, ➤ faces right (90°)
      wind_arrow_angle:
        s.windDirection != null && s.windAvg != null
          ? (s.windDirection + 180 - 90 + 360) % 360
          : -1,
      windLabel: s.windAvg != null ? `${Math.round(s.windAvg)}` : '',
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  winds.mobi GeoJSON                                                */
/* ------------------------------------------------------------------ */
function getWindsMobiColor(station: WindsMobiStation): string {
  if (station.status === 'red' || station.windAvg == null) return '#9ca3af'; // gray
  const w = station.windAvg;
  if (w < 15) return '#22c55e';  // green
  if (w < 25) return '#eab308';  // yellow
  if (w < 35) return '#f97316';  // orange
  return '#ef4444';              // red
}

function buildWindsMobiFeatures(stations: WindsMobiStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lng, s.lat],
    },
    properties: {
      id: s.id,
      name: s.name,
      color: getWindsMobiColor(s),
      altitude: s.altitude,
      pvCode: s.pvCode,
      pvName: s.pvName,
      windAvg: s.windAvg,
      windMax: s.windMax,
      windDirection: s.windDirection,
      temperature: s.temperature,
      status: s.status,
      lastUpdate: s.lastUpdate,
      url: s.url,
      // Arrow: direction is where wind comes FROM, ➤ faces right (90°)
      wind_arrow_angle:
        s.windDirection != null && s.windAvg != null && s.status !== 'red'
          ? (s.windDirection + 180 - 90 + 360) % 360
          : -1,
      windLabel:
        s.windAvg != null && s.status !== 'red' ? `${Math.round(s.windAvg)}` : '',
    },
  }));
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
const SRC_POIS = 'parawaze-pois';
const LYR_POI_CIRCLES = 'parawaze-poi-circles';
const LYR_POI_LABELS = 'parawaze-poi-labels';
const SRC_PIOUPIOU = 'parawaze-pioupiou';
const LYR_PIOUPIOU_CIRCLES = 'parawaze-pioupiou-circles';
const LYR_PIOUPIOU_LABELS = 'parawaze-pioupiou-labels';
const LYR_PIOUPIOU_ARROWS = 'parawaze-pioupiou-arrows';
const SRC_FFVL = 'parawaze-ffvl';
const LYR_FFVL_CIRCLES = 'parawaze-ffvl-circles';
const LYR_FFVL_LABELS = 'parawaze-ffvl-labels';
const LYR_FFVL_ARROWS = 'parawaze-ffvl-arrows';
const SRC_WINDS_MOBI = 'parawaze-winds-mobi';
const LYR_WINDS_MOBI_CIRCLES = 'parawaze-winds-mobi-circles';
const LYR_WINDS_MOBI_LABELS = 'parawaze-winds-mobi-labels';
const LYR_WINDS_MOBI_ARROWS = 'parawaze-winds-mobi-arrows';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { reports, shuttles = [], pois = [], pioupiouStations = [], ffvlStations = [], windsMobiStations = [], onReportClick, onShuttleClick, onPoiClick, onMapMove, onMarkerPlaced },
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
  const poisRef = useRef<Poi[]>(pois);
  poisRef.current = pois;
  const onPoiClickRef = useRef(onPoiClick);
  onPoiClickRef.current = onPoiClick;
  const pioupiouRef = useRef<PioupiouStation[]>(pioupiouStations);
  pioupiouRef.current = pioupiouStations;
  const ffvlRef = useRef<FFVLStation[]>(ffvlStations);
  ffvlRef.current = ffvlStations;
  const windsMobiRef = useRef<WindsMobiStation[]>(windsMobiStations);
  windsMobiRef.current = windsMobiStations;
  const popupRef = useRef<mapboxgl.Popup | null>(null);

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
          'circle-opacity': ['get', 'opacity'],
        },
      });
    }

    // Forecast circles — larger with diamond shape stroke to distinguish
    if (!map.getLayer(LYR_FORECAST_CIRCLES)) {
      map.addLayer({
        id: LYR_FORECAST_CIRCLES,
        type: 'circle',
        source: SRC_REPORTS,
        filter: ['==', ['get', 'report_type'], 'forecast'],
        paint: {
          'circle-radius': 16,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#8b5cf6',
          'circle-opacity': ['get', 'opacity'],
        },
      });
    }
    // Forecast "P" label inside the circle
    if (!map.getLayer('parawaze-forecast-label')) {
      map.addLayer({
        id: 'parawaze-forecast-label',
        type: 'symbol',
        source: SRC_REPORTS,
        filter: ['==', ['get', 'report_type'], 'forecast'],
        layout: {
          'text-field': 'P',
          'text-size': 13,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-offset': [0, -0.1],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 1,
          'text-opacity': ['get', 'opacity'],
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
          'text-field': '➤',
          'text-size': 22,
          'text-rotate': ['get', 'wind_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1.5,
          'text-opacity': ['get', 'opacity'],
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
    // --- POIs source ---
    if (!map.getSource(SRC_POIS)) {
      map.addSource(SRC_POIS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // POI circles
    if (!map.getLayer(LYR_POI_CIRCLES)) {
      map.addLayer({
        id: LYR_POI_CIRCLES,
        type: 'circle',
        source: SRC_POIS,
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });
    }

    // POI text labels (A/D/M/W)
    if (!map.getLayer(LYR_POI_LABELS)) {
      map.addLayer({
        id: LYR_POI_LABELS,
        type: 'symbol',
        source: SRC_POIS,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 13,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 1,
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

    // --- Pioupiou source ---
    if (!map.getSource(SRC_PIOUPIOU)) {
      map.addSource(SRC_PIOUPIOU, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Pioupiou circles — small wind station markers
    if (!map.getLayer(LYR_PIOUPIOU_CIRCLES)) {
      map.addLayer({
        id: LYR_PIOUPIOU_CIRCLES,
        type: 'circle',
        source: SRC_PIOUPIOU,
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    // Pioupiou wind speed labels (avg km/h next to station)
    if (!map.getLayer(LYR_PIOUPIOU_LABELS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_LABELS,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        filter: ['!=', ['get', 'windLabel'], ''],
        layout: {
          'text-field': ['get', 'windLabel'],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-offset': [1.2, 0],
          'text-anchor': 'left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }

    // Pioupiou wind direction arrows
    if (!map.getLayer(LYR_PIOUPIOU_ARROWS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_ARROWS,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 14,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.5)',
          'text-halo-width': 1,
        },
      });
    }

    // --- FFVL source ---
    if (!map.getSource(SRC_FFVL)) {
      map.addSource(SRC_FFVL, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // FFVL diamond markers — white fill with colored ring to distinguish from Pioupiou
    if (!map.getLayer(LYR_FFVL_CIRCLES)) {
      map.addLayer({
        id: LYR_FFVL_CIRCLES,
        type: 'circle',
        source: SRC_FFVL,
        paint: {
          'circle-radius': 9,
          'circle-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-stroke-color': ['get', 'color'],
          'circle-opacity': 0.95,
        },
      });
    }

    // FFVL wind speed labels
    if (!map.getLayer(LYR_FFVL_LABELS)) {
      map.addLayer({
        id: LYR_FFVL_LABELS,
        type: 'symbol',
        source: SRC_FFVL,
        filter: ['!=', ['get', 'windLabel'], ''],
        layout: {
          'text-field': ['get', 'windLabel'],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-offset': [1.2, 0],
          'text-anchor': 'left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }

    // FFVL wind direction arrows
    if (!map.getLayer(LYR_FFVL_ARROWS)) {
      map.addLayer({
        id: LYR_FFVL_ARROWS,
        type: 'symbol',
        source: SRC_FFVL,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 13,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(255,255,255,0.8)',
          'text-halo-width': 1,
        },
      });
    }

    // --- winds.mobi source ---
    if (!map.getSource(SRC_WINDS_MOBI)) {
      map.addSource(SRC_WINDS_MOBI, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // winds.mobi markers — colored fill with dark border, distinct from Pioupiou (white border)
    // and FFVL (white fill + colored border)
    if (!map.getLayer(LYR_WINDS_MOBI_CIRCLES)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_CIRCLES,
        type: 'circle',
        source: SRC_WINDS_MOBI,
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(0,0,0,0.55)',
          'circle-opacity': 0.9,
        },
      });
    }

    // winds.mobi wind speed labels
    if (!map.getLayer(LYR_WINDS_MOBI_LABELS)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_LABELS,
        type: 'symbol',
        source: SRC_WINDS_MOBI,
        filter: ['!=', ['get', 'windLabel'], ''],
        layout: {
          'text-field': ['get', 'windLabel'],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-offset': [1.2, 0],
          'text-anchor': 'left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }

    // winds.mobi wind direction arrows
    if (!map.getLayer(LYR_WINDS_MOBI_ARROWS)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_ARROWS,
        type: 'symbol',
        source: SRC_WINDS_MOBI,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 13,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.5)',
          'text-halo-width': 1,
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
          updatePoiSource(map, poisRef.current);
          updatePioupiouSource(map, pioupiouRef.current);
          updateFFVLSource(map, ffvlRef.current);
          updateWindsMobiSource(map, windsMobiRef.current);
          setMapLoaded(true);
        };

        map.on('load', onStyleReady);

        // Re-add layers after style change (style.load fires after setStyle)
        map.on('style.load', () => {
          if (cancelled) return;
          addLayersToMap(map);
          updateReportSource(map, reportsRef.current);
          updateShuttleSource(map, shuttlesRef.current);
          updatePoiSource(map, poisRef.current);
          updatePioupiouSource(map, pioupiouRef.current);
          updateFFVLSource(map, ffvlRef.current);
          updateWindsMobiSource(map, windsMobiRef.current);
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
            layers: [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_PIOUPIOU_CIRCLES, LYR_FFVL_CIRCLES, LYR_WINDS_MOBI_CIRCLES].filter(
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
        map.on('click', LYR_POI_CIRCLES, (e) => {
          if (e.features && e.features[0]) {
            const poiId = e.features[0].properties?.id;
            const poi = poisRef.current.find((p) => p.id === poiId);
            if (poi) onPoiClickRef.current?.(poi);
          }
        });

        // Pioupiou click → show popup
        map.on('click', LYR_PIOUPIOU_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          // Close previous popup
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const isOnline = props.isOnline === true || props.isOnline === 'true';
          const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
          const windMin = props.windMin != null && props.windMin !== '' ? Number(props.windMin) : null;
          const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
          const heading = props.windHeading != null && props.windHeading !== '' ? Number(props.windHeading) : null;

          const dirLabel = heading != null ? `${Math.round(heading)}°` : '—';
          const statusLabel = isOnline ? '🟢 En ligne' : '🔴 Hors ligne';
          const lastUp = props.lastUpdate
            ? new Date(props.lastUpdate).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '—';

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:180px">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">${props.name || 'Pioupiou ' + props.id}</div>
              <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
              <div style="margin-bottom:2px">📉 Min: ${windMin != null ? Math.round(windMin) + ' km/h' : '—'} · 📈 Max: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
              <div style="margin-bottom:2px">🧭 Direction: ${dirLabel}</div>
              <div style="margin-bottom:2px">${statusLabel}</div>
              <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
              <a href="https://www.openwindmap.org/PP${props.id}" target="_blank" rel="noopener"
                 style="color:#0ea5e9;text-decoration:underline;font-size:12px">
                Voir sur OpenWindMap ↗
              </a>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '260px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // FFVL click → show popup
        map.on('click', LYR_FFVL_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
          const windMin = props.windMin != null && props.windMin !== '' ? Number(props.windMin) : null;
          const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
          const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
          const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
          const humidity = props.humidity != null && props.humidity !== '' ? Number(props.humidity) : null;
          const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;

          const lastUp = props.lastUpdate
            ? new Date(props.lastUpdate).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '—';
          const stationUrl = props.url && props.url !== 'null'
            ? props.url
            : `https://www.balisemeteo.com/balise.php?idBalise=${props.id}`;

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || 'FFVL ' + props.id}</div>
              ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m${props.departement && props.departement !== 'null' ? ' · ' + props.departement : ''}</div>` : ''}
              <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
              <div style="margin-bottom:2px">📉 Min: ${windMin != null ? Math.round(windMin) + ' km/h' : '—'} · 📈 Max: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
              <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
              ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
              ${humidity != null ? `<div style="margin-bottom:2px">💧 Humidité: ${Math.round(humidity)} %</div>` : ''}
              <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
              <a href="${stationUrl}" target="_blank" rel="noopener"
                 style="color:#0ea5e9;text-decoration:underline;font-size:12px">
                Voir sur balisemeteo.com ↗
              </a>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // winds.mobi click → show popup
        map.on('click', LYR_WINDS_MOBI_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
          const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
          const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
          const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
          const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;

          const lastUp = props.lastUpdate
            ? new Date(Number(props.lastUpdate) * 1000).toLocaleString('fr-FR', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
              })
            : '—';

          const stationUrl = props.url && props.url !== 'null'
            ? props.url
            : `https://winds.mobi/station/${encodeURIComponent(props.id)}`;

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || props.id}</div>
              ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m · <span style="color:#888">${props.pvName || props.pvCode || ''}</span></div>` : `<div style="color:#888;font-size:12px;margin-bottom:6px">${props.pvName || props.pvCode || ''}</div>`}
              <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
              <div style="margin-bottom:2px">📈 Rafales: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
              <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
              ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
              <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
              <a href="${stationUrl}" target="_blank" rel="noopener"
                 style="color:#0ea5e9;text-decoration:underline;font-size:12px">
                Voir sur winds.mobi ↗
              </a>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // Pointer cursor on interactive layers
        const interactiveLayers = [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_POI_LABELS, LYR_PIOUPIOU_CIRCLES, LYR_PIOUPIOU_LABELS, LYR_FFVL_CIRCLES, LYR_FFVL_LABELS, LYR_WINDS_MOBI_CIRCLES, LYR_WINDS_MOBI_LABELS, 'parawaze-shuttle-label', 'parawaze-forecast-label'];
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

  function updatePoiSource(map: mapboxgl.Map, poiList: Poi[]) {
    const src = map.getSource(SRC_POIS) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildPoiFeatures(poiList) });
    }
  }

  function updatePioupiouSource(map: mapboxgl.Map, stns: PioupiouStation[]) {
    const src = map.getSource(SRC_PIOUPIOU) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildPioupiouFeatures(stns) });
    }
  }

  function updateFFVLSource(map: mapboxgl.Map, stns: FFVLStation[]) {
    const src = map.getSource(SRC_FFVL) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildFFVLFeatures(stns) });
    }
  }

  function updateWindsMobiSource(map: mapboxgl.Map, stns: WindsMobiStation[]) {
    const src = map.getSource(SRC_WINDS_MOBI) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildWindsMobiFeatures(stns) });
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

  // Update report data when reports change (including clearing when switching days)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
    if (!map) return;
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

  // Update POI data when pois change — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_POIS)) {
        updatePoiSource(map, pois);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [pois]);

  // Update Pioupiou data — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_PIOUPIOU)) {
        updatePioupiouSource(map, pioupiouStations);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [pioupiouStations]);

  // Update FFVL data — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_FFVL)) {
        updateFFVLSource(map, ffvlStations);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [ffvlStations]);

  // Update winds.mobi data — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_WINDS_MOBI)) {
        updateWindsMobiSource(map, windsMobiStations);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [windsMobiStations]);

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