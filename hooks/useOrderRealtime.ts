'use client';

import { useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * useOrderRealtime Hook
 *
 * Subscribes to realtime updates for the current user's orders.
 * Triggers a callback when an order is updated (e.g. status or sync_state changes).
 */
export function useOrderRealtime(onUpdate: () => void) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabase();

    // Subscribe to changes in the orders table for this specific user
    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useOrderRealtime] Order update received:', payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useOrderRealtime] Subscribed to order updates');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, onUpdate]);
}
