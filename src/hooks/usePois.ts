'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Poi, CreatePoiInput, PoiVote, PoiEdit, PoiComment } from '@/lib/types';

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
      total_rating_sum: row.total_rating_sum ?? 34,
      total_votes: row.total_votes ?? 11,
      is_active: row.is_active,
      average_rating: row.average_rating ?? 3.09,
      profiles: row.profiles,
    };
  }, []);

  // === Wiki: Edit a POI field ===
  const editPoiField = useCallback(async (
    poiId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    reason?: string
  ) => {
    if (!user) throw new Error('Non connecte');

    // 1. Update the POI field directly (wiki-style, immediate)
    const { error: updateErr } = await supabase
      .from('pois')
      .update({ [fieldName]: fieldName === 'wind_orientations' ? JSON.parse(newValue || '[]') : newValue })
      .eq('id', poiId);

    if (updateErr) throw updateErr;

    // 2. Create the edit record for tracking
    const { data, error: editErr } = await supabase
      .from('poi_edits')
      .insert({
        poi_id: poiId,
        editor_id: user.id,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        reason: reason || null,
        is_applied: true,
      })
      .select('*, profiles!poi_edits_editor_id_fkey(id, username, display_name, avatar_url)')
      .single();

    if (editErr) throw editErr;
    return data;
  }, [user]);

  // === Wiki: Get edit history for a POI ===
  const getPoiEdits = useCallback(async (poiId: string): Promise<PoiEdit[]> => {
    const { data, error: err } = await supabase
      .from('poi_edits')
      .select('*, profiles!poi_edits_editor_id_fkey(id, username, display_name, avatar_url)')
      .eq('poi_id', poiId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) {
      console.error('[usePois] getPoiEdits error:', err);
      return [];
    }
    return (data || []) as PoiEdit[];
  }, []);

  // === Wiki: Vote on an edit ===
  const voteOnEdit = useCallback(async (editId: string, voteType: 'up' | 'down') => {
    if (!user) throw new Error('Non connecte');

    const { error: err } = await supabase
      .from('poi_edit_votes')
      .upsert(
        { edit_id: editId, user_id: user.id, vote_type: voteType },
        { onConflict: 'edit_id,user_id' }
      );

    if (err) throw err;
  }, [user]);

  // === Wiki: Add a comment ===
  const addComment = useCallback(async (poiId: string, content: string) => {
    if (!user) throw new Error('Non connecte');

    const { data, error: err } = await supabase
      .from('poi_comments')
      .insert({
        poi_id: poiId,
        author_id: user.id,
        content,
      })
      .select('*, profiles!poi_comments_author_id_fkey(id, username, display_name, avatar_url)')
      .single();

    if (err) throw err;
    return data as PoiComment;
  }, [user]);

  // === Wiki: Get comments for a POI ===
  const getComments = useCallback(async (poiId: string): Promise<PoiComment[]> => {
    const { data, error: err } = await supabase
      .from('poi_comments')
      .select('*, profiles!poi_comments_author_id_fkey(id, username, display_name, avatar_url)')
      .eq('poi_id', poiId)
      .order('upvotes', { ascending: false });

    if (err) {
      console.error('[usePois] getComments error:', err);
      return [];
    }
    return (data || []) as PoiComment[];
  }, []);

  // === Wiki: Vote on a comment ===
  const voteOnComment = useCallback(async (commentId: string, voteType: 'up' | 'down') => {
    if (!user) throw new Error('Non connecte');

    const { error: err } = await supabase
      .from('poi_comment_votes')
      .upsert(
        { comment_id: commentId, user_id: user.id, vote_type: voteType },
        { onConflict: 'comment_id,user_id' }
      );

    if (err) throw err;
  }, [user]);

  // === Edit POI GPS position (admin: direct update, community: proposal) ===
  const editPoiPosition = useCallback(async (
    poiId: string,
    oldLat: number,
    oldLng: number,
    newLat: number,
    newLng: number,
    isAdmin: boolean
  ) => {
    if (!user) throw new Error('Non connecte');

    if (isAdmin) {
      const { error: updateErr } = await supabase
        .from('pois')
        .update({ location: `SRID=4326;POINT(${newLng} ${newLat})` })
        .eq('id', poiId);
      if (updateErr) throw updateErr;

      const { error: editErr } = await supabase
        .from('poi_edits')
        .insert({
          poi_id: poiId,
          editor_id: user.id,
          field_name: 'position',
          old_value: `${oldLat.toFixed(6)},${oldLng.toFixed(6)}`,
          new_value: `${newLat.toFixed(6)},${newLng.toFixed(6)}`,
          is_applied: true,
        });
      if (editErr) throw editErr;
    } else {
      const { error: editErr } = await supabase
        .from('poi_edits')
        .insert({
          poi_id: poiId,
          editor_id: user.id,
          field_name: 'position',
          old_value: `${oldLat.toFixed(6)},${oldLng.toFixed(6)}`,
          new_value: `${newLat.toFixed(6)},${newLng.toFixed(6)}`,
          is_applied: false,
        });
      if (editErr) throw editErr;
    }
  }, [user]);

  return {
    pois,
    loading,
    error,
    fetchPois,
    createPoi,
    votePoi,
    getUserVote,
    getPoi,
    // Wiki functions
    editPoiField,
    editPoiPosition,
    getPoiEdits,
    voteOnEdit,
    addComment,
    getComments,
    voteOnComment,
  };
}