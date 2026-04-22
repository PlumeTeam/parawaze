import type { WeatherReport, Shuttle, WindDirection, Poi, Story, Meetup, MarkerConfig } from '@/lib/types';
import type { PioupiouStation } from '@/hooks/usePioupiou';
import type { FFVLStation } from '@/hooks/useFFVL';
import type { WindsMobiStation } from '@/hooks/useWindsMobi';
import type { GeoSphereStation } from '@/hooks/useGeoSphere';
import type { BrightSkyStation } from '@/hooks/useBrightSky';

/* ------------------------------------------------------------------ */
/*  Condition-based color                                             */
/* ------------------------------------------------------------------ */
export function getConditionColor(report: WeatherReport): string {
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
export const WIND_ANGLE_MAP: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

export function getWindAngle(dir: WindDirection | null | undefined): number {
  if (!dir || dir === 'variable') return -1;
  const angle = WIND_ANGLE_MAP[dir];
  return angle !== undefined ? (angle + 180 - 90 + 360) % 360 : -1;
}

/* ------------------------------------------------------------------ */
/*  GeoJSON helpers                                                   */
/* ------------------------------------------------------------------ */
export function getAgeOpacity(createdAt: string, reportType: string): number {
  if (reportType === 'forecast') return 0.95;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageMinutes = ageMs / (1000 * 60);
  if (ageMinutes < 30) return 1.0;
  const halfHours = Math.floor(ageMinutes / 30);
  const opacity = 1.0 - halfHours * 0.05;
  return Math.max(0.40, Math.min(1.0, opacity));
}

export function buildReportFeatures(reports: WeatherReport[]): GeoJSON.Feature[] {
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
        author: r.profiles?.display_name || r.profiles?.username || 'Anonyme',
        location_name: r.location_name || undefined,
        altitude_m: r.altitude_m || undefined,
        wind_speed_kmh: r.wind_speed_kmh != null ? r.wind_speed_kmh : undefined,
        wind_gust_kmh: r.wind_gust_kmh != null ? r.wind_gust_kmh : undefined,
        wind_direction: r.wind_direction || undefined,
        thermal_quality: r.thermal_quality != null ? r.thermal_quality : undefined,
        thermal_turbulence: r.thermal_turbulence != null ? r.thermal_turbulence : undefined,
        turbulence_level: r.turbulence_level != null ? r.turbulence_level : undefined,
        nebulosity: r.nebulosity != null ? r.nebulosity : undefined,
        weather_phenomena: r.weather_phenomena || undefined,
        temperature_c: r.temperature_c != null ? r.temperature_c : undefined,
        description: r.description || undefined,
        created_at: r.created_at,
        color: getConditionColor(r),
        wind_angle: getWindAngle(r.wind_direction),
        opacity: getAgeOpacity(r.created_at, r.report_type),
      },
    }));
}

export function buildShuttleFeatures(shuttles: Shuttle[], config: Record<string, MarkerConfig> = {}): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  const depCfg = config['shuttle_departure'];
  const arrCfg = config['shuttle_arrival'];
  const fullColor = config['shuttle_departure_full']?.color || '#ef4444';

  shuttles.forEach((s) => {
    if (s.meeting_point?.coordinates && s.meeting_point.coordinates.length >= 2) {
      const isFull = s.taken_seats >= s.total_seats;
      const baseColor = depCfg?.color || '#22c55e';
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: s.meeting_point.coordinates },
        properties: {
          id: s.id,
          shuttle_role: 'departure',
          color: isFull ? fullColor : baseColor,
          show_circle: depCfg?.show_circle !== false,
          // Stroke
          stroke_color: depCfg?.stroke_color || '#ffffff',
          stroke_width: depCfg?.stroke_width ?? 4,
          stroke_opacity: depCfg?.stroke_opacity ?? 1.0,
          show_stroke: depCfg?.show_stroke ?? true,
          circle_radius: depCfg?.circle_radius ?? 12,
          // Fill
          fill_color: isFull ? fullColor : (depCfg?.fill_color || baseColor),
          fill_opacity: depCfg?.fill_opacity ?? 0.95,
          show_fill: depCfg?.show_fill ?? true,
          // Icon
          icon_color: depCfg?.icon_color || '#FFFFFF',
          icon_size: depCfg?.icon_size ?? 1.0,
          icon_opacity: depCfg?.icon_opacity ?? 1.0,
          show_icon: depCfg?.show_icon ?? true,
        },
      });
    }
    if (s.destination?.coordinates && s.destination.coordinates.length >= 2) {
      const baseColor = arrCfg?.color || '#3b82f6';
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: s.destination.coordinates },
        properties: {
          id: s.id,
          shuttle_role: 'arrival',
          color: baseColor,
          show_circle: arrCfg?.show_circle !== false,
          // Stroke
          stroke_color: arrCfg?.stroke_color || '#ffffff',
          stroke_width: arrCfg?.stroke_width ?? 4,
          stroke_opacity: arrCfg?.stroke_opacity ?? 1.0,
          show_stroke: arrCfg?.show_stroke ?? true,
          circle_radius: arrCfg?.circle_radius ?? 12,
          // Fill
          fill_color: arrCfg?.fill_color || baseColor,
          fill_opacity: arrCfg?.fill_opacity ?? 0.95,
          show_fill: arrCfg?.show_fill ?? true,
          // Icon
          icon_color: arrCfg?.icon_color || '#FFFFFF',
          icon_size: arrCfg?.icon_size ?? 1.0,
          icon_opacity: arrCfg?.icon_opacity ?? 1.0,
          show_icon: arrCfg?.show_icon ?? true,
        },
      });
    }
  });
  return features;
}

/* ------------------------------------------------------------------ */
/*  POI GeoJSON                                                       */
/* ------------------------------------------------------------------ */
export function buildPoiFeatures(pois: Poi[], config: Record<string, MarkerConfig> = {}): GeoJSON.Feature[] {
  return pois
    .filter((p) => p.location && p.location.coordinates && p.location.coordinates.length >= 2)
    .map((p) => {
      const typeKey =
        p.poi_type === 'landing' ? 'site_landing' :
        p.poi_type === 'takeoff' ? 'site_takeoff' :
        p.poi_type === 'weather_station' ? 'weather_station' : null;
      const cfg = typeKey ? config[typeKey] : null;
      const fallbackColor =
        p.poi_type === 'landing' ? '#22c55e' :
        p.poi_type === 'takeoff' ? '#3b82f6' :
        p.poi_type === 'weather_station' ? '#eab308' : '#a855f7';
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.location!.coordinates },
        properties: {
          id: p.id,
          poi_type: p.poi_type,
          label:
            p.poi_type === 'landing' ? 'A' :
            p.poi_type === 'takeoff' ? 'D' :
            p.poi_type === 'weather_station' ? 'M' : 'W',
          color: fallbackColor,
          show_circle: cfg?.show_circle !== false,
          // Stroke
          stroke_color: cfg?.stroke_color || '#ffffff',
          stroke_width: cfg?.stroke_width ?? 3,
          stroke_opacity: cfg?.stroke_opacity ?? 1.0,
          show_stroke: cfg?.show_stroke ?? true,
          circle_radius: cfg?.circle_radius ?? 14,
          // Fill
          fill_color: cfg?.fill_color || cfg?.color || fallbackColor,
          fill_opacity: cfg?.fill_opacity ?? 0.95,
          show_fill: cfg?.show_fill ?? true,
          // Icon
          icon_color: cfg?.icon_color || '#FFFFFF',
          icon_size: cfg?.icon_size ?? 1.0,
          icon_opacity: cfg?.icon_opacity ?? 1.0,
          show_icon: cfg?.show_icon ?? true,
        },
      };
    });
}

/* ------------------------------------------------------------------ */
/*  Meetup GeoJSON                                                    */
/* ------------------------------------------------------------------ */
export function buildMeetupFeatures(meetups: Meetup[]): GeoJSON.Feature[] {
  return meetups
    .filter((m) => m.location && m.location.coordinates && m.location.coordinates.length >= 2)
    .map((m) => {
      const participants = m.meetup_participants || [];
      const count = participants.filter((p) => p.status !== 'cancelled').length;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: m.location!.coordinates },
        properties: {
          id: m.id,
          title: m.title,
          label: `${count}`,
        },
      };
    });
}

/* ------------------------------------------------------------------ */
/*  Pioupiou GeoJSON                                                  */
/* ------------------------------------------------------------------ */
export function getPioupiouColor(station: PioupiouStation): string {
  if (!station.isOnline || station.windAvg == null) return '#9ca3af';
  const w = station.windAvg;
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export function buildPioupiouFeatures(stations: PioupiouStation[]): GeoJSON.Feature[] {
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
export function getFFVLColor(station: FFVLStation): string {
  if (station.windAvg == null) return '#9ca3af';
  const w = station.windAvg;
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export function buildFFVLFeatures(stations: FFVLStation[]): GeoJSON.Feature[] {
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
export function getWindsMobiColor(station: WindsMobiStation): string {
  if (station.status === 'red' || station.windAvg == null) return '#9ca3af';
  const w = station.windAvg;
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export function buildWindsMobiFeatures(stations: WindsMobiStation[]): GeoJSON.Feature[] {
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
/*  GeoSphere Austria GeoJSON                                         */
/* ------------------------------------------------------------------ */
export function getGeoSphereColor(station: GeoSphereStation): string {
  if (station.windAvg == null) return '#9ca3af';
  const w = station.windAvg;
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export function buildGeoSphereFeatures(stations: GeoSphereStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lng, s.lat],
    },
    properties: {
      id: s.id,
      name: s.name,
      color: getGeoSphereColor(s),
      altitude: s.altitude,
      state: s.state,
      windAvg: s.windAvg,
      windGust: s.windGust,
      windDirection: s.windDirection,
      temperature: s.temperature,
      timestamp: s.timestamp,
      wind_arrow_angle:
        s.windDirection != null && s.windAvg != null
          ? (s.windDirection + 180 - 90 + 360) % 360
          : -1,
      windLabel: s.windAvg != null ? `${Math.round(s.windAvg)}` : '',
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  Bright Sky (DWD) GeoJSON                                          */
/* ------------------------------------------------------------------ */
export const BS_COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function getBrightSkyColor(station: BrightSkyStation): string {
  if (station.wind_speed_kmh == null) return '#9ca3af';
  const w = station.wind_speed_kmh;
  if (w < 15) return '#22c55e';
  if (w < 25) return '#84cc16';
  if (w < 35) return '#eab308';
  if (w < 45) return '#f97316';
  return '#ef4444';
}

export function buildBrightSkyFeatures(stations: BrightSkyStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lon, s.lat],
    },
    properties: {
      id: s.id,
      dwd_station_id: s.dwd_station_id,
      name: s.name,
      color: getBrightSkyColor(s),
      altitude: s.altitude,
      windAvg: s.wind_speed_kmh,
      windDirection: s.wind_direction_deg,
      windGust: s.wind_gust_kmh,
      windGustDirection: s.wind_gust_direction_deg,
      temperature: s.temperature_c,
      timestamp: s.timestamp,
      lat: s.lat,
      lon: s.lon,
      wind_arrow_angle:
        s.wind_direction_deg != null
          ? (s.wind_direction_deg + 180 - 90 + 360) % 360
          : -1,
      windLabel: `${Math.round(s.wind_speed_kmh)}`,
    },
  }));
}

export function buildStoryFeatures(stories: Story[]): GeoJSON.Feature[] {
  return stories
    .filter((s) => s.location && s.location.coordinates && s.location.coordinates.length >= 2)
    .map((s) => {
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: s.location!.coordinates,
        },
        properties: {
          id: s.id,
          content_type: 'story' as const,
          point_count_abbreviated: '1',
        },
      };
    });
}

export function buildObservationFeatures(reports: WeatherReport[]): GeoJSON.Feature[] {
  const features = reports
    .filter(
      (r) =>
        r.location && r.location.coordinates && r.location.coordinates.length >= 2 &&
        (r.report_type === 'observation' || r.report_type === 'image_share')
    )
    .map((r) => {
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: r.location!.coordinates,
        },
        properties: {
          id: r.id,
          content_type: 'observation' as const,
          point_count_abbreviated: '1',
          report_type: r.report_type,
          author: r.profiles?.display_name || r.profiles?.username || 'Anonyme',
          location_name: r.location_name || undefined,
          altitude_m: r.altitude_m || undefined,
          wind_speed_kmh: r.wind_speed_kmh != null ? r.wind_speed_kmh : undefined,
          wind_gust_kmh: r.wind_gust_kmh != null ? r.wind_gust_kmh : undefined,
          wind_direction: r.wind_direction || undefined,
          thermal_quality: r.thermal_quality != null ? r.thermal_quality : undefined,
          turbulence_level: r.turbulence_level != null ? r.turbulence_level : undefined,
          description: r.description || undefined,
          created_at: r.created_at,
        },
      };
    });
  return features;
}
