'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WeatherReport, CreateReportInput } from '@/lib/types';

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
        .select('*, profiles(*), report_images(*)')
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
            .select('*, profiles(*), report_images(*)')
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
      .select('*, profiles(*), report_images(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    fetchReports,
    fetchReportsInRadius,
    createReport,
    uploadImage,
    getReport,
    getUserReports,
  };
}
