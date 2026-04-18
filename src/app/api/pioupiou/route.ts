import { NextResponse } from 'next/server';

let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function GET() {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedData);
  }

  try {
    const res = await fetch('https://api.pioupiou.fr/v1/live-with-meta/all', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Pioupiou API error: ${res.status}` },
        { status: res.status },
      );
    }

    const raw = await res.json();

    // Strip to only fields the hook consumes
    const stripped = {
      data: (raw.data || []).map((s: any) => ({
        id: s.id,
        meta: { name: s.meta?.name },
        location: {
          latitude: s.location?.latitude,
          longitude: s.location?.longitude,
        },
        measurements: {
          wind_speed_avg: s.measurements?.wind_speed_avg,
          wind_speed_max: s.measurements?.wind_speed_max,
          wind_speed_min: s.measurements?.wind_speed_min,
          wind_heading: s.measurements?.wind_heading,
          date: s.measurements?.date,
        },
        status: { state: s.status?.state },
      })),
    };

    cachedData = stripped;
    cacheTimestamp = now;

    return NextResponse.json(stripped);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pioupiou proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
