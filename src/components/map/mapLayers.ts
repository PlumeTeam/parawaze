import type mapboxgl from 'mapbox-gl';
import type { MarkerConfig } from '@/lib/types';
import {
  SRC_REPORTS, LYR_OBS_CIRCLES, LYR_FORECAST_CIRCLES, LYR_WIND_ARROWS,
  SRC_SHUTTLES, LYR_SHUTTLE_ICONS,
  SRC_POIS, LYR_POI_CIRCLES,
  SRC_PIOUPIOU, LYR_PIOUPIOU_CIRCLES, LYR_PIOUPIOU_LABELS, LYR_PIOUPIOU_ARROWS,
  LYR_PIOUPIOU_CLUSTERS, LYR_PIOUPIOU_CLUSTER_COUNT,
  SRC_FFVL, LYR_FFVL_CIRCLES, LYR_FFVL_LABELS, LYR_FFVL_ARROWS,
  LYR_FFVL_CLUSTERS, LYR_FFVL_CLUSTER_COUNT,
  SRC_WINDS_MOBI, LYR_WINDS_MOBI_CIRCLES, LYR_WINDS_MOBI_LABELS, LYR_WINDS_MOBI_ARROWS,
  LYR_WINDS_MOBI_CLUSTERS, LYR_WINDS_MOBI_CLUSTER_COUNT,
  SRC_GEOSPHERE, LYR_GEOSPHERE_CIRCLES, LYR_GEOSPHERE_LABELS, LYR_GEOSPHERE_ARROWS,
  LYR_GEOSPHERE_CLUSTERS, LYR_GEOSPHERE_CLUSTER_COUNT,
  SRC_BRIGHTSKY, LYR_BRIGHTSKY_CIRCLES, LYR_BRIGHTSKY_LABELS, LYR_BRIGHTSKY_ARROWS,
  LYR_BRIGHTSKY_CLUSTERS, LYR_BRIGHTSKY_CLUSTER_COUNT,
  SRC_MEETUPS, LYR_MEETUP_CIRCLES,
  SRC_STORIES, LYR_STORIES_CIRCLES, LYR_STORIES_CLUSTERS, LYR_STORIES_CLUSTER_COUNT,
  SRC_OBSERVATIONS, LYR_OBSERVATIONS_CIRCLES,
} from './mapConstants';

/* ------------------------------------------------------------------ */
/*  Maki icon loader with caching                                      */
/* ------------------------------------------------------------------ */
const makiIconCache = new Map<string, boolean>();

export async function loadMakiIcon(
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
    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 24, 24);
        const imageData = ctx.getImageData(0, 0, 24, 24);
        if (!map.hasImage(customImageId)) {
          map.addImage(customImageId, imageData, { sdf: true });
        }
        makiIconCache.set(customImageId, true);
        resolve();
      };
      img.onerror = () => {
        makiIconCache.set(customImageId, false);
        resolve();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
    });
    if (makiIconCache.get(customImageId) === false) {
      return { useImage: false, fallbackChar: fallbackChar || undefined };
    }
    return { useImage: true, fallbackChar: fallbackChar || undefined };
  } catch (e) {
    console.warn(`[ParaWaze] Failed to load Maki icon ${iconName}:`, e);
    makiIconCache.set(customImageId, false);
    return { useImage: false, fallbackChar: fallbackChar || undefined };
  }
}

/* ------------------------------------------------------------------ */
/*  Add all GeoJSON sources and layers to the map                      */
/* ------------------------------------------------------------------ */
export function addLayersToMap(map: mapboxgl.Map, markerConfig: Record<string, MarkerConfig>): void {
  try {
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

  if (!map.getLayer(LYR_SHUTTLE_ICONS)) {
    map.addLayer({
      id: LYR_SHUTTLE_ICONS,
      type: 'circle',
      source: SRC_SHUTTLES,
      paint: {
        'circle-radius': ['coalesce', ['get', 'circle_radius'], 12] as any,
        'circle-color': ['coalesce', ['get', 'fill_color'], ['get', 'color']] as any,
        'circle-opacity': ['case', ['boolean', ['get', 'show_fill'], true], ['coalesce', ['get', 'fill_opacity'], 0.95], 0] as any,
        'circle-stroke-color': ['coalesce', ['get', 'stroke_color'], '#ffffff'] as any,
        'circle-stroke-width': ['case', ['boolean', ['get', 'show_stroke'], true], ['coalesce', ['get', 'stroke_width'], 4], 0] as any,
        'circle-stroke-opacity': ['coalesce', ['get', 'stroke_opacity'], 1.0] as any,
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

  if (!map.getLayer(LYR_POI_CIRCLES)) {
    map.addLayer({
      id: LYR_POI_CIRCLES,
      type: 'circle',
      source: SRC_POIS,
      paint: {
        'circle-radius': ['coalesce', ['get', 'circle_radius'], 14] as any,
        'circle-color': ['coalesce', ['get', 'fill_color'], ['get', 'color']] as any,
        'circle-opacity': ['case', ['boolean', ['get', 'show_fill'], true], ['coalesce', ['get', 'fill_opacity'], 0.95], 0] as any,
        'circle-stroke-color': ['coalesce', ['get', 'stroke_color'], '#ffffff'] as any,
        'circle-stroke-width': ['case', ['boolean', ['get', 'show_stroke'], true], ['coalesce', ['get', 'stroke_width'], 3], 0] as any,
        'circle-stroke-opacity': ['coalesce', ['get', 'stroke_opacity'], 1.0] as any,
      },
    });
  }

  // POI takeoff Maki icons inside circles
  const takeoffIconName = markerConfig['site_takeoff']?.icon_name;
  const takeoffFallback = markerConfig['site_takeoff']?.icon_unicode || undefined;
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
            ? { 'icon-image': iconImageId, 'icon-size': ['coalesce', ['get', 'icon_size'], 1.0] as any, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
            : { 'text-field': result.fallbackChar || 'T', 'text-size': 13, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: iconImageId
            ? { 'icon-color': ['coalesce', ['get', 'icon_color'], '#FFFFFF'] as any, 'icon-opacity': ['case', ['boolean', ['get', 'show_icon'], true], ['coalesce', ['get', 'icon_opacity'], 1.0], 0] as any }
            : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
        });
      }
    });
  }

  // POI landing Maki icons inside circles
  const landingIconName = markerConfig['site_landing']?.icon_name;
  const landingFallback = markerConfig['site_landing']?.icon_unicode;
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
            ? { 'icon-image': iconImageId, 'icon-size': ['coalesce', ['get', 'icon_size'], 1.0] as any, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
            : { 'text-field': result.fallbackChar || 'L', 'text-size': 13, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: iconImageId
            ? { 'icon-color': ['coalesce', ['get', 'icon_color'], '#FFFFFF'] as any, 'icon-opacity': ['case', ['boolean', ['get', 'show_icon'], true], ['coalesce', ['get', 'icon_opacity'], 1.0], 0] as any }
            : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
        });
      }
    });
  }

  // Shuttle departure Maki icons inside circles
  const shuttleDepIconName = markerConfig['shuttle_departure']?.icon_name;
  const shuttleDepFallback = markerConfig['shuttle_departure']?.icon_unicode;
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
            ? { 'icon-image': iconImageId, 'icon-size': ['coalesce', ['get', 'icon_size'], 1.0] as any, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
            : { 'text-field': result.fallbackChar || 'N', 'text-size': 12, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: iconImageId
            ? { 'icon-color': ['coalesce', ['get', 'icon_color'], '#FFFFFF'] as any, 'icon-opacity': ['case', ['boolean', ['get', 'show_icon'], true], ['coalesce', ['get', 'icon_opacity'], 1.0], 0] as any }
            : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
        });
      }
    });
  }

  // Shuttle arrival Maki icons inside circles
  const shuttleArrIconName = markerConfig['shuttle_arrival']?.icon_name;
  const shuttleArrFallback = markerConfig['shuttle_arrival']?.icon_unicode;
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
            ? { 'icon-image': iconImageId, 'icon-size': ['coalesce', ['get', 'icon_size'], 1.0] as any, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
            : { 'text-field': result.fallbackChar || 'N', 'text-size': 12, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: iconImageId
            ? { 'icon-color': ['coalesce', ['get', 'icon_color'], '#FFFFFF'] as any, 'icon-opacity': ['case', ['boolean', ['get', 'show_icon'], true], ['coalesce', ['get', 'icon_opacity'], 1.0], 0] as any }
            : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
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
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });
    }

    if (!map.getLayer(LYR_PIOUPIOU_CLUSTERS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_CLUSTERS,
        type: 'circle',
        source: SRC_PIOUPIOU,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 18,
          'circle-color': '#64748b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer(LYR_PIOUPIOU_CLUSTER_COUNT)) {
      map.addLayer({
        id: LYR_PIOUPIOU_CLUSTER_COUNT,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    if (!map.getLayer(LYR_PIOUPIOU_CIRCLES)) {
      map.addLayer({
        id: LYR_PIOUPIOU_CIRCLES,
        type: 'circle',
        source: SRC_PIOUPIOU,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(LYR_PIOUPIOU_LABELS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_LABELS,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'windLabel'], '']],
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

    if (!map.getLayer(LYR_PIOUPIOU_ARROWS)) {
      map.addLayer({
        id: LYR_PIOUPIOU_ARROWS,
        type: 'symbol',
        source: SRC_PIOUPIOU,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'wind_arrow_angle'], -1]],
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
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });
    }

    if (!map.getLayer(LYR_FFVL_CLUSTERS)) {
      map.addLayer({
        id: LYR_FFVL_CLUSTERS,
        type: 'circle',
        source: SRC_FFVL,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 18,
          'circle-color': '#64748b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer(LYR_FFVL_CLUSTER_COUNT)) {
      map.addLayer({
        id: LYR_FFVL_CLUSTER_COUNT,
        type: 'symbol',
        source: SRC_FFVL,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    if (!map.getLayer(LYR_FFVL_CIRCLES)) {
      map.addLayer({
        id: LYR_FFVL_CIRCLES,
        type: 'circle',
        source: SRC_FFVL,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(LYR_FFVL_LABELS)) {
      map.addLayer({
        id: LYR_FFVL_LABELS,
        type: 'symbol',
        source: SRC_FFVL,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'windLabel'], '']],
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

    if (!map.getLayer(LYR_FFVL_ARROWS)) {
      map.addLayer({
        id: LYR_FFVL_ARROWS,
        type: 'symbol',
        source: SRC_FFVL,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'wind_arrow_angle'], -1]],
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
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });
    }

    if (!map.getLayer(LYR_WINDS_MOBI_CLUSTERS)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_CLUSTERS,
        type: 'circle',
        source: SRC_WINDS_MOBI,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 18,
          'circle-color': '#64748b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer(LYR_WINDS_MOBI_CLUSTER_COUNT)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_CLUSTER_COUNT,
        type: 'symbol',
        source: SRC_WINDS_MOBI,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    if (!map.getLayer(LYR_WINDS_MOBI_CIRCLES)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_CIRCLES,
        type: 'circle',
        source: SRC_WINDS_MOBI,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(LYR_WINDS_MOBI_LABELS)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_LABELS,
        type: 'symbol',
        source: SRC_WINDS_MOBI,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'windLabel'], '']],
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

    if (!map.getLayer(LYR_WINDS_MOBI_ARROWS)) {
      map.addLayer({
        id: LYR_WINDS_MOBI_ARROWS,
        type: 'symbol',
        source: SRC_WINDS_MOBI,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'wind_arrow_angle'], -1]],
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

  // --- GeoSphere Austria + Bright Sky sources ---
  try {
    if (!map.getSource(SRC_GEOSPHERE)) {
      map.addSource(SRC_GEOSPHERE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });
    }

    if (!map.getSource(SRC_BRIGHTSKY)) {
      map.addSource(SRC_BRIGHTSKY, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });
    }

    if (!map.getLayer(LYR_GEOSPHERE_CLUSTERS)) {
      map.addLayer({
        id: LYR_GEOSPHERE_CLUSTERS,
        type: 'circle',
        source: SRC_GEOSPHERE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 18,
          'circle-color': '#64748b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer(LYR_GEOSPHERE_CLUSTER_COUNT)) {
      map.addLayer({
        id: LYR_GEOSPHERE_CLUSTER_COUNT,
        type: 'symbol',
        source: SRC_GEOSPHERE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    if (!map.getLayer(LYR_BRIGHTSKY_CLUSTERS)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_CLUSTERS,
        type: 'circle',
        source: SRC_BRIGHTSKY,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 18,
          'circle-color': '#64748b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer(LYR_BRIGHTSKY_CLUSTER_COUNT)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_CLUSTER_COUNT,
        type: 'symbol',
        source: SRC_BRIGHTSKY,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    if (!map.getLayer(LYR_GEOSPHERE_CIRCLES)) {
      map.addLayer({
        id: LYR_GEOSPHERE_CIRCLES,
        type: 'circle',
        source: SRC_GEOSPHERE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(LYR_BRIGHTSKY_CIRCLES)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_CIRCLES,
        type: 'circle',
        source: SRC_BRIGHTSKY,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

    if (!map.getLayer(LYR_GEOSPHERE_LABELS)) {
      map.addLayer({
        id: LYR_GEOSPHERE_LABELS,
        type: 'symbol',
        source: SRC_GEOSPHERE,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'windLabel'], '']],
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

    if (!map.getLayer(LYR_BRIGHTSKY_LABELS)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_LABELS,
        type: 'symbol',
        source: SRC_BRIGHTSKY,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'windLabel'], '']],
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

    if (!map.getLayer(LYR_GEOSPHERE_ARROWS)) {
      map.addLayer({
        id: LYR_GEOSPHERE_ARROWS,
        type: 'symbol',
        source: SRC_GEOSPHERE,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'wind_arrow_angle'], -1]],
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

    if (!map.getLayer(LYR_BRIGHTSKY_ARROWS)) {
      map.addLayer({
        id: LYR_BRIGHTSKY_ARROWS,
        type: 'symbol',
        source: SRC_BRIGHTSKY,
        minzoom: 9,
        filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'wind_arrow_angle'], -1]],
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
    map.addSource(SRC_MEETUPS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }

  const meetupColor = markerConfig['meetup']?.color || '#F59E0B';
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

  const meetupIconName = markerConfig['meetup']?.icon_name;
  const meetupFallback = markerConfig['meetup']?.icon_unicode || '👥';
  if (meetupIconName && !map.getLayer('parawaze-meetup-icon')) {
    loadMakiIcon(map, meetupIconName, meetupFallback).then((result) => {
      if (!map.getLayer('parawaze-meetup-icon')) {
        const iconImageId = result.useImage ? meetupIconName + '-custom' : undefined;
        map.addLayer({
          id: 'parawaze-meetup-icon',
          type: 'symbol',
          source: SRC_MEETUPS,
          layout: iconImageId
            ? { 'icon-image': iconImageId, 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
            : { 'text-field': ['get', 'label'], 'text-size': 11, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
          paint: iconImageId
            ? { 'icon-color': '#FFFFFF' }
            : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
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

    const storyColor = markerConfig['story']?.color || '#EC4899';
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
        paint: { 'text-color': '#ffffff' },
      });
    }

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

    const storyIconName = markerConfig['story']?.icon_name;
    const storyFallback = markerConfig['story']?.icon_unicode;
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
              ? { 'icon-image': iconImageId, 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
              : { 'text-field': result.fallbackChar || '📖', 'text-size': 13, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
          });
        }
      });
    }
  } catch (e) {
    console.error('[ParaWaze] Failed to add stories source/layers:', e);
  }

  // --- Observations source ---
  try {
    if (!map.getSource(SRC_OBSERVATIONS)) {
      map.addSource(SRC_OBSERVATIONS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }

    if (!map.getLayer(LYR_OBSERVATIONS_CIRCLES)) {
      map.addLayer({
        id: LYR_OBSERVATIONS_CIRCLES,
        type: 'circle',
        source: SRC_OBSERVATIONS,
        paint: {
          'circle-color': [
            'step',
            ['coalesce', ['get', 'wind_speed_kmh'], -1],
            '#3B82F6',
            0, '#22c55e',
            15, '#84cc16',
            25, '#eab308',
            35, '#f97316',
            45, '#ef4444',
          ],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });
    }

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
          'text-ignore-placement': true,
          'icon-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 0.5,
        },
      });
    }

    const obsIconName = markerConfig['observation']?.icon_name;
    const obsFallback = markerConfig['observation']?.icon_unicode;
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
              ? { 'icon-image': iconImageId, 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
              : { 'text-field': result.fallbackChar || '🌤️', 'text-size': 13, 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
            paint: iconImageId
              ? { 'icon-color': '#FFFFFF' }
              : { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.3)', 'text-halo-width': 1 },
          });
        }
      });
    }
  } catch (e) {
    console.error('[ParaWaze] Failed to add observations source/layers:', e);
  }
}
