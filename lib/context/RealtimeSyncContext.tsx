'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SyncConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeSyncState {
  connectionState: SyncConnectionState;
  lastEventAt: string | null;
  lastEventType: string | null;
  productVersion: number;
}

interface RealtimeSyncContextValue extends RealtimeSyncState {
  bumpVersion: () => void;
}

const Ctx = createContext<RealtimeSyncContextValue | null>(null);

export function useRealtimeSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRealtimeSync must be used within RealtimeSyncProvider');
  return ctx;
}

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RealtimeSyncState>({
    connectionState: 'connecting',
    lastEventAt: null,
    lastEventType: null,
    productVersion: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  const bumpVersion = useCallback((eventType?: string) => {
    setState(prev => ({
      ...prev,
      productVersion: prev.productVersion + 1,
      lastEventAt: new Date().toISOString(),
      lastEventType: eventType ?? prev.lastEventType,
    }));
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const supabase = getSupabase();

    const channel = supabase
      .channel('products-realtime', { config: { broadcast: { self: true } } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (!isMountedRef.current) return;
          bumpVersion(payload.eventType);
          setState(prev => ({ ...prev, connectionState: 'connected' }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        (payload) => {
          if (!isMountedRef.current) return;
          bumpVersion(`VARIANT_${payload.eventType}`);
          setState(prev => ({ ...prev, connectionState: 'connected' }));
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

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [bumpVersion]);

  return (
    <Ctx.Provider value={{ ...state, bumpVersion: () => bumpVersion() }}>
      {children}
    </Ctx.Provider>
  );
}
