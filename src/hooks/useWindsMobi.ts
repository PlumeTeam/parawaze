'use client';

import { useState, useCallback, useEffect } from 'react';

export interface WindsMobiStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  pvCode: string;
  pvName: string;
  windAvg: number | null;
  windMax: number | null;
  windDirection: number | null;
  temperature: number | null;
  status: string | null;
  lastUpdate: number | null; // unix timestamp
  url: string | null;
}

/**
 * Hook to fetch live wind data from winds.mobi stations covering the Alpine region
 * (Switzerland, Austria, Germany, Italy, Slovenia). Excludes Pioupiou and FFVL
 * stations which have their own dedicated integrations.
 */
export function useWindsMobi(enabled = true) {
  const [stations, setStations] = useState<WindsMobiStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/winds-mobi');
      if (!res.ok) throw new Error(`winds.mobi API error: ${res.status}`);
      const data = await res.json();

      const mapped: WindsMobiStation[] = (data as any[])
        .filter(
          (s: any) =>
            s.loc?.coordinates?.[0] != null &&
            s.loc?.coordinates?.[1] != null,
        )
        .map((s: any) => ({
          id: s._id,
          name: (s.name || s.short || s._id).trim(),
          lat: s.loc.coordinates[1],
          lng: s.loc.coordinates[0],
          altitude: s.alt ?? null,
          pvCode: s['pv-code'] || '',
          pvName: s['pv-name'] || '',
          windAvg: s.last?.['w-avg'] ?? null,
          windMax: s.last?.['w-max'] ?? null,
          windDirection: s.last?.['w-dir'] ?? null,
          temperature: s.last?.temp ?? null,
          status: s.status || null,
          lastUpdate: s.last?._id ?? null,
          url: s.url?.default || s.url?.en || null,
        }));

      setStations(mapped);
    } catch (err) {
      console.error('[ParaWaze] winds.mobi fetch error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchStations();
    const interval = setInterval(fetchStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStations, enabled]);

  return { stations, loading, error, fetchStations };
}
