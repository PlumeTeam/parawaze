import { NextResponse } from 'next/server';

export async function GET() {
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

    // Merge station metadata with its latest reading
    const merged = (balises as any[]).map((b: any) => ({
      ...b,
      reading: latestReading[String(b.idBalise)] ?? null,
    }));

    return NextResponse.json(merged);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ffvl proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
