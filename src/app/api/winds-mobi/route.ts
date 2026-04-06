import { NextResponse } from 'next/server';

// Alpine region bounding box covering Switzerland, Austria, Germany (Bavaria),
// northern Italy, and Slovenia — countries not covered by FFVL (France only)
// or Pioupiou (filtered out below).
const BBOX = {
  pt1Lat: 43,
  pt1Lon: 5,
  pt2Lat: 49,
  pt2Lon: 17,
};

export async function GET() {
  try {
    const url = new URL('https://winds.mobi/api/2.3/stations/');
    url.searchParams.set('within-pt1-lat', String(BBOX.pt1Lat));
    url.searchParams.set('within-pt1-lon', String(BBOX.pt1Lon));
    url.searchParams.set('within-pt2-lat', String(BBOX.pt2Lat));
    url.searchParams.set('within-pt2-lon', String(BBOX.pt2Lon));
    url.searchParams.set('limit', '500');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // 5-minute server-side cache
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `winds.mobi API error: ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Filter out Pioupiou/OpenWindMap stations — already covered by /api/pioupiou.
    // winds.mobi aggregates them under IDs prefixed "pioupiou-".
    const filtered = (data || []).filter((s: any) => {
      const id = String(s._id || '');
      return !id.startsWith('pioupiou-');
    });

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[winds-mobi proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
