'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  fetchWalletSummary,
  type Wallet,
  type WalletCycle,
  type WalletSettings,
} from '@/lib/services/walletService';

interface UseWalletReturn {
  wallet: Wallet | null;
  activeCycle: WalletCycle | null;
  settings: WalletSettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activeCycle, setActiveCycle] = useState<WalletCycle | null>(null);
  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setActiveCycle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchWalletSummary(user.id);
      setWallet(summary.wallet);
      setActiveCycle(summary.activeCycle);
      setSettings(summary.settings);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  return { wallet, activeCycle, settings, loading, error, refresh: load };
}
