'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@/lib/types';

export interface VehicleInput {
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  license_plate?: string | null;
  seats: number;
  photo_url?: string | null;
  is_default?: boolean;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVehicles = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .order('is_default', { ascending: false })
        .order('brand', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
      return data || [];
    } catch (e: any) {
      console.error('[ParaWaze] fetchVehicles error:', e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addVehicle = useCallback(async (userId: string, input: VehicleInput) => {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        owner_id: userId,
        name: input.name || null,
        brand: input.brand || null,
        model: input.model || null,
        color: input.color || null,
        license_plate: input.license_plate || null,
        seats: input.seats,
        photo_url: input.photo_url || null,
        is_default: input.is_default ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }, []);

  const updateVehicle = useCallback(async (id: string, input: Partial<VehicleInput>) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  const setDefaultVehicle = useCallback(async (userId: string, vehicleId: string) => {
    // First, set all vehicles to not default
    const { error: resetError } = await supabase
      .from('vehicles')
      .update({ is_default: false })
      .eq('owner_id', userId);

    if (resetError) throw resetError;

    // Then set the selected one as default
    const { error } = await supabase
      .from('vehicles')
      .update({ is_default: true })
      .eq('id', vehicleId);

    if (error) throw error;
  }, []);

  return { vehicles, loading, fetchVehicles, addVehicle, updateVehicle, deleteVehicle, setDefaultVehicle };
}
