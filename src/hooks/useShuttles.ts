'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shuttle, ShuttlePassenger, CreateShuttleInput, UpdateShuttleInput } from '@/lib/types';

export function useShuttles() {
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShuttles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('shuttles_with_geo')
        .select('*, profiles(*)')
        .eq('is_active', true)
        .gt('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(50);

      if (err) throw err;
      // Map GeoJSON columns to the expected interface
      const mapped = (data || []).map((s: any) => ({
        ...s,
        meeting_point: s.meeting_point_geo || null,
        destination: s.destination_geo || null,
      }));
      setShuttles(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getShuttle = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('shuttles_with_geo')
      .select('*, profiles(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { ...data, meeting_point: data.meeting_point_geo || null, destination: data.destination_geo || null } as Shuttle;
  }, []);

  const getShuttlePassengers = useCallback(async (shuttleId: string) => {
    const { data, error } = await supabase
      .from('shuttle_passengers')
      .select('*, profiles(*)')
      .eq('shuttle_id', shuttleId);

    if (error) throw error;
    return (data || []) as ShuttlePassenger[];
  }, []);

  const createShuttle = useCallback(
    async (input: CreateShuttleInput, userId: string) => {
      const expiresAt = new Date(input.departure_time);
      expiresAt.setHours(expiresAt.getHours() + 12);

      const shuttleData: any = {
        author_id: userId,
        shuttle_type: input.shuttle_type,
        meeting_point_name: input.meeting_point_name,
        destination_name: input.destination_name,
        departure_time: input.departure_time,
        total_seats: input.total_seats,
        taken_seats: 0,
        price_per_person: input.price_per_person || null,
        return_requested: input.return_requested,
        return_time: input.return_time || null,
        description: input.description || null,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      };

      // Two-pin location picker (preferred)
      if (input.meeting_lat != null && input.meeting_lng != null) {
        shuttleData.meeting_point = `POINT(${input.meeting_lng} ${input.meeting_lat})`;
        shuttleData.meeting_point_alt = input.meeting_alt || null;
      } else if (input.latitude && input.longitude) {
        // Legacy single-pin fallback
        shuttleData.meeting_point = `POINT(${input.longitude} ${input.latitude})`;
        shuttleData.meeting_point_alt = input.altitude_m || null;
      }

      if (input.dest_lat != null && input.dest_lng != null) {
        shuttleData.destination = `POINT(${input.dest_lng} ${input.dest_lat})`;
        shuttleData.destination_alt = input.dest_alt || null;
      }

      const { data, error } = await supabase
        .from('shuttles')
        .insert(shuttleData)
        .select('*, profiles(*)')
        .single();

      if (error) throw error;
      return data as Shuttle;
    },
    []
  );

  const joinShuttle = useCallback(
    async (shuttleId: string, userId: string, seats: number = 1) => {
      const { data, error } = await supabase
        .from('shuttle_passengers')
        .insert({
          shuttle_id: shuttleId,
          user_id: userId,
          seats_taken: seats,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ShuttlePassenger;
    },
    []
  );

  const leaveShuttle = useCallback(
    async (shuttleId: string, userId: string) => {
      const { error } = await supabase
        .from('shuttle_passengers')
        .delete()
        .eq('shuttle_id', shuttleId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    []
  );

  const isUserInShuttle = useCallback(
    async (shuttleId: string, userId: string): Promise<boolean> => {
      const { data } = await supabase
        .from('shuttle_passengers')
        .select('id')
        .eq('shuttle_id', shuttleId)
        .eq('user_id', userId)
        .maybeSingle();

      return !!data;
    },
    []
  );

  const updateShuttle = useCallback(
    async (id: string, updates: UpdateShuttleInput) => {
      const { data, error } = await supabase
        .from('shuttles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, profiles(*)')
        .single();

      if (error) throw error;
      return data as Shuttle;
    },
    []
  );

  const cancelShuttle = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('shuttles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    []
  );

  const acceptPassenger = useCallback(
    async (shuttleId: string, userId: string) => {
      const { error } = await supabase
        .from('shuttle_passengers')
        .update({ status: 'accepted' })
        .eq('shuttle_id', shuttleId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    []
  );

  const rejectPassenger = useCallback(
    async (shuttleId: string, userId: string) => {
      // Get passenger seats before deleting
      const { data: passenger } = await supabase
        .from('shuttle_passengers')
        .select('seats_taken')
        .eq('shuttle_id', shuttleId)
        .eq('user_id', userId)
        .single();

      const { error } = await supabase
        .from('shuttle_passengers')
        .delete()
        .eq('shuttle_id', shuttleId)
        .eq('user_id', userId);

      if (error) throw error;

      // Decrement taken_seats on the shuttle
      if (passenger) {
        const { data: shuttle } = await supabase
          .from('shuttles')
          .select('taken_seats')
          .eq('id', shuttleId)
          .single();

        if (shuttle) {
          await supabase
            .from('shuttles')
            .update({ taken_seats: Math.max(0, shuttle.taken_seats - passenger.seats_taken) })
            .eq('id', shuttleId);
        }
      }
    },
    []
  );

  return {
    shuttles,
    loading,
    error,
    fetchShuttles,
    getShuttle,
    getShuttlePassengers,
    createShuttle,
    joinShuttle,
    leaveShuttle,
    isUserInShuttle,
    updateShuttle,
    cancelShuttle,
    acceptPassenger,
    rejectPassenger,
  };
}
