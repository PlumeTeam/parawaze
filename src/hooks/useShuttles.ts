'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shuttle } from '@/lib/types';

interface ShuttlesState {
  shuttles: Shuttle[];
  loading: boolean;
  error: string | null;
  fetchShuttles: () => Promise<void>;
}

export function useShuttles(): ShuttlesState {
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShuttles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('shuttles')
        .select('*, profiles(*)')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(100);

      if (err) throw err;
      setShuttles(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  return { shuttles, loading, error, fetchShuttles };
}
