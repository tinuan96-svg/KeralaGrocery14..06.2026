'use client';

import { type RealtimeChannel } from '@supabase/supabase-js';
import { getCentralHubClient } from '@/lib/supabase/centralhub';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogProduct {
  id: string;
  name: string;
  price: number | null;
  product_type: string | null;
  stock: number | null;
  weight: string | null;
  brand: string | null;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export function stockStatus(stock: number | null): StockStatus {
  if (stock == null || stock <= 0) return 'out_of_stock';
  if (stock <= 5) return 'low_stock';
  return 'in_stock';
}

export interface CatalogResult {
  products: CatalogProduct[];
  total: number;
  error: string | null;
}

export interface CatalogParams {
  page?: number;
  pageSize?: number;
  search?: string;
  productType?: string | null;
}

// ---------------------------------------------------------------------------
// fetchCatalogProducts
// ---------------------------------------------------------------------------

export async function fetchCatalogProducts(
  params: CatalogParams = {}
): Promise<CatalogResult> {
  const { page = 1, pageSize = 24, search = '', productType = null } = params;

  try {
    const supabase = getCentralHubClient();
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('products')
      .select('id, name, price, product_type, stock, weight, brand', { count: 'exact' })
      .order('name', { ascending: true });

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    if (productType) {
      query = query.eq('product_type', productType);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[catalogService] error:', error);
      return { products: [], total: 0, error: error.message };
    }

    return {
      products: (data ?? []) as CatalogProduct[],
      total: count ?? 0,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[catalogService] unexpected:', err);
    return { products: [], total: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// fetchProductTypes — distinct values for filter chips
// ---------------------------------------------------------------------------

export async function fetchProductTypes(): Promise<string[]> {
  try {
    const supabase = getCentralHubClient();
    const { data, error } = await supabase
      .from('products')
      .select('product_type')
      .not('product_type', 'is', null)
      .order('product_type', { ascending: true });

    if (error || !data) return [];

    return Array.from(
      new Set((data as { product_type: string }[]).map((r) => r.product_type).filter(Boolean))
    ).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// subscribeToProductsChanges
// ---------------------------------------------------------------------------

export interface ProductsChangeCallbacks {
  onInsert: (product: CatalogProduct) => void;
  onUpdate: (product: CatalogProduct) => void;
  onDelete: (id: string) => void;
  onResync: () => void;
  onStatusChange?: (status: 'live' | 'error') => void;
}

/**
 * Subscribe to realtime postgres_changes on the CentralHub products table.
 * Returns the channel — call channel.unsubscribe() on cleanup.
 */
export function subscribeToProductsChanges(callbacks: ProductsChangeCallbacks): RealtimeChannel {
  const supabase = getCentralHubClient();

  const channel = supabase
    .channel('catalog-products-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          callbacks.onInsert(payload.new as CatalogProduct);
        } else if (payload.eventType === 'UPDATE') {
          callbacks.onUpdate(payload.new as CatalogProduct);
        } else if (payload.eventType === 'DELETE') {
          callbacks.onDelete(String((payload.old as { id: string }).id));
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callbacks.onStatusChange?.('live');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        callbacks.onStatusChange?.('error');
        // Full resync to restore consistent state after a disconnect
        callbacks.onResync();
      }
    });

  return channel;
}
