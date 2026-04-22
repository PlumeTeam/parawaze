'use client';

import { useState, useCallback, useEffect } from 'react';

export interface GeoSphereStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  /** Austrian Bundesland (state) */
  state: string | null;
  /** Wind direction in degrees (where wind comes FROM, 0–360) */
  windDirection: number | null;
  /** 10-min average wind speed in km/h */
  windAvg: number | null;
  /** Wind gust (peak) in km/h */
  windGust: number | null;
  /** Air temperature in °C */
  temperature: number | null;
  /** ISO 8601 timestamp of the observation */
  timestamp: string | null;
}

/**
 * Hook to fetch live wind data from GeoSphere Austria (TAWES network).
 * 271+ official Austrian weather stations, updated every 10 minutes.
 * Open data (CC BY 4.0), no authentication required.
 */
export function useGeoSphere({ enabled = true }: { enabled?: boolean } = {}) {
  const [stations, setStations] = useState<GeoSphereStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/geosphere');
      if (!res.ok) throw new Error(`GeoSphere API error: ${res.status}`);
      const data = await res.json();

      const valid: GeoSphereStation[] = (data as any[]).filter(
        (s: any) => s.lat != null && s.lng != null,
      );
      setStations(valid);
    } catch (err) {
      console.error('[ParaWaze] GeoSphere fetch error:', err);
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
