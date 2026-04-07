'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Wing, WingCategory } from '@/lib/types';

export interface WingInput {
  brand: string;
  model: string;
  size?: string | null;
  category?: WingCategory | null;
  color?: string | null;
  year?: number | null;
  is_current?: boolean;
  serial_number?: string | null;
  notes?: string | null;
}

export function useWings() {
  const [wings, setWings] = useState<Wing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWings = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wings')
        .select('*')
        .eq('owner_id', userId)
        .order('is_current', { ascending: false })
        .order('brand', { ascending: true });

      if (error) throw error;
      setWings(data || []);
      return data || [];
    } catch (e: any) {
      console.error('[ParaWaze] fetchWings error:', e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addWing = useCallback(async (userId: string, input: WingInput) => {
    const { data, error } = await supabase
      .from('wings')
      .insert({
        owner_id: userId,
        brand: input.brand,
        model: input.model,
        size: input.size || null,
        category: input.category || null,
        color: input.color || null,
        year: input.year || null,
        is_current: input.is_current ?? false,
        serial_number: input.serial_number || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Wing;
  }, []);

  const updateWing = useCallback(async (id: string, input: Partial<WingInput>) => {
    const { data, error } = await supabase
      .from('wings')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Wing;
  }, []);

  const deleteWing = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('wings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  const setCurrentWing = useCallback(async (userId: string, wingId: string) => {
    // First, set all wings to not current
    const { error: resetError } = await supabase
      .from('wings')
      .update({ is_current: false })
      .eq('owner_id', userId);

    if (resetError) throw resetError;

    // Then set the selected one as current
    const { error } = await supabase
      .from('wings')
      .update({ is_current: true })
      .eq('id', wingId);

    if (error) throw error;
  }, []);

  return { wings, loading, fetchWings, addWing, updateWing, deleteWing, setCurrentWing };
}
