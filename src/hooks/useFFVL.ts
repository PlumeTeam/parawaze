'use client';

import { useState, useCallback, useEffect } from 'react';

export interface FFVLStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  departement: string | null;
  windAvg: number | null;
  windMax: number | null;
  windMin: number | null;
  windDirection: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  lastUpdate: string | null;
  url: string | null;
}

/**
 * Hook to fetch live wind data from FFVL (Fédération Française de Vol Libre) stations.
 * Open data, no API key required.
 */
export function useFFVL() {
  const [stations, setStations] = useState<FFVLStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ffvl');
      if (!res.ok) throw new Error(`FFVL API error: ${res.status}`);
      const data = await res.json();

      const mapped: FFVLStation[] = (data as any[])
        .filter(
          (s: any) =>
            s.latitude != null &&
            s.longitude != null &&
            Number(s.latitude) !== 0 &&
            Number(s.longitude) !== 0,
        )
        .map((s: any) => ({
          id: Number(s.idBalise),
          name: s.nom || `FFVL ${s.idBalise}`,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          altitude: s.altitude != null && s.altitude !== '' ? Number(s.altitude) : null,
          departement: s.departement || null,
          windAvg: s.reading?.vitesseVentMoy != null ? Number(s.reading.vitesseVentMoy) : null,
          windMax: s.reading?.vitesseVentMax != null ? Number(s.reading.vitesseVentMax) : null,
          windMin: s.reading?.vitesseVentMin != null ? Number(s.reading.vitesseVentMin) : null,
          windDirection: s.reading?.directVentMoy != null ? Number(s.reading.directVentMoy) : null,
          temperature: s.reading?.temperature != null && s.reading.temperature !== '' ? Number(s.reading.temperature) : null,
          humidity: s.reading?.hydrometrie != null && s.reading.hydrometrie !== '' ? Number(s.reading.hydrometrie) : null,
          pressure: s.reading?.pression != null && s.reading.pression !== '' ? Number(s.reading.pression) : null,
          lastUpdate: s.reading?.date ?? null,
          url: s.url || null,
        }));

      setStations(mapped);
    } catch (err) {
      console.error('[ParaWaze] FFVL fetch error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount and refresh every 5 minutes
  useEffect(() => {
    fetchStations();
    const interval = setInterval(fetchStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStations]);

  return { stations, loading, error, fetchStations };
}
