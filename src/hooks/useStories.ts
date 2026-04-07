'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Story } from '@/lib/types';

const STORY_DURATION_HOURS = 24;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('stories')
        .select('*, profiles(*)')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw err;
      setStories(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStory = useCallback(
    async (
      videoBlob: Blob,
      location: { latitude: number; longitude: number },
      locationName?: string
    ): Promise<Story> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine file extension
      const isWebm = videoBlob.type.includes('webm');
      const ext = isWebm ? 'webm' : 'mp4';
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      // Upload video
      const { error: uploadError } = await supabase.storage
        .from('story-videos')
        .upload(storagePath, videoBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: videoBlob.type || `video/${ext}`,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('story-videos').getPublicUrl(storagePath);

      // Set expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + STORY_DURATION_HOURS);

      // Insert DB record
      const { data, error: insertError } = await supabase
        .from('stories')
        .insert({
          author_id: user.id,
          location: `POINT(${location.longitude} ${location.latitude})`,
          location_name: locationName || null,
          storage_path: storagePath,
          video_url: publicUrl,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        })
        .select('*, profiles(*)')
        .single();

      if (insertError) throw insertError;

      // Optimistically add to local state
      setStories((prev) => [data, ...prev]);

      return data;
    },
    []
  );

  const flagStory = useCallback(async (storyId: string, reason?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('story_flags').insert({
      story_id: storyId,
      user_id: user.id,
      reason: reason || null,
    });

    if (error) throw error;

    // Optimistically remove from local state (trigger may deactivate it)
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  }, []);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchStories();

    intervalRef.current = setInterval(fetchStories, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStories]);

  return {
    stories,
    loading,
    error,
    fetchStories,
    createStory,
    flagStory,
  };
}
