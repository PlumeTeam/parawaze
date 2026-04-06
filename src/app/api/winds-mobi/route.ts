import { NextResponse } from 'next/server';

// Alpine bounding box: covers Switzerland, Austria, Germany (Bavaria), Italy (N), Slovenia
const BBOX = {
  pt1Lat: 43,
  pt1Lon: 5,
  pt2Lat: 49,
  pt2Lon: 17,
};

// Providers with dedicated integrations — skip to avoid duplicate markers
const EXCLUDED_PROVIDERS = new Set(['pioupiou', 'ffvl']);

export async function GET() {
  try {
    const params = new URLSearchParams({
      'within-pt1-lat': String(BBOX.pt1Lat),
      'within-pt1-lon': String(BBOX.pt1Lon),
      'within-pt2-lat': String(BBOX.pt2Lat),
      'within-pt2-lon': String(BBOX.pt2Lon),
      limit: '500',
    });

    const res = await fetch(`https://winds.mobi/api/2.3/stations/?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // cache 5 minutes on Vercel edge
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `winds.mobi API error: ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Remove stations already covered by Pioupiou and FFVL integrations
    const filtered = (data as any[]).filter(
      (s: any) => !EXCLUDED_PROVIDERS.has((s['pv-code'] ?? '').toLowerCase()),
    );

    return NextResponse.json(filtered);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[winds-mobi proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
