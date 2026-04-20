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
  LYR_PIOUPIOU_CLUSTERS,
  LYR_PIOUPIOU_CLUSTER_COUNT,
  SRC_FFVL,
  LYR_FFVL_CIRCLES,
  LYR_FFVL_LABELS,
  LYR_FFVL_ARROWS,
  LYR_FFVL_CLUSTERS,
  LYR_FFVL_CLUSTER_COUNT,
  SRC_WINDS_MOBI,
  LYR_WINDS_MOBI_CIRCLES,
  LYR_WINDS_MOBI_LABELS,
  LYR_WINDS_MOBI_ARROWS,
  LYR_WINDS_MOBI_CLUSTERS,
  LYR_WINDS_MOBI_CLUSTER_COUNT,
  SRC_GEOSPHERE,
  LYR_GEOSPHERE_CIRCLES,
  LYR_GEOSPHERE_LABELS,
  LYR_GEOSPHERE_ARROWS,
  LYR_GEOSPHERE_CLUSTERS,
  LYR_GEOSPHERE_CLUSTER_COUNT,
  SRC_BRIGHTSKY,
  LYR_BRIGHTSKY_CIRCLES,
  LYR_BRIGHTSKY_LABELS,
  LYR_BRIGHTSKY_ARROWS,
  LYR_BRIGHTSKY_CLUSTERS,
  LYR_BRIGHTSKY_CLUSTER_COUNT,
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
import { addLayersToMap as addMapLayers } from './mapLayers';

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
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('satellite');
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
    addMapLayers(map, markerConfigRef.current);
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
      { circles: LYR_PIOUPIOU_CIRCLES, labels: LYR_PIOUPIOU_LABELS, arrows: LYR_PIOUPIOU_ARROWS, clusters: LYR_PIOUPIOU_CLUSTERS, clusterCount: LYR_PIOUPIOU_CLUSTER_COUNT },
      { circles: LYR_FFVL_CIRCLES, labels: LYR_FFVL_LABELS, arrows: LYR_FFVL_ARROWS, clusters: LYR_FFVL_CLUSTERS, clusterCount: LYR_FFVL_CLUSTER_COUNT },
      { circles: LYR_WINDS_MOBI_CIRCLES, labels: LYR_WINDS_MOBI_LABELS, arrows: LYR_WINDS_MOBI_ARROWS, clusters: LYR_WINDS_MOBI_CLUSTERS, clusterCount: LYR_WINDS_MOBI_CLUSTER_COUNT },
      { circles: LYR_GEOSPHERE_CIRCLES, labels: LYR_GEOSPHERE_LABELS, arrows: LYR_GEOSPHERE_ARROWS, clusters: LYR_GEOSPHERE_CLUSTERS, clusterCount: LYR_GEOSPHERE_CLUSTER_COUNT },
      { circles: LYR_BRIGHTSKY_CIRCLES, labels: LYR_BRIGHTSKY_LABELS, arrows: LYR_BRIGHTSKY_ARROWS, clusters: LYR_BRIGHTSKY_CLUSTERS, clusterCount: LYR_BRIGHTSKY_CLUSTER_COUNT },
    ];

    stationLayers.forEach(({ circles, labels, arrows, clusters, clusterCount }) => {
      try {
        if (map.getLayer(circles)) {
          if (showingToday) {
            map.setPaintProperty(circles, 'circle-color', ['get', 'color']);
            map.setPaintProperty(circles, 'circle-stroke-color', '#ffffff');
            map.setPaintProperty(circles, 'circle-stroke-width', 2);
            map.setPaintProperty(circles, 'circle-opacity', 0.9);
            if (map.getLayer(labels)) map.setLayoutProperty(labels, 'visibility', 'visible');
            if (map.getLayer(arrows)) map.setLayoutProperty(arrows, 'visibility', 'visible');
            if (map.getLayer(clusters)) {
              map.setPaintProperty(clusters, 'circle-color', '#64748b');
              map.setPaintProperty(clusters, 'circle-stroke-color', '#ffffff');
              map.setPaintProperty(clusters, 'circle-opacity', 0.85);
            }
            if (map.getLayer(clusterCount)) map.setLayoutProperty(clusterCount, 'visibility', 'visible');
          } else {
            map.setPaintProperty(circles, 'circle-color', '#f5f5f5');
            map.setPaintProperty(circles, 'circle-stroke-color', '#aaaaaa');
            map.setPaintProperty(circles, 'circle-stroke-width', 1.5);
            map.setPaintProperty(circles, 'circle-opacity', 0.6);
            if (map.getLayer(labels)) map.setLayoutProperty(labels, 'visibility', 'none');
            if (map.getLayer(arrows)) map.setLayoutProperty(arrows, 'visibility', 'none');
            if (map.getLayer(clusters)) {
              map.setPaintProperty(clusters, 'circle-color', '#f5f5f5');
              map.setPaintProperty(clusters, 'circle-stroke-color', '#aaaaaa');
              map.setPaintProperty(clusters, 'circle-opacity', 0.6);
            }
            if (map.getLayer(clusterCount)) map.setLayoutProperty(clusterCount, 'visibility', 'none');
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
            layers: [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_PIOUPIOU_CIRCLES, LYR_PIOUPIOU_CLUSTERS, LYR_FFVL_CIRCLES, LYR_FFVL_CLUSTERS, LYR_WINDS_MOBI_CIRCLES, LYR_WINDS_MOBI_CLUSTERS, LYR_GEOSPHERE_CIRCLES, LYR_GEOSPHERE_CLUSTERS, LYR_BRIGHTSKY_CIRCLES, LYR_BRIGHTSKY_CLUSTERS, LYR_MEETUP_CIRCLES].filter(
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

          const html = createObservationPopupHTML(props);
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

          const html = createForecastPopupHTML(props);

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

          const html = createPioupiouPopupHTML(props, dayFilterRef.current === 'today');
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

          const html = createFFVLPopupHTML(props, dayFilterRef.current === 'today');
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

          const html = createWindsMobiPopupHTML(props, dayFilterRef.current === 'today');

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

          const html = createGeoSpherePopupHTML(props, dayFilterRef.current === 'today');

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

          const html = createBrightSkyPopupHTML(props, dayFilterRef.current === 'today');

          const popup = new mb.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);

          popup.on('close', () => { popupRef.current = null; });
          popupRef.current = popup;
        });

        // Weather station cluster click — zoom in to expand
        const stationClusters: Array<{ layerId: string; sourceId: string }> = [
          { layerId: LYR_PIOUPIOU_CLUSTERS, sourceId: SRC_PIOUPIOU },
          { layerId: LYR_FFVL_CLUSTERS, sourceId: SRC_FFVL },
          { layerId: LYR_WINDS_MOBI_CLUSTERS, sourceId: SRC_WINDS_MOBI },
          { layerId: LYR_GEOSPHERE_CLUSTERS, sourceId: SRC_GEOSPHERE },
          { layerId: LYR_BRIGHTSKY_CLUSTERS, sourceId: SRC_BRIGHTSKY },
        ];
        stationClusters.forEach(({ layerId, sourceId }) => {
          map.on('click', layerId, (e) => {
            if (!e.features || !e.features[0]) return;
            const clusterId = e.features[0].properties?.cluster_id;
            if (clusterId == null) return;
            const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
            if (!src) return;
            src.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return;
              map.easeTo({
                center: (e.features![0].geometry as any).coordinates,
                zoom,
              });
            });
          });
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

          const html = createObservationPopupHTML(props);

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
        const interactiveLayers = [LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_SHUTTLE_ICONS, LYR_POI_CIRCLES, LYR_POI_LABELS, LYR_PIOUPIOU_CIRCLES, LYR_PIOUPIOU_CLUSTERS, LYR_PIOUPIOU_LABELS, LYR_FFVL_CIRCLES, LYR_FFVL_CLUSTERS, LYR_FFVL_LABELS, LYR_WINDS_MOBI_CIRCLES, LYR_WINDS_MOBI_CLUSTERS, LYR_WINDS_MOBI_LABELS, LYR_GEOSPHERE_CIRCLES, LYR_GEOSPHERE_CLUSTERS, LYR_GEOSPHERE_LABELS, LYR_BRIGHTSKY_CIRCLES, LYR_BRIGHTSKY_CLUSTERS, LYR_BRIGHTSKY_LABELS, LYR_MEETUP_CIRCLES, LYR_MEETUP_LABELS, LYR_STORIES_CIRCLES, LYR_STORIES_CLUSTERS, LYR_OBSERVATIONS_CIRCLES, 'parawaze-shuttle-label', 'parawaze-forecast-label'];
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
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg pointer-events-none whitespace-nowrap font-medium"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}
        >
          {formatLabel(markerInfo)}
        </div>
      )}

      {/* Map controls */}
      <div
        className="absolute right-4 flex flex-col gap-2 z-10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
      >
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
