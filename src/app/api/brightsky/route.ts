import { NextResponse } from 'next/server';

const BRIGHTSKY_BASE = 'https://api.brightsky.dev';

// Query points covering Alpine / southern Germany paragliding areas
const QUERY_POINTS = [
  { lat: 47.55, lon: 10.75 }, // Allgäu Alps
  { lat: 47.42, lon: 11.60 }, // Karwendel / Inn Valley
  { lat: 47.60, lon: 13.00 }, // Berchtesgaden area
  { lat: 47.80, lon: 9.50 },  // Lake Constance / upper Swabia
  { lat: 48.20, lon: 8.00 },  // Black Forest / upper Rhine
];

const MAX_DIST_M = 100_000; // 100 km radius per query point
const MAX_STATIONS = 50;
const MIN_HEIGHT_M = 300;    // Include valley launch sites too

// Cache this route for 5 minutes at the CDN/ISR layer
export const revalidate = 300;

export async function GET() {
  try {
    // ── Step 1: gather sources (station metadata) ─────────────────────────
    const sourceResponses = await Promise.allSettled(
      QUERY_POINTS.map(({ lat, lon }) =>
        fetch(
          `${BRIGHTSKY_BASE}/sources?lat=${lat}&lon=${lon}&max_dist=${MAX_DIST_M}`,
          { next: { revalidate: 300 } }
        ).then((r) => r.json() as Promise<{ sources: BrightSkySource[] }>)
      )
    );

    // Deduplicate by source ID; keep only real observation stations
    const sourceMap = new Map<number, BrightSkySource>();
    for (const result of sourceResponses) {
      if (result.status !== 'fulfilled') continue;
      for (const src of result.value.sources ?? []) {
        if (
          !sourceMap.has(src.id) &&
          (src.observation_type === 'synop' || src.observation_type === 'current') &&
          src.height != null &&
          src.height >= MIN_HEIGHT_M
        ) {
          sourceMap.set(src.id, src);
        }
      }
    }

    // Prioritise by altitude (more relevant for paragliding), cap at MAX_STATIONS
    const sources = Array.from(sourceMap.values())
      .sort((a, b) => b.height - a.height)
      .slice(0, MAX_STATIONS);

    if (sources.length === 0) {
      return NextResponse.json({ stations: [] });
    }

    // ── Step 2: fetch current weather for each source in parallel ─────────
    const weatherResults = await Promise.allSettled(
      sources.map((src) =>
        fetch(`${BRIGHTSKY_BASE}/current_weather?source_id=${src.id}`, {
          next: { revalidate: 300 },
        }).then(
          (r) =>
            r.json() as Promise<{
              weather: BrightSkyWeather;
              sources: BrightSkySource[];
            }>
        )
      )
    );

    // ── Step 3: combine metadata + weather ───────────────────────────────
    const stations: BrightSkyStationResult[] = [];

    for (let i = 0; i < sources.length; i++) {
      const result = weatherResults[i];
      if (result.status !== 'fulfilled') continue;

      const { weather } = result.value;
      if (!weather) continue;

      const src = sources[i];

      // Bright Sky returns wind speed in m/s (DWD default units) → km/h
      const windSpeedMs = weather.wind_speed_10;
      if (windSpeedMs === null || windSpeedMs === undefined) continue;

      stations.push({
        id: src.id,
        dwd_station_id: src.dwd_station_id ?? null,
        name: src.station_name ?? `Station ${src.id}`,
        lat: src.lat,
        lon: src.lon,
        altitude: src.height,
        wind_speed_kmh: Math.round(windSpeedMs * 3.6),
        wind_direction_deg: weather.wind_direction_10 ?? null,
        wind_gust_kmh:
          weather.wind_gust_speed_10 != null
            ? Math.round(weather.wind_gust_speed_10 * 3.6)
            : null,
        wind_gust_direction_deg: weather.wind_gust_direction_10 ?? null,
        temperature_c: weather.temperature ?? null,
        timestamp: weather.timestamp ?? null,
      });
    }

    return NextResponse.json(
      { stations },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[BrightSky] Error fetching stations:', err);
    return NextResponse.json({ stations: [] }, { status: 500 });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface BrightSkySource {
  id: number;
  dwd_station_id: string | null;
  station_name: string | null;
  observation_type: 'historical' | 'current' | 'synop' | 'forecast';
  lat: number;
  lon: number;
  height: number;
}

interface BrightSkyWeather {
  timestamp: string | null;
  wind_speed_10: number | null;
  wind_direction_10: number | null;
  wind_gust_speed_10: number | null;
  wind_gust_direction_10: number | null;
  temperature: number | null;
}

export interface BrightSkyStationResult {
  id: number;
  dwd_station_id: string | null;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  wind_speed_kmh: number;
  wind_direction_deg: number | null;
  wind_gust_kmh: number | null;
  wind_gust_direction_deg: number | null;
  temperature_c: number | null;
  timestamp: string | null;
}
