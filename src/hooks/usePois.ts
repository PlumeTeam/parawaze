'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Poi, CreatePoiInput, PoiVote } from '@/lib/types';

export function usePois() {
  const { user } = useAuth();
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPois = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('pois_with_geo')
        .select('*, profiles!pois_author_id_fkey(id, username, display_name, avatar_url)')
        .eq('is_active', true)
        .order('location_name', { ascending: true });

      if (err) throw err;

      // Map the view fields to our Poi interface
      const mapped: Poi[] = (data || []).map((row: any) => ({
        id: row.id,
        author_id: row.author_id,
        poi_type: row.poi_type,
        location: row.location_geo
          ? { type: 'Point' as const, coordinates: [row.location_geo.coordinates[0], row.location_geo.coordinates[1]] }
          : row.location || null,
        location_name: row.location_name,
        altitude_m: row.altitude_m,
        description: row.description,
        wind_orientations: row.wind_orientations || [],
        difficulty: row.difficulty,
        ffvl_approved: row.ffvl_approved ?? false,
        station_url: row.station_url,
        station_provider: row.station_provider,
        webcam_url: row.webcam_url,
        webcam_orientation: row.webcam_orientation,
        total_rating_sum: row.total_rating_sum ?? 34,
        total_votes: row.total_votes ?? 11,
        is_active: row.is_active,
        average_rating: row.average_rating ?? 3.09,
        profiles: row.profiles,
      }));

      setPois(mapped);
    } catch (err: any) {
      console.error('[usePois] fetchPois error:', err);
      setError(err.message || 'Erreur lors du chargement des sites');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPoi = useCallback(async (input: CreatePoiInput) => {
    if (!user) throw new Error('Non connecté');

    const insertData: any = {
      author_id: user.id,
      poi_type: input.poi_type,
      location_name: input.location_name,
      altitude_m: input.altitude_m || null,
      description: input.description || null,
      wind_orientations: input.wind_orientations || [],
      difficulty: input.difficulty || null,
      ffvl_approved: input.ffvl_approved || false,
      station_url: input.station_url || null,
      station_provider: input.station_provider || null,
      webcam_url: input.webcam_url || null,
      webcam_orientation: input.webcam_orientation || null,
    };

    // Set PostGIS point if coordinates provided
    if (input.latitude !== undefined && input.longitude !== undefined) {
      insertData.location = `SRID=4326;POINT(${input.longitude} ${input.latitude})`;
    }

    const { data, error: err } = await supabase
      .from('pois')
      .insert(insertData)
      .select()
      .single();

    if (err) throw err;
    return data;
  }, [user]);

  const votePoi = useCallback(async (poiId: string, rating: number) => {
    if (!user) throw new Error('Non connecté');

    const { error: err } = await supabase
      .from('poi_votes')
      .upsert(
        { poi_id: poiId, user_id: user.id, rating },
        { onConflict: 'poi_id,user_id' }
      );

    if (err) throw err;
  }, [user]);

  const getUserVote = useCallback(async (poiId: string): Promise<number | null> => {
    if (!user) return null;

    const { data, error: err } = await supabase
      .from('poi_votes')
      .select('rating')
      .eq('poi_id', poiId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (err) {
      console.error('[usePois] getUserVote error:', err);
      return null;
    }
    return data?.rating ?? null;
  }, [user]);

  const getPoi = useCallback(async (id: string): Promise<Poi | null> => {
    const { data, error: err } = await supabase
      .from('pois_with_geo')
      .select('*, profiles!pois_author_id_fkey(id, username, display_name, avatar_url)')
      .eq('id', id)
      .single();

    if (err) {
      console.error('[usePois] getPoi error:', err);
      return null;
    }

    const row = data as any;
    return {
      id: row.id,
      author_id: row.author_id,
      poi_type: row.poi_type,
      location: row.location_geo
        ? { type: 'Point' as const, coordinates: [row.location_geo.coordinates[0], row.location_geo.coordinates[1]] }
        : row.location || null,
      location_name: row.location_name,
      altitude_m: row.altitude_m,
      description: row.description,
      wind_orientations: row.wind_orientations || [],
      difficulty: row.difficulty,
      ffvl_approved: row.ffvl_approved ?? false,
      station_url: row.station_url,
      station_provider: row.station_provider,
      webcam_url: row.webcam_url,
      webcam_orientation: row.webcam_orientation,
      total_rating_sum: row.total_rating_sum ?? 34,
      total_votes: row.total_votes ?? 11,
      is_active: row.is_active,
      average_rating: row.average_rating ?? 3.09,
      profiles: row.profiles,
    };
  }, []);

  return {
    pois,
    loading,
    error,
    fetchPois,
    createPoi,
    votePoi,
    getUserVote,
    getPoi,
  };
}