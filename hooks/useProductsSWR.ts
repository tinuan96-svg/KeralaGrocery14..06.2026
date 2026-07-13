import useSWR from 'swr';
import { getSupabase } from '@/lib/supabase/client';

/**
 * useProductsSWR Hook
 *
 * Demonstrates SWR integration for real-time revalidation and caching.
 */
export function useProductsSWR(categorySlug?: string) {
  const fetcher = async () => {
    const supabase = getSupabase();
    let query = supabase
      .from('products')
      .select('*')
      .eq('approval_status', 'approved')
      .eq('visibility_status', true);

    if (categorySlug) {
      // Assuming we have a join or slug filter
      // query = query.eq('categories.slug', categorySlug);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    categorySlug ? `products-${categorySlug}` : 'products-home',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    products: data,
    isLoading,
    isError: error,
    refresh: mutate
  };
}
