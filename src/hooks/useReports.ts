'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WeatherReport } from '@/lib/types';

export type DayFilter = 'yesterday' | 'today' | 'tomorrow';

function getDayRange(day: DayFilter): { start: string; end: string } {
  const now = new Date();
  const target = new Date(now);

  if (day === 'yesterday') {
    target.setDate(target.getDate() - 1);
  } else if (day === 'tomorrow') {
    target.setDate(target.getDate() + 1);
  }

  const start = new Date(target);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  return { start: start.toISOString(), end: end.toISOString() };
}

interface ReportsState {
  reports: WeatherReport[];
  loading: boolean;
  error: string | null;
  fetchReportsByDay: (day: DayFilter) => Promise<void>;
}

export function useReports(): ReportsState {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportsByDay = useCallback(async (day: DayFilter) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDayRange(day);
      const { data, error: err } = await supabase
        .from('weather_reports')
        .select('*, profiles(*), report_images(*)')
        .eq('is_active', true)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw err;
      setReports(data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  return { reports, loading, error, fetchReportsByDay };
}
