'use client';

import { useState, useCallback, useEffect } from 'react';

export interface PioupiouStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  windAvg: number | null;
  windMax: number | null;
  windMin: number | null;
  windHeading: number | null;
  isOnline: boolean;
  lastUpdate: string | null;
}

/**
 * Hook to fetch live wind data from all Pioupiou / OpenWindMap stations.
 * API is free, no key required, CORS enabled.
 */
export function usePioupiou({ enabled = true }: { enabled?: boolean } = {}) {
  const [stations, setStations] = useState<PioupiouStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pioupiou');
      if (!res.ok) throw new Error(`Pioupiou API error: ${res.status}`);
      const data = await res.json();

      const mapped: PioupiouStation[] = (data.data || [])
        .filter(
          (s: any) =>
            s.location?.latitude != null &&
            s.location?.longitude != null &&
            s.location.latitude !== 0 &&
            s.location.longitude !== 0,
        )
        .map((s: any) => ({
          id: s.id,
          name: s.meta?.name || `Pioupiou ${s.id}`,
          lat: s.location.latitude,
          lng: s.location.longitude,
          windAvg: s.measurements?.wind_speed_avg ?? null,
          windMax: s.measurements?.wind_speed_max ?? null,
          windMin: s.measurements?.wind_speed_min ?? null,
          windHeading: s.measurements?.wind_heading ?? null,
          isOnline: s.status?.state === 'on',
          lastUpdate: s.measurements?.date ?? null,
        }));

      setStations(mapped);
    } catch (err) {
      console.error('[ParaWaze] Pioupiou fetch error:', err);
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
