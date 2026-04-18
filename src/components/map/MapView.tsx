'use client';

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type MapStyleKey,
} from '@/lib/mapbox';
import type { WeatherReport, Shuttle, WindDirection, Poi, Story, Meetup, MarkerConfig } from '@/lib/types';
import type { PioupiouStation } from '@/hooks/usePioupiou';
import type { FFVLStation } from '@/hooks/useFFVL';
import type { WindsMobiStation } from '@/hooks/useWindsMobi';
import type { GeoSphereStation } from '@/hooks/useGeoSphere';
import type { BrightSkyStation } from '@/hooks/useBrightSky';

// mapbox-gl types only — the actual library is loaded dynamically below
import type mapboxgl from 'mapbox-gl';
import {
  SRC_REPORTS,
  LYR_OBS_CIRCLES,
  LYR_FORECAST_CIRCLES,
  LYR_WIND_ARROWS,
  SRC_SHUTTLES,
  LYR_SHUTTLE_ICONS,
  SRC_POIS,
  LYR_POI_CIRCLES,
  LYR_POI_LABELS,
  SRC_PIOUPIOU,
  LYR_PIOUPIOU_CIRCLES,
  LYR_PIOUPIOU_LABELS,
  LYR_PIOUPIOU_ARROWS,
  SRC_FFVL,
  LYR_FFVL_CIRCLES,
  LYR_FFVL_LABELS,
  LYR_FFVL_ARROWS,
  SRC_WINDS_MOBI,
  LYR_WINDS_MOBI_CIRCLES,
  LYR_WINDS_MOBI_LABELS,
  LYR_WINDS_MOBI_ARROWS,
  SRC_GEOSPHERE,
  LYR_GEOSPHERE_CIRCLES,
  LYR_GEOSPHERE_LABELS,
  LYR_GEOSPHERE_ARROWS,
  SRC_BRIGHTSKY,
  LYR_BRIGHTSKY_CIRCLES,
  LYR_BRIGHTSKY_LABELS,
  LYR_BRIGHTSKY_ARROWS,
  SRC_MEETUPS,
  LYR_MEETUP_CIRCLES,
  LYR_MEETUP_LABELS,
  SRC_STORIES,
  LYR_STORIES_CIRCLES,
  LYR_STORIES_CLUSTERS,
  LYR_STORIES_CLUSTER_COUNT,
  SRC_OBSERVATIONS,
  LYR_OBSERVATIONS_CIRCLES,
} from './mapConstants';
import {
  getConditionColor,
  getWindAngle,
  getAgeOpacity,
  buildReportFeatures,
  buildShuttleFeatures,
  buildPoiFeatures,
  buildMeetupFeatures,
  getPioupiouColor,
  buildPioupiouFeatures,
  getFFVLColor,
  buildFFVLFeatures,
  getWindsMobiColor,
  buildWindsMobiFeatures,
  getGeoSphereColor,
  buildGeoSphereFeatures,
  getBrightSkyColor,
  buildBrightSkyFeatures,
  buildStoryFeatures,
  buildObservationFeatures,
  BS_COMPASS,
  WIND_ANGLE_MAP,
} from './mapFeatures';
import {
  createObservationPopupHTML,
  createForecastPopupHTML,
  createPioupiouPopupHTML,
  createFFVLPopupHTML,
  createWindsMobiPopupHTML,
  createGeoSpherePopupHTML,
  createBrightSkyPopupHTML,
} from './mapPopups';

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
  dayFilter?: 'yesterday' | 'today' | 'tomorrow';
  reports: WeatherReport[];
  shuttles?: Shuttle[];
  pois?: Poi[];
  pioupiouStations?: PioupiouStation[];
  ffvlStations?: FFVLStation[];
  windsMobiStations?: WindsMobiStation[];
  geoSphereStations?: GeoSphereStation[];
  brightSkyStations?: BrightSkyStation[];
  stories?: Story[];
  meetups?: Meetup[];
  markerConfig?: Record<string, MarkerConfig>;
  onObservationsClick?: (reports: WeatherReport[]) => void;
  onMeetupClick?: (meetup: Meetup) => void;
  onShuttleClick?: (shuttle: Shuttle) => void;
  onPoiClick?: (poi: Poi) => void;
  onStoryClick?: (stories: Story[]) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
  onMarkerPlaced?: (pos: MarkerPosition) => void;
  enableAutocenter?: boolean;
  onMapLoaded?: () => void;
}





/* ------------------------------------------------------------------ */
/*  Maki icon loader with caching                                     */
/* ------------------------------------------------------------------ */
const makiIconCache = new Map<string, boolean>();

async function loadMakiIcon(
  map: mapboxgl.Map,
  iconName: string,
  fallbackChar?: string | null,
): Promise<{ useImage: boolean; fallbackChar?: string }> {
  if (!iconName) return { useImage: false };

  const customImageId = iconName + '-custom';
  if (makiIconCache.has(customImageId)) {
    return { useImage: makiIconCache.get(customImageId) === true, fallbackChar: fallbackChar || undefined };
  }

  try {
    const url = `https://raw.githubusercontent.com/mapbox/maki/main/icons/${iconName}.svg`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const svgText = await response.text();

    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Cannot get canvas context');

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 24, 24);
      const imageData = ctx.getImageData(0, 0, 24, 24);
      map.addImage(customImageId, imageData, { sdf: true });
      makiIconCache.set(customImageId, true);
    };
    img.onerror = () => {
      makiIconCache.set(customImageId, false);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
    return { useImage: true, fallbackChar: fallbackChar || undefined };
  } catch (e) {
    console.warn(`[ParaWaze] Failed to load Maki icon ${iconName}:`, e);
    makiIconCache.set(customImageId, false);
    return { useImage: false, fallbackChar: fallbackChar || undefined };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { dayFilter = 'today', reports, shuttles = [], stories = [], pois = [], pioupiouStations = [], ffvlStations = [], windsMobiStations = [], geoSphereStations = [], brightSkyStations = [], meetups = [], markerConfig = {}, onShuttleClick, onPoiClick, onStoryClick, onMeetupClick, onMapMove, onMarkerPlaced, onObservationsClick, onMapLoaded, enableAutocenter = true },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mbRef = useRef<typeof mapboxgl | null>(null);
  const autoCenteredRef = useRef(false);
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
  const geoSphereRef = useRef<GeoSphereStation[]>(geoSphereStations);
  geoSphereRef.current = geoSphereStations;
  const brightSkyRef = useRef<BrightSkyStation[]>(brightSkyStations);
  brightSkyRef.current = brightSkyStations;
  const storyMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const storiesRef = useRef<Story[]>(stories);
  storiesRef.current = stories;
  const onStoryClickRef = useRef(onStoryClick);
  onStoryClickRef.current = onStoryClick;
  const meetupsRef = useRef<Meetup[]>(meetups);
  meetupsRef.current = meetups;
  const onMeetupClickRef = useRef(onMeetupClick);
  onMeetupClickRef.current = onMeetupClick;
  const onObservationsClickRef = useRef(onObservationsClick);
  onObservationsClickRef.current = onObservationsClick;
  const onMapLoadedRef = useRef(onMapLoaded);
  onMapLoadedRef.current = onMapLoaded;
  const dayFilterRef = useRef<'yesterday' | 'today' | 'tomorrow'>(dayFilter);
  dayFilterRef.current = dayFilter;
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markerConfigRef = useRef<Record<string, MarkerConfig>>(markerConfig);
  markerConfigRef.current = markerConfig;

  // GPS location marker
  const gpsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);

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

      // DEBUG: Log incoming click coordinates
      console.log('[ParaWaze DEBUG] Map click received - lng:', lngLat.lng, 'lat:', lngLat.lat);

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
    try {
      // --- Reports source ---
      if (!map.getSource(SRC_REPORTS)) {
        map.addSource(SRC_REPORTS, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to add reports source:', e);
    }

    try {

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
    } catch (e) {
      console.error('[ParaWaze] Failed to add report layers:', e);
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


    // POI takeoff Maki icons inside circles
    const takeoffIconName = markerConfigRef.current['site_takeoff']?.icon_name;
    const takeoffFallback = markerConfigRef.current['site_takeoff']?.icon_unicode || undefined;
    if (takeoffIconName && !map.getLayer('parawaze-takeoff-icon')) {
      loadMakiIcon(map, takeoffIconName, takeoffFallback).then((result) => {
        if (!map.getLayer('parawaze-takeoff-icon')) {
          const iconImageId = result.useImage ? takeoffIconName + '-custom' : undefined;
          map.addLayer({
            id: 'parawaze-takeoff-icon',
            type: 'symbol',
            source: SRC_POIS,
            filter: ['==', ['get', 'poi_type'], 'takeoff'],
            layout: iconImageId
              ? {
                  'icon-image': iconImageId,
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }
              : {
                  'text-field': result.fallbackChar || 'T',
                  'text-size': 13,
                  'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : {
                  'text-color': '#ffffff',
                  'text-halo-color': 'rgba(0,0,0,0.3)',
                  'text-halo-width': 1,
                },
          });
        }
      });
    }

    // POI landing Maki icons inside circles
    const landingIconName = markerConfigRef.current['site_landing']?.icon_name;
    const landingFallback = markerConfigRef.current['site_landing']?.icon_unicode;
    if (landingIconName && !map.getLayer('parawaze-landing-icon')) {
      loadMakiIcon(map, landingIconName, landingFallback).then((result) => {
        if (!map.getLayer('parawaze-landing-icon')) {
          const iconImageId = result.useImage ? landingIconName + '-custom' : undefined;
          map.addLayer({
            id: 'parawaze-landing-icon',
            type: 'symbol',
            source: SRC_POIS,
            filter: ['==', ['get', 'poi_type'], 'landing'],
            layout: iconImageId
              ? {
                  'icon-image': iconImageId,
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }
              : {
                  'text-field': result.fallbackChar || 'L',
                  'text-size': 13,
                  'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : {
                  'text-color': '#ffffff',
                  'text-halo-color': 'rgba(0,0,0,0.3)',
                  'text-halo-width': 1,
                },
          });
        }
      });
    }

    // Shuttle departure Maki icons inside circles
    const shuttleDepIconName = markerConfigRef.current['shuttle_departure']?.icon_name;
    const shuttleDepFallback = markerConfigRef.current['shuttle_departure']?.icon_unicode;
    if (shuttleDepIconName && !map.getLayer('parawaze-shuttle-departure-icon')) {
      loadMakiIcon(map, shuttleDepIconName, shuttleDepFallback).then((result) => {
        if (!map.getLayer('parawaze-shuttle-departure-icon')) {
          const iconImageId = result.useImage ? shuttleDepIconName + '-custom' : undefined;
          map.addLayer({
            id: 'parawaze-shuttle-departure-icon',
            type: 'symbol',
            source: SRC_SHUTTLES,
            filter: ['==', ['get', 'shuttle_role'], 'departure'],
            layout: iconImageId
              ? {
                  'icon-image': iconImageId,
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }
              : {
                  'text-field': result.fallbackChar || 'N',
                  'text-size': 12,
                  'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : {
                  'text-color': '#ffffff',
                  'text-halo-color': 'rgba(0,0,0,0.3)',
                  'text-halo-width': 1,
                },
          });
        }
      });
    }

    // Shuttle arrival Maki icons inside circles
    const shuttleArrIconName = markerConfigRef.current['shuttle_arrival']?.icon_name;
    const shuttleArrFallback = markerConfigRef.current['shuttle_arrival']?.icon_unicode;
    if (shuttleArrIconName && !map.getLayer('parawaze-shuttle-arrival-icon')) {
      loadMakiIcon(map, shuttleArrIconName, shuttleArrFallback).then((result) => {
        if (!map.getLayer('parawaze-shuttle-arrival-icon')) {
          const iconImageId = result.useImage ? shuttleArrIconName + '-custom' : undefined;
          map.addLayer({
            id: 'parawaze-shuttle-arrival-icon',
            type: 'symbol',
            source: SRC_SHUTTLES,
            filter: ['==', ['get', 'shuttle_role'], 'arrival'],
            layout: iconImageId
              ? {
                  'icon-image': iconImageId,
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }
              : {
                  'text-field': result.fallbackChar || 'N',
                  'text-size': 12,
                  'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : {
                  'text-color': '#ffffff',
                  'text-halo-color': 'rgba(0,0,0,0.3)',
                  'text-halo-width': 1,
                },
          });
        }
      });
    }

    // --- Pioupiou source ---
    try {
      if (!map.getSource(SRC_PIOUPIOU)) {
        map.addSource(SRC_PIOUPIOU, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

    // Pioupiou circles
    if (!map.getLayer(LYR_PIOUPIOU_CIRCLES)) {
      map.addLayer({
        id: LYR_PIOUPIOU_CIRCLES,
        type: 'circle',
        source: SRC_PIOUPIOU,
        paint: {
          'circle-radius': 12,
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

    // Pioupiou wind direction arrows (small white arrow inside circle)
    if (!map.getLayer(LYR_PIOUPIOU_ARROWS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_ARROWS,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 15,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 0.5,
        },
      });
    }
    } catch (e) {
      console.error('[ParaWaze] Failed to add Pioupiou source/layers:', e);
    }

    // --- FFVL source ---
    try {
      if (!map.getSource(SRC_FFVL)) {
        map.addSource(SRC_FFVL, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

    // FFVL circles
    if (!map.getLayer(LYR_FFVL_CIRCLES)) {
      map.addLayer({
        id: LYR_FFVL_CIRCLES,
        type: 'circle',
        source: SRC_FFVL,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
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

    // FFVL wind direction arrows (small white arrow inside circle)
    if (!map.getLayer(LYR_FFVL_ARROWS)) {
      map.addLayer({
        id: LYR_FFVL_ARROWS,
        type: 'symbol',
        source: SRC_FFVL,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 15,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 0.5,
        },
      });
    }
    } catch (e) {
      console.error('[ParaWaze] Failed to add FFVL source/layers:', e);
    }

    // --- winds.mobi source ---
    try {
      if (!map.getSource(SRC_WINDS_MOBI)) {
        map.addSource(SRC_WINDS_MOBI, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

    // winds.mobi circles
    if (!map.getLayer(LYR_WINDS_MOBI_CIRCLES)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_CIRCLES,
        type: 'circle',
        source: SRC_WINDS_MOBI,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
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
          'text-size': 15,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 0.5,
        },
      });
    }
    } catch (e) {
      console.error('[ParaWaze] Failed to add Winds Mobi source/layers:', e);
    }

    // --- GeoSphere Austria source ---
    try {
      if (!map.getSource(SRC_GEOSPHERE)) {
        map.addSource(SRC_GEOSPHERE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // --- Bright Sky (DWD) source ---
      if (!map.getSource(SRC_BRIGHTSKY)) {
        map.addSource(SRC_BRIGHTSKY, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

    // GeoSphere circles
    if (!map.getLayer(LYR_GEOSPHERE_CIRCLES)) {
      map.addLayer({
        id: LYR_GEOSPHERE_CIRCLES,
        type: 'circle',
        source: SRC_GEOSPHERE,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    // Bright Sky circles
    if (!map.getLayer(LYR_BRIGHTSKY_CIRCLES)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_CIRCLES,
        type: 'circle',
        source: SRC_BRIGHTSKY,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    // GeoSphere wind speed labels
    if (!map.getLayer(LYR_GEOSPHERE_LABELS)) {
      map.addLayer({
        id: LYR_GEOSPHERE_LABELS,
        type: 'symbol',
        source: SRC_GEOSPHERE,
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

    // Bright Sky wind speed labels
    if (!map.getLayer(LYR_BRIGHTSKY_LABELS)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_LABELS,
        type: 'symbol',
        source: SRC_BRIGHTSKY,
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

    // GeoSphere wind direction arrows
    if (!map.getLayer(LYR_GEOSPHERE_ARROWS)) {
      map.addLayer({
        id: LYR_GEOSPHERE_ARROWS,
        type: 'symbol',
        source: SRC_GEOSPHERE,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 15,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 0.5,
        },
      });
    }

    // Bright Sky wind direction arrows
    if (!map.getLayer(LYR_BRIGHTSKY_ARROWS)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_ARROWS,
        type: 'symbol',
        source: SRC_BRIGHTSKY,
        filter: ['!=', ['get', 'wind_arrow_angle'], -1],
        layout: {
          'text-field': '➤',
          'text-size': 15,
          'text-rotate': ['get', 'wind_arrow_angle'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.3)',
          'text-halo-width': 0.5,
        },
      });
    }
    } catch (e) {
      console.error('[ParaWaze] Failed to add GeoSphere/BrightSky source/layers:', e);
    }

    // --- Meetups source ---
    if (!map.getSource(SRC_MEETUPS)) {
      map.addSource(SRC_MEETUPS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Meetup circles — amber/orange
    const meetupColor = markerConfigRef.current['meetup']?.color || '#F59E0B';
    if (!map.getLayer(LYR_MEETUP_CIRCLES)) {
      map.addLayer({
        id: LYR_MEETUP_CIRCLES,
        type: 'circle',
        source: SRC_MEETUPS,
        paint: {
          'circle-radius': 14,
          'circle-color': meetupColor,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });
    }

    // Meetup Maki icons inside circles
    const meetupIconName = markerConfigRef.current['meetup']?.icon_name;
    const meetupFallback = markerConfigRef.current['meetup']?.icon_unicode || '👥';
    if (meetupIconName && !map.getLayer('parawaze-meetup-icon')) {
      loadMakiIcon(map, meetupIconName, meetupFallback).then((result) => {
        if (!map.getLayer('parawaze-meetup-icon')) {
          const iconImageId = result.useImage ? meetupIconName + '-custom' : undefined;
          map.addLayer({
            id: 'parawaze-meetup-icon',
            type: 'symbol',
            source: SRC_MEETUPS,
            layout: iconImageId
              ? {
                  'icon-image': iconImageId,
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-ignore-placement': true,
                }
              : {
                  'text-field': ['get', 'label'],
                  'text-size': 11,
                  'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : {
                  'text-color': '#ffffff',
                  'text-halo-color': 'rgba(0,0,0,0.3)',
                  'text-halo-width': 1,
                },
          });
        }
      });
    }

    // --- Stories source with clustering ---
    try {
      if (!map.getSource(SRC_STORIES)) {
        map.addSource(SRC_STORIES, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 30,
          clusterMaxZoom: 20,
        });
      }

      // Story cluster circles (pink) — fixed size 20
      const storyColor = markerConfigRef.current['story']?.color || '#EC4899';
      if (!map.getLayer(LYR_STORIES_CLUSTERS)) {
        map.addLayer({
          id: LYR_STORIES_CLUSTERS,
          type: 'circle',
          source: SRC_STORIES,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': storyColor,
            'circle-radius': 20,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });
      }

      // Story cluster count label
      if (!map.getLayer(LYR_STORIES_CLUSTER_COUNT)) {
        map.addLayer({
          id: LYR_STORIES_CLUSTER_COUNT,
          type: 'symbol',
          source: SRC_STORIES,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 13,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      // Individual story circles (pink) — only non-clustered points
      if (!map.getLayer(LYR_STORIES_CIRCLES)) {
        map.addLayer({
          id: LYR_STORIES_CIRCLES,
          type: 'circle',
          source: SRC_STORIES,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': storyColor,
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });
      }

      // Story Maki icons inside circles
      const storyIconName = markerConfigRef.current['story']?.icon_name;
      const storyFallback = markerConfigRef.current['story']?.icon_unicode;
      if (storyIconName && !map.getLayer('parawaze-stories-icon')) {
        loadMakiIcon(map, storyIconName, storyFallback).then((result) => {
          if (!map.getLayer('parawaze-stories-icon')) {
            const iconImageId = result.useImage ? storyIconName + '-custom' : undefined;
            map.addLayer({
              id: 'parawaze-stories-icon',
              type: 'symbol',
              source: SRC_STORIES,
              filter: ['!', ['has', 'point_count']],
              layout: iconImageId
                ? {
                    'icon-image': iconImageId,
                    'icon-size': 1,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  }
                : {
                    'text-field': result.fallbackChar || '📖',
                    'text-size': 13,
                    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                  },
              paint: iconImageId
                ? { 'icon-color': '#FFFFFF' }
                : {
                    'text-color': '#ffffff',
                    'text-halo-color': 'rgba(0,0,0,0.3)',
                    'text-halo-width': 1,
                  },
            });
          }
        });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to add stories source/layers:', e);
    }

    // --- Observations source with clustering ---
    try {
      if (!map.getSource(SRC_OBSERVATIONS)) {
        map.addSource(SRC_OBSERVATIONS, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Observation circles (colored by wind speed)
      if (!map.getLayer(LYR_OBSERVATIONS_CIRCLES)) {
        map.addLayer({
          id: LYR_OBSERVATIONS_CIRCLES,
          type: 'circle',
          source: SRC_OBSERVATIONS,
          paint: {
            'circle-color': [
              'step',
              ['coalesce', ['get', 'wind_speed_kmh'], -1],
              '#3B82F6', // blue default if no wind data
              0,
              '#22c55e', // green < 15
              15,
              '#84cc16', // yellow-green 15-25
              25,
              '#eab308', // yellow 25-35
              35,
              '#f97316', // orange 35-45
              45,
              '#ef4444', // red 45+
            ],
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });
      }

      // Observation wind direction arrows
      if (!map.getLayer('parawaze-observations-wind-arrows')) {
        map.addLayer({
          id: 'parawaze-observations-wind-arrows',
          type: 'symbol',
          source: SRC_OBSERVATIONS,
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': '➤',
            'text-size': 15,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'map',
            'text-rotate': [
              'case',
              ['!=', ['get', 'wind_speed_kmh'], null],
              ['case',
                ['==', ['get', 'wind_direction'], 'N'], 0,
                ['==', ['get', 'wind_direction'], 'NE'], 45,
                ['==', ['get', 'wind_direction'], 'E'], 90,
                ['==', ['get', 'wind_direction'], 'SE'], 135,
                ['==', ['get', 'wind_direction'], 'S'], 180,
                ['==', ['get', 'wind_direction'], 'SW'], 225,
                ['==', ['get', 'wind_direction'], 'W'], 270,
                ['==', ['get', 'wind_direction'], 'NW'], 315,
                0,
              ],
              0,
            ],
            'text-allow-overlap': true,
            'icon-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 0.5,
          },
        });
      }

      // Observation Maki icons inside circles
      const obsIconName = markerConfigRef.current['observation']?.icon_name;
      const obsFallback = markerConfigRef.current['observation']?.icon_unicode;
      if (obsIconName && !map.getLayer('parawaze-observations-icon')) {
        loadMakiIcon(map, obsIconName, obsFallback).then((result) => {
          if (!map.getLayer('parawaze-observations-icon')) {
            const iconImageId = result.useImage ? obsIconName + '-custom' : undefined;
            map.addLayer({
              id: 'parawaze-observations-icon',
              type: 'symbol',
              source: SRC_OBSERVATIONS,
              filter: ['!', ['has', 'point_count']],
              layout: iconImageId
                ? {
                    'icon-image': iconImageId,
                    'icon-size': 1,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  }
                : {
                    'text-field': result.fallbackChar || '🌤️',
                    'text-size': 13,
                    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                  },
              paint: iconImageId
                ? { 'icon-color': '#FFFFFF' }
                : {
                    'text-color': '#ffffff',
                    'text-halo-color': 'rgba(0,0,0,0.3)',
                    'text-halo-width': 1,
                  },
            });
          }
        });
      }

      // Observations cluster circles (blue) — fixed size 20
    } catch (e) {
      console.error('[ParaWaze] Failed to add observations source/layers:', e);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Apply day filter styling to layers                              */
  /* ---------------------------------------------------------------- */
  const applyDayFilter = useCallback((map: mapboxgl.Map) => {
    const filter = dayFilterRef.current;

    // Hide stories and observations when not showing today
    const hideStories = filter !== 'today';
    const hideObservations = filter !== 'today';

    // Set visibility for story layers
    [LYR_STORIES_CIRCLES, LYR_STORIES_CLUSTERS, LYR_STORIES_CLUSTER_COUNT].forEach((layer) => {
      try {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, 'visibility', hideStories ? 'none' : 'visible');
        }
      } catch (e) {
        // Layer might not exist yet
      }
    });

    // Set visibility for observation layers
    [LYR_OBSERVATIONS_CIRCLES, 'parawaze-observations-wind-arrows'].forEach((layer) => {
      try {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, 'visibility', hideObservations ? 'none' : 'visible');
        }
      } catch (e) {
        // Layer might not exist yet
      }
    });

    // Update station styling based on whether showing today or future/past
    const showingToday = filter === 'today';
    const stationLayers = [
      { circles: LYR_PIOUPIOU_CIRCLES, labels: LYR_PIOUPIOU_LABELS, arrows: LYR_PIOUPIOU_ARROWS },
      { circles: 'parawaze-ffvl-circles', labels: 'parawaze-ffvl-labels', arrows: 'parawaze-ffvl-arrows' },
      { circles: 'parawaze-winds-mobi-circles', labels: 'parawaze-winds-mobi-labels', arrows: 'parawaze-winds-mobi-arrows' },
      { circles: 'parawaze-geosphere-circles', labels: 'parawaze-geosphere-labels', arrows: 'parawaze-geosphere-arrows' },
      { circles: 'parawaze-brightsky-circles', labels: 'parawaze-brightsky-labels', arrows: 'parawaze-brightsky-arrows' },
    ];

    stationLayers.forEach(({ circles, labels, arrows }) => {
      try {
        if (map.getLayer(circles)) {
          if (showingToday) {
            // Restore normal display: colored circles with data
            // Restore paint properties to show wind-based colors from feature data
            map.setPaintProperty(circles, 'circle-color', ['get', 'color']);
            map.setPaintProperty(circles, 'circle-stroke-color', '#ffffff');
            map.setPaintProperty(circles, 'circle-stroke-width', 2);
            map.setPaintProperty(circles, 'circle-opacity', 0.9);
            // Restore visibility of labels and arrows
            if (map.getLayer(labels)) {
              map.setLayoutProperty(labels, 'visibility', 'visible');
            }
            if (map.getLayer(arrows)) {
              map.setLayoutProperty(arrows, 'visibility', 'visible');
            }
          } else {
            // Show outline-only circles for future/past dates
            map.setPaintProperty(circles, 'circle-color', '#f5f5f5'); // Very light gray fill
            map.setPaintProperty(circles, 'circle-stroke-color', '#aaaaaa'); // Medium gray stroke
            map.setPaintProperty(circles, 'circle-stroke-width', 1.5);
            map.setPaintProperty(circles, 'circle-opacity', 0.6);
            // Hide labels and arrows for non-today dates
            if (map.getLayer(labels)) {
              map.setLayoutProperty(labels, 'visibility', 'none');
            }
            if (map.getLayer(arrows)) {
              map.setLayoutProperty(arrows, 'visibility', 'none');
            }
          }
        }
      } catch (e) {
        // Layer might not exist yet
      }
    });
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

        // Check if WebGL is supported
        if (!mb.supported()) {
          throw new Error('Votre navigateur ne supporte pas WebGL. Essayez de fermer d\'autres onglets ou utilisez Chrome.');
        }

        // Prewarm the map if available
        if (typeof mb.prewarm === 'function') {
          mb.prewarm();
        }

        mb.accessToken = MAPBOX_TOKEN;
        mbRef.current = mb;

        const map = new mb.Map({
          container: mapContainer.current!,
          style: MAP_STYLES[mapStyle],
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
          maxTileCacheSize: 50, // Reduce GPU memory usage
          fadeDuration: 0, // Reduce GPU memory pressure
        });

        map.addControl(new mb.AttributionControl({ compact: true }), 'bottom-left');

        // Handle map errors gracefully
        map.on('error', (e) => {
          console.error('[ParaWaze] Map error:', e?.error?.message || e);
          // Don't set error state on every map error - map might recover
          // Only log to console for debugging
        });

        const onStyleReady = () => {
          if (cancelled) return;
          addLayersToMap(map);
          // Populate with current data
          updateReportSource(map, reportsRef.current);
          updateStoriesSource(map, storiesRef.current);
          updateObservationsSource(map, reportsRef.current);
          updateShuttleSource(map, shuttlesRef.current);
          updatePoiSource(map, poisRef.current);
          updatePioupiouSource(map, pioupiouRef.current);
          updateFFVLSource(map, ffvlRef.current);
          updateWindsMobiSource(map, windsMobiRef.current);
          updateGeoSphereSource(map, geoSphereRef.current);
          updateBrightSkySource(map, brightSkyRef.current);
          updateMeetupSource(map, meetupsRef.current);
          // Apply day filter styling
          applyDayFilter(map);
          setMapLoaded(true);
          // Call onMapLoaded callback to notify parent that map is ready
          onMapLoadedRef.current?.();
        };

        map.on('load', onStyleReady);

        // Re-add layers after style change (style.load fires after setStyle)
        map.on('style.load', () => {
          if (cancelled) return;
          addLayersToMap(map);
          updateReportSource(map, reportsRef.current);
          updateStoriesSource(map, storiesRef.current);
          updateObservationsSource(map, reportsRef.current);
          updateShuttleSource(map, shuttlesRef.current);
          updatePoiSource(map, poisRef.current);
          updatePioupiouSource(map, pioupiouRef.current);
          updateFFVLSource(map, ffvlRef.current);
          updateWindsMobiSource(map, windsMobiRef.current);
          updateGeoSphereSource(map, geoSphereRef.current);
          updateBrightSkySource(map, brightSkyRef.current);
          updateMeetupSource(map, meetupsRef.current);
          // Apply day filter styling
          applyDayFilter(map);
          // Re-add shuttle route lines
          addShuttleRouteLines(map, shuttlesRef.current);
          // Re-add GPS marker if it existed
          if (gpsMarkerRef.current) {
            const lngLat = gpsMarkerRef.current.getLngLat();
            gpsMarkerRef.current.remove();
            gpsMarkerRef.current = null;
            // Marker will be re-created by the GPS tracking useEffect
          }
          // Call onMapLoaded callback to notify parent that map is ready
          onMapLoadedRef.current?.();
        });

        map.on('moveend', () => {
          const center = map.getCenter();
          onMapMove?.({ lat: center.lat, lng: center.lng });
        });

        // Tap-to-place: map click (ignoring clicks on GeoJSON layers)
        map.on('click', (e) => {
          // Check if the click was on one of our layers
          const layerFeatures = map.queryRenderedFeatures(e.point, {
            layers: [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_PIOUPIOU_CIRCLES, LYR_FFVL_CIRCLES, LYR_WINDS_MOBI_CIRCLES, LYR_GEOSPHERE_CIRCLES, LYR_BRIGHTSKY_CIRCLES, LYR_MEETUP_CIRCLES].filter(
              (l) => !!map.getLayer(l),
            ),
          });
          if (layerFeatures.length > 0) return; // handled by layer click
          // Also ignore clicks on native placement marker
          const target = e.originalEvent.target as HTMLElement;
          if (target?.closest('.mapboxgl-marker')) return;

          // DEBUG: Log raw Mapbox event before processing
          console.log('[ParaWaze DEBUG] Mapbox click event - e.lngLat:', e.lngLat, 'e.lngLat.lng:', e.lngLat.lng, 'e.lngLat.lat:', e.lngLat.lat);
          placeMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });

        // --- Click handlers for GeoJSON layers ---
        map.on('click', LYR_OBS_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const reportType = props.report_type || 'observation';
          const windSpeed = props.wind_speed_kmh != null ? Number(props.wind_speed_kmh) : null;
          const windGust = props.wind_gust_kmh != null ? Number(props.wind_gust_kmh) : null;
          const windDir = props.wind_direction != null ? props.wind_direction : null;
          const thermal = props.thermal_quality != null ? Number(props.thermal_quality) : null;
          const location = props.location_name || '—';
          const altitude = props.altitude_m ? ` · ${props.altitude_m}m` : '';
          const createdAt = props.created_at
            ? new Date(props.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '—';

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:220px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">👁️ ${reportType === 'observation' ? 'Observation' : reportType === 'forecast' ? 'Prévision' : 'Partage'}</div>
              ${props.author ? `<div style="color:#666;font-size:12px;margin-bottom:6px">par ${props.author}</div>` : ''}
              <div style="color:#555;font-size:12px;margin-bottom:4px">${location}${altitude}</div>
              ${windSpeed != null ? `<div style="margin-bottom:2px">💨 Vent: <b>${Math.round(windSpeed)} km/h</b></div>` : ''}
              ${windGust != null ? `<div style="margin-bottom:2px">🌪️ Rafales: ${Math.round(windGust)} km/h</div>` : ''}
              ${windDir != null ? `<div style="margin-bottom:2px">🧭 Direction: ${windDir}</div>` : ''}
              ${thermal != null ? `<div style="margin-bottom:2px">📈 Thermique: ${thermal.toFixed(1)}m/s</div>` : ''}
              ${props.description && props.description !== 'null' ? `<div style="margin-bottom:6px;color:#555;font-size:12px"><i>${props.description.substring(0, 100)}${props.description.length > 100 ? '…' : ''}</i></div>` : ''}
              <div style="margin-bottom:2px;color:#666;font-size:11px">🕐 ${createdAt}</div>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });
        map.on('click', LYR_FORECAST_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const windSpeed = props.wind_speed_kmh != null ? Number(props.wind_speed_kmh) : null;
          const windGust = props.wind_gust_kmh != null ? Number(props.wind_gust_kmh) : null;
          const windDir = props.wind_direction != null ? props.wind_direction : null;
          const location = props.location_name || '—';
          const altitude = props.altitude_m ? ` · ${props.altitude_m}m` : '';
          const createdAt = props.created_at
            ? new Date(props.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '—';

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:220px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">📊 Prévision</div>
              ${props.author ? `<div style="color:#666;font-size:12px;margin-bottom:6px">par ${props.author}</div>` : ''}
              <div style="color:#555;font-size:12px;margin-bottom:4px">${location}${altitude}</div>
              ${windSpeed != null ? `<div style="margin-bottom:2px">💨 Vent: <b>${Math.round(windSpeed)} km/h</b></div>` : ''}
              ${windGust != null ? `<div style="margin-bottom:2px">🌪️ Rafales: ${Math.round(windGust)} km/h</div>` : ''}
              ${windDir != null ? `<div style="margin-bottom:2px">🧭 Direction: ${windDir}</div>` : ''}
              <div style="margin-bottom:2px;color:#666;font-size:11px">🕐 ${createdAt}</div>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
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

        map.on('click', LYR_MEETUP_CIRCLES, (e) => {
          if (e.features && e.features[0]) {
            const meetupId = e.features[0].properties?.id;
            const meetup = meetupsRef.current.find((m) => m.id === meetupId);
            if (meetup) onMeetupClickRef.current?.(meetup);
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

          // Show minimal popup for non-today dates, full popup for today
          let html: string;
          if (dayFilterRef.current !== 'today') {
            // Minimal popup: name only
            html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || 'Pioupiou ' + props.id}</b></div>`;
          } else {
            // Full popup with all data
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

            html = `
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
          }

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

          let html: string;
          if (dayFilterRef.current !== 'today') {
            // Minimal popup: name only
            html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || 'FFVL ' + props.id}</b></div>`;
          } else {
            // Full popup with all data
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

            html = `
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
          }

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

          let html: string;
          if (dayFilterRef.current !== 'today') {
            // Minimal popup: name only
            html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || props.id}</b></div>`;
          } else {
            // Full popup with all data
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

            html = `
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
          }

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // GeoSphere Austria click → show popup
        map.on('click', LYR_GEOSPHERE_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          let html: string;
          if (dayFilterRef.current !== 'today') {
            // Minimal popup: name only
            html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || props.id}</b></div>`;
          } else {
            // Full popup with all data
            const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
            const windGust = props.windGust != null && props.windGust !== '' ? Number(props.windGust) : null;
            const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
            const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
            const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;
            const state = props.state && props.state !== 'null' ? props.state : null;

            const lastUp = props.timestamp
              ? new Date(props.timestamp).toLocaleString('fr-FR', {
                  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
                })
              : '—';

            html = `
              <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
                <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || props.id}</div>
                <div style="color:#6366f1;font-size:11px;font-weight:600;letter-spacing:0.03em;margin-bottom:4px">GeoSphere Austria</div>
                ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m${state ? ' · ' + state : ''}</div>` : (state ? `<div style="color:#666;font-size:12px;margin-bottom:6px">${state}</div>` : '')}
                <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
                <div style="margin-bottom:2px">📈 Rafales: ${windGust != null ? Math.round(windGust) + ' km/h' : '—'}</div>
                <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
                ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
                <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
                <a href="https://geosphere.at" target="_blank" rel="noopener"
                   style="color:#6366f1;text-decoration:underline;font-size:12px">
                  GeoSphere Austria ↗
                </a>
              </div>
            `;
          }

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // Bright Sky (DWD) click → show popup
        map.on('click', LYR_BRIGHTSKY_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          let html: string;
          if (dayFilterRef.current !== 'today') {
            // Minimal popup: name only
            html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name}</b></div>`;
          } else {
            // Full popup with all data
            const dirLabel = props.windDirection != null
              ? BS_COMPASS[Math.round(Number(props.windDirection) / 22.5) % 16]
              : '—';
            const timeLabel = props.timestamp
              ? new Date(props.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '';
            const demoUrl = `https://brightsky.dev/demo/#lat=${props.lat}&lon=${props.lon}&zoom=12`;

            html = `
              <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
                <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name}</div>
                ${props.altitude != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${props.altitude} m · DWD via Bright Sky</div>` : ''}
                <div style="margin-bottom:2px">💨 Vent moy: <b>${Math.round(Number(props.windAvg))} km/h</b></div>
                <div style="margin-bottom:2px">📈 Rafale: ${props.windGust != null ? Math.round(Number(props.windGust)) + ' km/h' : '—'}</div>
                <div style="margin-bottom:2px">🧭 Direction: ${dirLabel} · ${props.windDirection != null ? Math.round(Number(props.windDirection)) + '°' : '—'}</div>
                ${props.temperature != null ? `<div style="margin-bottom:2px">🌡️ Température: ${Number(props.temperature).toFixed(1)} °C</div>` : ''}
                ${timeLabel ? `<div style="margin-bottom:6px;color:#666">🕐 Obs. ${timeLabel}</div>` : ''}
                <a href="${demoUrl}" target="_blank" rel="noopener"
                   style="color:#0ea5e9;text-decoration:underline;font-size:12px">
                  Voir sur Bright Sky ↗
                </a>
              </div>
            `;
          }

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // Individual story click
        map.on('click', LYR_STORIES_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const storyId = e.features[0].properties?.id;
          if (!storyId) return;
          const story = storiesRef.current.find((s) => s.id === storyId);
          if (story) {
            onStoryClickRef.current?.([story]);
          }
        });

        // Individual observation click
        map.on('click', LYR_OBSERVATIONS_CIRCLES, (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;
          const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];

          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          const reportType = props.report_type || 'observation';
          const windSpeed = props.wind_speed_kmh != null ? Number(props.wind_speed_kmh) : null;
          const windGust = props.wind_gust_kmh != null ? Number(props.wind_gust_kmh) : null;
          const windDir = props.wind_direction != null ? props.wind_direction : null;
          const thermal = props.thermal_quality != null ? Number(props.thermal_quality) : null;
          const location = props.location_name || '—';
          const altitude = props.altitude_m ? ` · ${props.altitude_m}m` : '';
          const createdAt = props.created_at
            ? new Date(props.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '—';

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:220px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">👁️ ${reportType === 'observation' ? 'Observation' : reportType === 'forecast' ? 'Prévision' : 'Partage'}</div>
              ${props.author ? `<div style="color:#666;font-size:12px;margin-bottom:6px">par ${props.author}</div>` : ''}
              <div style="color:#555;font-size:12px;margin-bottom:4px">${location}${altitude}</div>
              ${windSpeed != null ? `<div style="margin-bottom:2px">💨 Vent: <b>${Math.round(windSpeed)} km/h</b></div>` : ''}
              ${windGust != null ? `<div style="margin-bottom:2px">🌪️ Rafales: ${Math.round(windGust)} km/h</div>` : ''}
              ${windDir != null ? `<div style="margin-bottom:2px">🧭 Direction: ${windDir}</div>` : ''}
              ${thermal != null ? `<div style="margin-bottom:2px">📈 Thermique: ${thermal.toFixed(1)}m/s</div>` : ''}
              ${props.description && props.description !== 'null' ? `<div style="margin-bottom:6px;color:#555;font-size:12px"><i>${props.description.substring(0, 100)}${props.description.length > 100 ? '…' : ''}</i></div>` : ''}
              <div style="margin-bottom:2px;color:#666;font-size:11px">🕐 ${createdAt}</div>
            </div>
          `;

          const popup = new mb.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // Stories cluster click — expand cluster into constituent stories
        map.on('click', LYR_STORIES_CLUSTERS, (e) => {
          if (!e.features || !e.features[0]) return;
          const clusterId = e.features[0].properties?.cluster_id;
          if (clusterId == null) return;
          const src = map.getSource(SRC_STORIES) as mapboxgl.GeoJSONSource | undefined;
          if (!src) return;
          src.getClusterLeaves(clusterId, Infinity, 0, (err, leaves) => {
            if (err || !leaves) return;
            const ids = leaves.map((f) => f.properties?.id).filter(Boolean) as string[];
            const found = ids.map((id) => storiesRef.current.find((s) => s.id === id)).filter(Boolean) as Story[];
            if (found.length > 0) {
              onStoryClickRef.current?.(found);
            }
          });
        });

        // Pointer cursor on interactive layers
        const interactiveLayers = [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_POI_LABELS, LYR_PIOUPIOU_CIRCLES, LYR_PIOUPIOU_LABELS, LYR_FFVL_CIRCLES, LYR_FFVL_LABELS, LYR_WINDS_MOBI_CIRCLES, LYR_WINDS_MOBI_LABELS, LYR_GEOSPHERE_CIRCLES, LYR_GEOSPHERE_LABELS, LYR_BRIGHTSKY_CIRCLES, LYR_BRIGHTSKY_LABELS, LYR_MEETUP_CIRCLES, LYR_MEETUP_LABELS, LYR_STORIES_CIRCLES, LYR_STORIES_CLUSTERS, LYR_OBSERVATIONS_CIRCLES, 'parawaze-shuttle-label', 'parawaze-forecast-label'];
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

  function deduplicateObservations(features: GeoJSON.Feature[]): GeoJSON.Feature[] {
    // Sort newest first
    const sorted = [...features].sort((a, b) => {
      const ta = new Date(a.properties?.created_at || 0).getTime();
      const tb = new Date(b.properties?.created_at || 0).getTime();
      return tb - ta;
    });

    const kept: GeoJSON.Feature[] = [];
    for (const f of sorted) {
      const [lng, lat] = (f.geometry as any).coordinates;
      // DEBUG: Log first deduped observation
      if (kept.length === 0) {
        console.log('[ParaWaze DEBUG] First observation after dedup - lng:', lng, 'lat:', lat, 'location_name:', f.properties?.location_name);
      }
      const tooClose = kept.some(k => {
        const [klng, klat] = (k.geometry as any).coordinates;
        return Math.abs(lng - klng) < 0.002 && Math.abs(lat - klat) < 0.002;
      });
      if (!tooClose) kept.push(f);
    }
    return kept;
  }

  function updateReportSource(map: mapboxgl.Map, rpts: WeatherReport[]) {
    const src = map.getSource(SRC_REPORTS) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildReportFeatures(rpts) });
    }
  }

  function updateStoriesSource(map: mapboxgl.Map, storyList: Story[]) {
    const src = map.getSource(SRC_STORIES) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildStoryFeatures(storyList) });
    }
  }

  function updateObservationsSource(map: mapboxgl.Map, reportList: WeatherReport[]) {
    const src = map.getSource(SRC_OBSERVATIONS) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      const allFeatures = buildObservationFeatures(reportList);
      const deduplicatedFeatures = deduplicateObservations(allFeatures);
      src.setData({ type: 'FeatureCollection', features: deduplicatedFeatures });
    }
  }

  function updateShuttleSource(map: mapboxgl.Map, sht: Shuttle[]) {
    const features = buildShuttleFeatures(sht, markerConfigRef.current);
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
      src.setData({ type: 'FeatureCollection', features: buildPoiFeatures(poiList, markerConfigRef.current) });
    }
  }

  function updatePioupiouSource(map: mapboxgl.Map, stns: PioupiouStation[]) {
    try {
      const src = map.getSource(SRC_PIOUPIOU) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: buildPioupiouFeatures(stns) });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to update Pioupiou source:', e);
    }
  }

  function updateFFVLSource(map: mapboxgl.Map, stns: FFVLStation[]) {
    try {
      const src = map.getSource(SRC_FFVL) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: buildFFVLFeatures(stns) });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to update FFVL source:', e);
    }
  }

  function updateWindsMobiSource(map: mapboxgl.Map, stns: WindsMobiStation[]) {
    try {
      const src = map.getSource(SRC_WINDS_MOBI) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: buildWindsMobiFeatures(stns) });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to update Winds Mobi source:', e);
    }
  }

  function updateGeoSphereSource(map: mapboxgl.Map, stns: GeoSphereStation[]) {
    try {
      const src = map.getSource(SRC_GEOSPHERE) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: buildGeoSphereFeatures(stns) });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to update GeoSphere source:', e);
    }
  }

  function updateBrightSkySource(map: mapboxgl.Map, stns: BrightSkyStation[]) {
    try {
      const src = map.getSource(SRC_BRIGHTSKY) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: buildBrightSkyFeatures(stns) });
      }
    } catch (e) {
      console.error('[ParaWaze] Failed to update BrightSky source:', e);
    }
  }

  function updateMeetupSource(map: mapboxgl.Map, mts: Meetup[]) {
    const src = map.getSource(SRC_MEETUPS) as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features: buildMeetupFeatures(mts) });
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
      if (map.getSource(SRC_OBSERVATIONS)) {
        updateObservationsSource(map, reports);
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

  // Update GeoSphere Austria data — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_GEOSPHERE)) {
        updateGeoSphereSource(map, geoSphereStations);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [geoSphereStations]);

  // Update Bright Sky (DWD) data — always visible regardless of day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_BRIGHTSKY)) {
        updateBrightSkySource(map, brightSkyStations);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [brightSkyStations]);

  // Update meetup markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_MEETUPS)) {
        updateMeetupSource(map, meetups);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [meetups]);

  /* ---------------------------------------------------------------- */
  /*  Update stories GeoJSON source (clustering)                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_STORIES)) {
        updateStoriesSource(map, stories);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [stories]); // Only update when stories array changes

  // Update mixed source (stories + observations clustering) when stories change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      if (map.getSource(SRC_STORIES)) {
        updateStoriesSource(map, stories);
      }
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [stories]);

  // Apply day filter styling when dayFilter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const doUpdate = () => {
      applyDayFilter(map);
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('idle', doUpdate);
    }
  }, [dayFilter, applyDayFilter]);

  /* ---------------------------------------------------------------- */
  /*  Utility callbacks                                               */
  /* ---------------------------------------------------------------- */
  const flyToLocation = useCallback((lng: number, lat: number, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 });
  }, []);

  const locateMe = useCallback(() => {
    try {
      if (!navigator?.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            if (pos?.coords) {
              flyToLocation(pos.coords.longitude, pos.coords.latitude, 12);
            }
          } catch (e) {
            // Silently fail if flyToLocation throws
            console.debug('Geolocation: flyToLocation error', e);
          }
        },
        (error) => {
          // Silently handle permission denied, timeout, or other errors
          console.debug('Geolocation error:', error?.code, error?.message);
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
    } catch (e) {
      // Silently fail if getCurrentPosition throws
      console.debug('Geolocation: getCurrentPosition error', e);
    }
  }, [flyToLocation]);

  // Auto-center on GPS when map first loads (only once, on initial load)
  useEffect(() => {
    if (enableAutocenter && mapLoaded && !autoCenteredRef.current) {
      autoCenteredRef.current = true;
      try {
        locateMe();
      } catch (e) {
        // Silently fail if locateMe throws
        console.debug('Auto-center geolocation error:', e);
      }
    }
  }, [enableAutocenter, mapLoaded, locateMe]);

  // Continuous GPS tracking with pulsing marker
  useEffect(() => {
    if (!mapRef.current || !mbRef.current) return;

    const map = mapRef.current;
    const mb = mbRef.current;

    // Create DOM element for GPS marker with pulsing animation
    const createGpsMarker = (lat: number, lng: number) => {
      // Remove old marker if it exists
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
      }

      // Create container div (smaller to reduce visual footprint)
      const el = document.createElement('div');
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.zIndex = '1'; // Keep GPS marker behind observations/stories

      // Pulse ring (animated) - smaller scale
      const pulseRing = document.createElement('div');
      pulseRing.style.position = 'absolute';
      pulseRing.style.width = '10px';
      pulseRing.style.height = '10px';
      pulseRing.style.borderRadius = '50%';
      pulseRing.style.backgroundColor = 'transparent';
      pulseRing.style.border = 'none';
      pulseRing.style.animation = 'gps-pulse 2s infinite';
      el.appendChild(pulseRing);

      // White outer circle (ring effect) - smaller
      const whiteRing = document.createElement('div');
      whiteRing.style.position = 'absolute';
      whiteRing.style.width = '10px';
      whiteRing.style.height = '10px';
      whiteRing.style.borderRadius = '50%';
      whiteRing.style.backgroundColor = '#ffffff';
      whiteRing.style.boxShadow = '0 0 0 1px #4285F4';
      el.appendChild(whiteRing);

      // Blue inner dot - smaller
      const blueDot = document.createElement('div');
      blueDot.style.position = 'absolute';
      blueDot.style.width = '6px';
      blueDot.style.height = '6px';
      blueDot.style.borderRadius = '50%';
      blueDot.style.backgroundColor = '#4285F4';
      blueDot.style.zIndex = '2';
      el.appendChild(blueDot);

      // Create marker
      const marker = new mb.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      gpsMarkerRef.current = marker;
    };

    // Start watching position
    if (!navigator?.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        try {
          if (pos?.coords) {
            const { latitude, longitude } = pos.coords;
            createGpsMarker(latitude, longitude);
          }
        } catch (e) {
          console.debug('GPS watchPosition callback error:', e);
        }
      },
      (error) => {
        console.debug('GPS watchPosition error:', error?.code, error?.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    gpsWatchIdRef.current = watchId;

    // Cleanup
    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
        gpsMarkerRef.current = null;
      }
    };
  }, [mapLoaded]);

  const cycleStyle = () => {
    const styles: MapStyleKey[] = ['outdoors', 'satellite', 'standard'];
    const idx = styles.indexOf(mapStyle);
    setMapStyle(styles[(idx + 1) % styles.length]);
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
      {/* Pulse animation for story markers and GPS */}
      <style>{`
        @keyframes story-pulse {
          0%, 100% { box-shadow: 0 2px 10px rgba(139,92,246,0.5); }
          50% { box-shadow: 0 2px 20px rgba(236,72,153,0.7), 0 0 0 6px rgba(139,92,246,0.15); }
        }
        @keyframes gps-pulse {
          0% {
            width: 10px;
            height: 10px;
            opacity: 0.6;
            box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.6);
          }
          100% {
            width: 32px;
            height: 32px;
            opacity: 0;
            box-shadow: 0 0 0 8px rgba(66, 133, 244, 0);
          }
        }
      `}</style>

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
        {/* Map style toggle */}
        <button
          onClick={cycleStyle}
          className="bg-white rounded-xl shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
          title="Changer le style de la carte"
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
            className="text-gray-700"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
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