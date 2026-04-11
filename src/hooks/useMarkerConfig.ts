'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MarkerConfig } from '@/lib/types';

export function useMarkerConfig() {
  const [configs, setConfigs] = useState<MarkerConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkerConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('marker_config')
        .select('*')
        .order('marker_type', { ascending: true });

      if (err) throw err;
      setConfigs(data || []);
    } catch (e: any) {
      console.error('[ParaWaze] Failed to fetch marker configs:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getConfigByType = useCallback((markerType: string): MarkerConfig | undefined => {
    return configs.find((c) => c.marker_type === markerType);
  }, [configs]);

  const updateMarkerConfig = useCallback(async (id: string, updates: Partial<MarkerConfig>) => {
    try {
      const { data, error: err } = await supabase
        .from('marker_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;

      // Update local state
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c))
      );
      return data;
    } catch (e: any) {
      console.error('[ParaWaze] Failed to update marker config:', e.message);
      throw e;
    }
  }, []);

  const getConfigsAsMap = useCallback((): Record<string, MarkerConfig> => {
    const map: Record<string, MarkerConfig> = {};
    configs.forEach((c) => {
      map[c.marker_type] = c;
    });
    return map;
  }, [configs]);

  return {
    configs,
    loading,
    error,
    fetchMarkerConfigs,
    getConfigByType,
    updateMarkerConfig,
    getConfigsAsMap,
  };
}
