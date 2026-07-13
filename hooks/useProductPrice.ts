import useSWR from 'swr';
import { getSupabase } from '@/lib/supabase/client';
import { roundUpToNearestTen } from '@/lib/utils/formatters';

export function useProductPrice(productId: string, initialPrice: number, initialStock: number) {
  const { data, error, mutate } = useSWR(
    productId ? `product-price-${productId}` : null,
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('price, selling_price, stock, stock_quantity')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const rawPrice = Number(data.selling_price ?? data.price ?? initialPrice);
      return {
        price: roundUpToNearestTen(rawPrice),
        stock: Number(data.stock ?? data.stock_quantity ?? 0)
      };
    },
    {
      fallbackData: { price: initialPrice, stock: initialStock },
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    price: data?.price ?? initialPrice,
    stock: data?.stock ?? initialStock,
    isLoading: !data && !error,
    isError: error,
    mutate
  };
}
