'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SyncConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeSyncState {
  connectionState: SyncConnectionState;
  lastEventAt: string | null;
  lastEventType: string | null;
  syncedToday: number;
  failedToday: number;
  productVersion: number; // bumped on every product change — consumers can react to this
}

interface RealtimeSyncContextValue extends RealtimeSyncState {
  triggerPoll: () => Promise<void>;
  triggerForceResync: () => Promise<void>;
}

const Ctx = createContext<RealtimeSyncContextValue | null>(null);

export function useRealtimeSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRealtimeSync must be used within RealtimeSyncProvider');
  return ctx;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes fallback

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RealtimeSyncState>({
    connectionState: 'connecting',
    lastEventAt: null,
    lastEventType: null,
    syncedToday: 0,
    failedToday: 0,
    productVersion: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const bumpVersion = useCallback((eventType?: string) => {
    setState(prev => ({
      ...prev,
      productVersion: prev.productVersion + 1,
      lastEventAt: new Date().toISOString(),
      lastEventType: eventType ?? prev.lastEventType,
    }));
  }, []);

  const triggerPoll = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-realtime`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'poll' }),
      });
    } catch {
      // Silent — poll failures are non-fatal
    }
  }, []);

  const triggerForceResync = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-sync`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sync' }),
      });
      bumpVersion('FULL_RESYNC');
    } catch {
      // Silent
    }
  }, [bumpVersion]);

  useEffect(() => {
    isMountedRef.current = true;
    const supabase = getSupabase();

    // Subscribe to local products table via Supabase Realtime.
    // When the sync edge function updates products, these events fire immediately.
    const channel = supabase
      .channel('products-realtime', { config: { broadcast: { self: true } } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (!isMountedRef.current) return;
          bumpVersion(payload.eventType);
          setState(prev => ({
            ...prev,
            connectionState: 'connected',
            syncedToday: prev.syncedToday + 1,
          }));
        }
      )
      .subscribe((status) => {
        if (!isMountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, connectionState: 'connected' }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setState(prev => ({ ...prev, connectionState: 'error' }));
        } else if (status === 'CLOSED') {
          setState(prev => ({ ...prev, connectionState: 'disconnected' }));
        }
      });

    channelRef.current = channel;

    // Fallback polling every 5 minutes in case realtime disconnects
    pollTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      triggerPoll();
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [bumpVersion, triggerPoll]);

  return (
    <Ctx.Provider value={{ ...state, triggerPoll, triggerForceResync }}>
      {children}
    </Ctx.Provider>
  );
}
