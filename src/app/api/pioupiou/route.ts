import { NextResponse } from 'next/server';

export async function GET() {
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

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pioupiou proxy] fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
