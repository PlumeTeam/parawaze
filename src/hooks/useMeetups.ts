'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Meetup, CreateMeetupInput } from '@/lib/types';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useMeetups() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMeetups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const now = new Date().toISOString();

      // Fetch public meetups + friends_only meetups where we are friends
      const { data, error: err } = await supabase
        .from('meetups')
        .select('*, profiles(*), meetup_participants(*, profiles(*))')
        .eq('is_active', true)
        .gt('expires_at', now)
        .order('meeting_time', { ascending: true });

      if (err) throw err;

      // Filter out friends_only meetups where user is not a participant/author or friend
      // For simplicity, show all public + friends_only where user is author or participant
      const filtered = (data || []).filter((m: Meetup) => {
        if (m.visibility === 'public') return true;
        if (!user) return false;
        if (m.author_id === user.id) return true;
        return (m.meetup_participants || []).some((p: any) => p.user_id === user.id);
      });

      setMeetups(filtered);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMeetup = useCallback(async (data: CreateMeetupInput): Promise<Meetup> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Meetup expires 24h after meeting_time by default
    const meetingDate = new Date(data.meeting_time);
    const expiresAt = new Date(meetingDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    const insertData: any = {
      author_id: user.id,
      title: data.title,
      description: data.description || null,
      location_name: data.location_name || null,
      altitude_m: data.altitude_m || null,
      meeting_time: data.meeting_time,
      visibility: data.visibility,
      max_participants: data.max_participants,
      is_active: true,
      expires_at: expiresAt.toISOString(),
    };

    if (data.latitude != null && data.longitude != null) {
      insertData.location = `POINT(${data.longitude} ${data.latitude})`;
    }

    const { data: result, error } = await supabase
      .from('meetups')
      .insert(insertData)
      .select('*, profiles(*), meetup_participants(*, profiles(*))')
      .single();

    if (error) throw error;

    // Auto-join as author
    await supabase.from('meetup_participants').insert({
      meetup_id: result.id,
      user_id: user.id,
      status: 'going',
    });

    await fetchMeetups();
    return result;
  }, [fetchMeetups]);

  const joinMeetup = useCallback(async (meetupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase
      .from('meetup_participants')
      .insert({ meetup_id: meetupId, user_id: user.id, status: 'going' });

    if (error) throw error;
    await fetchMeetups();
  }, [fetchMeetups]);

  const leaveMeetup = useCallback(async (meetupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase
      .from('meetup_participants')
      .delete()
      .eq('meetup_id', meetupId)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchMeetups();
  }, [fetchMeetups]);

  const cancelMeetup = useCallback(async (meetupId: string) => {
    const { error } = await supabase
      .from('meetups')
      .update({ is_active: false })
      .eq('id', meetupId);

    if (error) throw error;
    setMeetups((prev) => prev.filter((m) => m.id !== meetupId));
  }, []);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchMeetups();
    intervalRef.current = setInterval(fetchMeetups, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMeetups]);

  return {
    meetups,
    loading,
    error,
    fetchMeetups,
    createMeetup,
    joinMeetup,
    leaveMeetup,
    cancelMeetup,
  };
}
