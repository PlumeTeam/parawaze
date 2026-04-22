'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WeatherReport, CreateReportInput, ForecastScenario } from '@/lib/types';

export type DayFilter = 'yesterday' | 'today' | 'tomorrow';

export function useReports() {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('weather_reports')
        .select('*, profiles(*), report_images(*), forecast_scenarios(*)')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (err) throw err;

      setReports(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportsByDay = useCallback(async (day: DayFilter) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      // Build local-time day boundaries
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      let query = supabase
        .from('weather_reports')
        .select('*, profiles(*), report_images(*), forecast_scenarios(*)')
        .order('created_at', { ascending: false })
        .limit(100);

      const todayStr = todayStart.toISOString().split('T')[0];

      if (day === 'yesterday') {
        // Only observations/image_shares from yesterday — NEVER forecasts
        query = query
          .in('report_type', ['observation', 'image_share'])
          .gte('created_at', yesterdayStart.toISOString())
          .lt('created_at', todayStart.toISOString())
          .eq('is_active', true)
          .gt('expires_at', now.toISOString());
      } else if (day === 'today') {
        // Observations created today + forecasts where forecast_date = today (or null = default to today)
        query = query
          .eq('is_active', true)
          .gt('expires_at', now.toISOString())
          .or(
            `and(report_type.in.(observation,image_share),created_at.gte.${todayStart.toISOString()}),and(report_type.eq.forecast,or(forecast_date.eq.${todayStr},forecast_date.is.null))`
          );
      } else {
        // Tomorrow: ONLY forecasts with forecast_date = tomorrow
        const tomorrowStr = tomorrowStart.toISOString().split('T')[0];
        query = query
          .eq('report_type', 'forecast')
          .eq('forecast_date', tomorrowStr)
          .eq('is_active', true)
          .gt('expires_at', now.toISOString());
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setReports(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportsInRadius = useCallback(
    async (lat: number, lng: number, radiusKm: number = 50) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase.rpc('get_reports_in_radius', {
          lat,
          lng,
          radius_km: radiusKm,
        });

        if (err) {
          // Fallback to normal fetch if RPC fails
          await fetchReports();
          return;
        }

        // Re-fetch with joins for the returned IDs
        if (data && data.length > 0) {
          const ids = data.map((r: any) => r.id);
          const { data: full } = await supabase
            .from('weather_reports')
            .select('*, profiles(*), report_images(*), forecast_scenarios(*)')
            .in('id', ids)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

          setReports(full || []);
        } else {
          setReports([]);
        }
      } catch (e: any) {
        setError(e.message);
        await fetchReports();
      } finally {
        setLoading(false);
      }
    },
    [fetchReports]
  );

  const createReport = useCallback(
    async (input: CreateReportInput, userId: string) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const reportData: any = {
        author_id: userId,
        report_type: input.report_type,
        location_name: input.location_name,
        share_location: input.share_location,
        altitude_m: input.altitude_m || null,
        title: input.title || null,
        description: input.description || null,
        wind_speed_kmh: input.wind_speed_kmh || null,
        wind_gust_kmh: input.wind_gust_kmh || null,
        wind_direction: input.wind_direction || null,
        temperature_c: input.temperature_c ?? null,
        cloud_ceiling_m: input.cloud_ceiling_m || null,
        visibility_km: input.visibility_km || null,
        thermal_quality: input.thermal_quality || null,
        turbulence_level: input.turbulence_level || null,
        flyability_score: input.flyability_score || null,
        tags: input.tags || [],
        forecast_date: input.forecast_date || null,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      };

      if (input.share_location && input.latitude && input.longitude) {
        reportData.location = `POINT(${input.longitude} ${input.latitude})`;
      }

      const { data, error } = await supabase
        .from('weather_reports')
        .insert(reportData)
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      // Insert forecast scenarios if any
      if (data && input.forecast_scenarios && input.forecast_scenarios.length > 0) {
        const scenarioRows = input.forecast_scenarios.map((s) => ({
          report_id: data.id,
          hour_slot: s.hour_slot,
          wind_speed_kmh: s.wind_speed_kmh ?? null,
          wind_gust_kmh: s.wind_gust_kmh ?? null,
          wind_direction: s.wind_direction ?? null,
          turbulence_level: s.turbulence_level ?? null,
          thermal_quality: s.thermal_quality ?? null,
          flyability_score: s.flyability_score ?? null,
          description: s.description ?? null,
        }));

        const { error: scenarioError } = await supabase
          .from('forecast_scenarios')
          .insert(scenarioRows);

        if (scenarioError) console.error('Error inserting scenarios:', scenarioError);
      }

      return data;
    },
    []
  );

  const uploadImage = useCallback(
    async (reportId: string, file: File, sortOrder: number) => {
      const ext = file.name.split('.').pop();
      const path = `${reportId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(path);

      const { data, error } = await supabase
        .from('report_images')
        .insert({
          report_id: reportId,
          storage_path: path,
          url: publicUrl,
          caption: null,
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const getReport = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('weather_reports')
      .select('*, profiles(*), report_images(*), forecast_scenarios(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateReport = useCallback(
    async (id: string, updates: Partial<CreateReportInput>) => {
      const updateData: any = {};
      if (updates.report_type !== undefined) updateData.report_type = updates.report_type;
      if (updates.location_name !== undefined) updateData.location_name = updates.location_name;
      if (updates.altitude_m !== undefined) updateData.altitude_m = updates.altitude_m || null;
      if (updates.title !== undefined) updateData.title = updates.title || null;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.wind_speed_kmh !== undefined) updateData.wind_speed_kmh = updates.wind_speed_kmh || null;
      if (updates.wind_gust_kmh !== undefined) updateData.wind_gust_kmh = updates.wind_gust_kmh || null;
      if (updates.wind_direction !== undefined) updateData.wind_direction = updates.wind_direction || null;
      if (updates.temperature_c !== undefined) updateData.temperature_c = updates.temperature_c ?? null;
      if (updates.cloud_ceiling_m !== undefined) updateData.cloud_ceiling_m = updates.cloud_ceiling_m || null;
      if (updates.visibility_km !== undefined) updateData.visibility_km = updates.visibility_km || null;
      if (updates.thermal_quality !== undefined) updateData.thermal_quality = updates.thermal_quality || null;
      if (updates.turbulence_level !== undefined) updateData.turbulence_level = updates.turbulence_level || null;
      if (updates.flyability_score !== undefined) updateData.flyability_score = updates.flyability_score || null;
      if (updates.tags !== undefined) updateData.tags = updates.tags || [];
      if (updates.forecast_date !== undefined) updateData.forecast_date = updates.forecast_date || null;

      const { data, error } = await supabase
        .from('weather_reports')
        .update(updateData)
        .eq('id', id)
        .select('*, profiles(*), report_images(*), forecast_scenarios(*)')
        .single();

      if (error) throw error;

      // Update forecast scenarios if provided
      if (updates.forecast_scenarios !== undefined) {
        // Delete existing scenarios
        await supabase.from('forecast_scenarios').delete().eq('report_id', id);

        // Insert new scenarios
        if (updates.forecast_scenarios && updates.forecast_scenarios.length > 0) {
          const scenarioRows = updates.forecast_scenarios.map((s) => ({
            report_id: id,
            hour_slot: s.hour_slot,
            wind_speed_kmh: s.wind_speed_kmh ?? null,
            wind_gust_kmh: s.wind_gust_kmh ?? null,
            wind_direction: s.wind_direction ?? null,
            turbulence_level: s.turbulence_level ?? null,
            thermal_quality: s.thermal_quality ?? null,
            flyability_score: s.flyability_score ?? null,
            description: s.description ?? null,
          }));
          await supabase.from('forecast_scenarios').insert(scenarioRows);
        }
      }

      return data;
    },
    []
  );

  const deleteReport = useCallback(async (id: string) => {
    // Delete related data first
    await supabase.from('forecast_scenarios').delete().eq('report_id', id);
    await supabase.from('report_images').delete().eq('report_id', id);
    await supabase.from('report_reactions').delete().eq('report_id', id);

    const { error } = await supabase
      .from('weather_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  const getUserReports = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('weather_reports')
      .select('*, report_images(*)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }, []);

  return {
    reports,
    loading,
    error,
    fetchReports,
    fetchReportsByDay,
    fetchReportsInRadius,
    createReport,
    updateReport,
    deleteReport,
    uploadImage,
    getReport,
    getUserReports,
  };
}
