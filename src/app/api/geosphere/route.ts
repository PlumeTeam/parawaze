import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATASET = 'tawes-v1-10min';
const BASE = 'https://dataset.api.hub.geosphere.at/v1/station/current';
const METADATA_URL = `${BASE}/${DATASET}/metadata`;
const DATA_URL = `${BASE}/${DATASET}`;
const PARAMS = 'DD,FF,FFX,TL';
const BATCH_SIZE = 50;

export async function GET() {
  try {
    // Step 1: Fetch station metadata (cached 1 hour — changes rarely)
    const metaRes = await fetch(METADATA_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!metaRes.ok) {
      return NextResponse.json(
        { error: `GeoSphere metadata error: ${metaRes.status}` },
        { status: metaRes.status },
      );
    }

    const meta = await metaRes.json();
    const stations: any[] = (meta.stations || []).filter((s: any) => s.is_active !== false);
    const stationIdList = stations.map((s: any) => s.id);

    if (stationIdList.length === 0) {
      return NextResponse.json([]);
    }

    // Step 2: Fetch current observations in batches of 50 to avoid URL length limits
    const batches = [];
    for (let i = 0; i < stationIdList.length; i += BATCH_SIZE) {
      batches.push(stationIdList.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const params = new URLSearchParams({
          parameters: PARAMS,
          station_ids: batch.join(','),
          output_format: 'geojson',
        });
        const res = await fetch(`${DATA_URL}?${params}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return res.json();
      })
    );

    // Merge features from all batches
    const allFeatures: any[] = [];
    let timestamp: string | null = null;
    for (const geoData of batchResults) {
      if (!geoData) continue;
      if (!timestamp && geoData.timestamps?.[0]) {
        timestamp = geoData.timestamps[0];
      }
      if (Array.isArray(geoData.features)) {
        allFeatures.push(...geoData.features);
      }
    }

    // Build a lookup map: stationId → metadata
    const metaMap: Record<string, any> = {};
    for (const s of stations) {
      metaMap[String(s.id)] = s;
    }

    // Merge GeoJSON features with metadata and convert units
    const result = allFeatures
      .map((f: any) => {
        const stationId = String(f.properties?.station ?? '');
        const stationMeta = metaMap[stationId] ?? {};
        const p = f.properties?.parameters ?? {};

        const windDir: number | null = p.DD?.data?.[0] ?? null;
        const windAvgMs: number | null = p.FF?.data?.[0] ?? null;
        const windGustMs: number | null = p.FFX?.data?.[0] ?? null;
        const temperature: number | null = p.TL?.data?.[0] ?? null;

        const lat: number | null = stationMeta.lat ?? f.geometry?.coordinates?.[1] ?? null;
        const lng: number | null = stationMeta.lon ?? f.geometry?.coordinates?.[0] ?? null;

        if (lat == null || lng == null) return null;

        return {
          id: stationId,
          name: stationMeta.name || stationId,
          lat,
          lng,
          altitude: stationMeta.altitude ?? null,
          state: stationMeta.state ?? null,
          windDirection: windDir,
          // Convert m/s → km/h (round to 1 decimal)
          windAvg: windAvgMs != null ? Math.round(windAvgMs * 36) / 10 : null,
          windGust: windGustMs != null ? Math.round(windGustMs * 36) / 10 : null,
          temperature,
          timestamp,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[geosphere proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
