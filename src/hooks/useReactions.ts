'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReactionType } from '@/lib/types';

export function useReactions() {
  const [loading, setLoading] = useState(false);

  const toggleReaction = useCallback(
    async (reportId: string, userId: string, reaction: ReactionType) => {
      setLoading(true);
      try {
        // Check if user already reacted with this type
        const { data: existing } = await supabase
          .from('report_reactions')
          .select('id, reaction')
          .eq('report_id', reportId)
          .eq('user_id', userId)
          .single();

        if (existing && existing.reaction === reaction) {
          // Remove reaction
          await supabase
            .from('report_reactions')
            .delete()
            .eq('id', existing.id);

          // Decrement count
          const countField = `${reaction}s_count` as 'likes_count' | 'genius_count' | 'doubt_count';
          const fieldMap: Record<ReactionType, string> = {
            like: 'likes_count',
            genius: 'genius_count',
            doubt: 'doubt_count',
          };
          const field = fieldMap[reaction];

          const { data: report } = await supabase
            .from('weather_reports')
            .select(field)
            .eq('id', reportId)
            .single();

          if (report) {
            await supabase
              .from('weather_reports')
              .update({ [field]: Math.max(0, (report as any)[field] - 1) })
              .eq('id', reportId);
          }

          return null;
        } else if (existing) {
          // Change reaction type
          const fieldLookup: Record<string, string> = { like: 'likes_count', genius: 'genius_count', doubt: 'doubt_count' };
          const oldField = fieldLookup[existing.reaction as string];
          const newField = fieldLookup[reaction];

          await supabase
            .from('report_reactions')
            .update({ reaction })
            .eq('id', existing.id);

          // Update counts
          const { data: report } = await supabase
            .from('weather_reports')
            .select('likes_count, genius_count, doubt_count')
            .eq('id', reportId)
            .single();

          if (report) {
            await supabase
              .from('weather_reports')
              .update({
                [oldField]: Math.max(0, (report as any)[oldField] - 1),
                [newField]: (report as any)[newField] + 1,
              })
              .eq('id', reportId);
          }

          return reaction;
        } else {
          // New reaction
          await supabase
            .from('report_reactions')
            .insert({ report_id: reportId, user_id: userId, reaction });

          const fieldMap: Record<ReactionType, string> = {
            like: 'likes_count',
            genius: 'genius_count',
            doubt: 'doubt_count',
          };
          const field = fieldMap[reaction];

          const { data: report } = await supabase
            .from('weather_reports')
            .select(field)
            .eq('id', reportId)
            .single();

          if (report) {
            await supabase
              .from('weather_reports')
              .update({ [field]: (report as any)[field] + 1 })
              .eq('id', reportId);
          }

          return reaction;
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getUserReaction = useCallback(
    async (reportId: string, userId: string) => {
      const { data } = await supabase
        .from('report_reactions')
        .select('reaction')
        .eq('report_id', reportId)
        .eq('user_id', userId)
        .single();

      return data?.reaction ?? null;
    },
    []
  );

  return { toggleReaction, getUserReaction, loading };
}
