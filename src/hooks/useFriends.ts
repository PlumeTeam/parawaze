'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Friendship, Profile } from '@/lib/types';

export function useFriends() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error: err } = await supabase
        .from('friendships')
        .select('*, profiles!friendships_addressee_id_fkey(*)')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (err) throw err;

      // Normalize: attach the OTHER person's profile
      const normalized = (data || []).map((f: any) => {
        if (f.requester_id === user.id) {
          // We sent the request, profiles is addressee
          return { ...f };
        } else {
          // We received, need requester profile
          return { ...f, profiles: f['profiles!friendships_requester_id_fkey'] || f.profiles };
        }
      });
      setFriends(normalized);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Received: someone sent us a request
      const { data: received, error: err1 } = await supabase
        .from('friendships')
        .select('*, profiles!friendships_requester_id_fkey(*)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (err1) throw err1;

      // Sent: we sent requests to others
      const { data: sent, error: err2 } = await supabase
        .from('friendships')
        .select('*, profiles!friendships_addressee_id_fkey(*)')
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (err2) throw err2;

      // Normalize profile field
      const normalizeReceived = (received || []).map((f: any) => ({
        ...f,
        profiles: f['profiles!friendships_requester_id_fkey'] || f.profiles,
      }));
      const normalizeSent = (sent || []).map((f: any) => ({
        ...f,
        profiles: f['profiles!friendships_addressee_id_fkey'] || f.profiles,
      }));

      setPendingReceived(normalizeReceived);
      setPendingSent(normalizeSent);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendFriendRequest = useCallback(async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: userId,
        status: 'pending',
      });

    if (error) throw error;
    await fetchPendingRequests();
  }, [fetchPendingRequests]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw error;
    await Promise.all([fetchFriends(), fetchPendingRequests()]);
  }, [fetchFriends, fetchPendingRequests]);

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', friendshipId);

    if (error) throw error;
    await fetchPendingRequests();
  }, [fetchPendingRequests]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user?.id ?? '')
      .limit(20);

    if (error) throw error;
    setSearchResults(data || []);
  }, []);

  return {
    friends,
    pendingReceived,
    pendingSent,
    searchResults,
    loading,
    error,
    fetchFriends,
    fetchPendingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    setSearchResults,
  };
}
