'use client';

import { useState, useCallback, useEffect } from 'react';

export interface WindsMobiStation {
  _id: string;
  name: string;
  short: string;
  alt: number | null;
  /** GeoJSON Point — coordinates are [longitude, latitude] */
  loc: { type: 'Point'; coordinates: [number, number] };
  last: {
    /** Unix timestamp of measurement */
    _id: number;
    /** Wind direction in degrees (0-359, where wind comes FROM) */
    'w-dir'?: number;
    /** Average wind speed in km/h */
    'w-avg'?: number;
    /** Max / gust wind speed in km/h */
    'w-max'?: number;
    /** Temperature in °C */
    temp?: number;
  } | null;
  /** Provider name, e.g. "holfuy.com", "meteogroup.com" */
  'pv-name': string;
  /** Provider-specific station URLs keyed by language code */
  url?: Record<string, string>;
}

/**
 * Hook to fetch live wind data from winds.mobi stations in the Alpine region.
 * Covers Switzerland, Austria, Germany (Bavaria), northern Italy, and Slovenia.
 * Pioupiou/FFVL stations are filtered out server-side to avoid duplicates.
 */
export function useWindsMobi() {
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

      const valid = (data as WindsMobiStation[]).filter(
        (s) =>
          s.loc?.coordinates?.[0] != null &&
          s.loc?.coordinates?.[1] != null,
      );
      setStations(valid);
    } catch (err) {
      console.error('[ParaWaze] winds.mobi fetch error:', err);
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
