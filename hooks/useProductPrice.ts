'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { roundUpToNearestTen } from '@/lib/utils/formatters';

export function useProductPrice(productId: string, initialPrice: number, initialStock: number) {
  const [data, setData] = useState({ price: initialPrice, stock: initialStock });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchPrice = useCallback(async () => {
    if (!productId) return;

    try {
      const supabase = getSupabase();
      const { data: row, error: fetchError } = await supabase
        .from('products')
        .select('price, selling_price, stock, stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      if (row) {
        const rawPrice = Number(row.selling_price ?? row.price ?? initialPrice);
        setData({
          price: roundUpToNearestTen(rawPrice),
          // Robust check: use max of both columns
          stock: Math.max(Number(row.stock || 0), Number(row.stock_quantity || 0))
        });
      }
    } catch (err) {
      console.error('[useProductPrice] Error:', err);
      setError(err);
    }
  }, [productId, initialPrice]);

  useEffect(() => {
    // We NO LONGER call fetchPrice() immediately on mount to prevent
    // flooding the network when many cards are displayed.
    // The props provide the initial authoritative state.

    // Set up polling interval (every 90 seconds - slightly more conservative)
    const interval = setInterval(fetchPrice, 90000);

    // Also fetch on window focus (helps ensure data is fresh when user returns)
    const handleFocus = () => fetchPrice();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchPrice]);

  return {
    price: data.price,
    stock: data.stock,
    isLoading,
    isError: !!error,
    mutate: fetchPrice
  };
}
