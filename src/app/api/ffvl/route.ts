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
    const [baliseRes, relevesRes] = await Promise.all([
      fetch('https://data.ffvl.fr/json/balises.json', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
      fetch('https://data.ffvl.fr/json/relevesmeteo.json', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
    ]);

    if (!baliseRes.ok) {
      return NextResponse.json(
        { error: `FFVL balises API error: ${baliseRes.status}` },
        { status: baliseRes.status },
      );
    }
    if (!relevesRes.ok) {
      return NextResponse.json(
        { error: `FFVL releves API error: ${relevesRes.status}` },
        { status: relevesRes.status },
      );
    }

    const balises = await baliseRes.json();
    const releves = await relevesRes.json();

    // Build map of idbalise -> latest reading (most recent date wins)
    const latestReading: Record<string, any> = {};
    for (const r of releves as any[]) {
      const id = String(r.idbalise);
      if (!latestReading[id] || r.date > latestReading[id].date) {
        latestReading[id] = r;
      }
    }

    // Merge and strip to only fields the hook consumes
    const merged = (balises as any[]).map((b: any) => {
      const r = latestReading[String(b.idBalise)] ?? null;
      return {
        idBalise: b.idBalise,
        nom: b.nom,
        latitude: b.latitude,
        longitude: b.longitude,
        altitude: b.altitude,
        departement: b.departement,
        url: b.url,
        reading: r
          ? {
              vitesseVentMoy: r.vitesseVentMoy,
              vitesseVentMax: r.vitesseVentMax,
              vitesseVentMin: r.vitesseVentMin,
              directVentMoy: r.directVentMoy,
              temperature: r.temperature,
              hydrometrie: r.hydrometrie,
              pression: r.pression,
              date: r.date,
            }
          : null,
      };
    });

    cachedData = merged;
    cacheTimestamp = now;

    return NextResponse.json(merged);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ffvl proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
