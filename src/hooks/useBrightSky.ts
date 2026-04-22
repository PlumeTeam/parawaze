'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BrightSkyStation {
  id: number;
  dwd_station_id: string | null;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  wind_speed_kmh: number;
  wind_direction_deg: number | null;
  wind_gust_kmh: number | null;
  wind_gust_direction_deg: number | null;
  temperature_c: number | null;
  timestamp: string | null;
}

export function useBrightSky(enabled = true) {
  const [stations, setStations] = useState<BrightSkyStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brightsky');
      if (!res.ok) throw new Error(`BrightSky API error: ${res.status}`);
      const data: { stations: BrightSkyStation[] } = await res.json();
      setStations(data.stations ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      console.error('[useBrightSky]', e);
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

  return { stations, loading, error, refetch: fetchStations };
}
