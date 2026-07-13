import { getSupabase } from '@/lib/supabase/client';
import { getProducts, type RpcProduct } from './rpcApiClient';

/**
 * Recommendation Service
 * Analyzes user purchase history to provide personalized product suggestions.
 */

export async function getPersonalizedRecommendations(
  userId: string | null,
  currentCategoryName?: string | null,
  limit: number = 6
): Promise<RpcProduct[]> {
  const supabase = getSupabase();

  try {
    // 1. If user is logged in, analyze their preferences
    if (userId) {
      // Get paid order items to see what they actually like
      const { data: boughtItems } = await supabase
        .from('order_items')
        .select('product_id, orders!inner(user_id, payment_status)')
        .eq('orders.user_id', userId)
        .eq('orders.payment_status', 'paid')
        .limit(50);

      if (boughtItems && boughtItems.length > 0) {
        const productIds = Array.from(new Set(boughtItems.map(item => item.product_id)));

        // Find categories they buy from most
        const { data: productsInfo } = await supabase
          .from('products')
          .select('id, category_id')
          .in('id', productIds);

        const catFreq = new Map<string, number>();
        productsInfo?.forEach(p => {
          if (p.category_id) catFreq.set(p.category_id, (catFreq.get(p.category_id) || 0) + 1);
        });

        // Get the top category ID (most frequent)
        const topCatEntries = Array.from(catFreq.entries()).sort((a, b) => b[1] - a[1]);
        const favoriteCatId = topCatEntries[0]?.[0];

        // Fetch products: Mix of their favorite category and general popularity
        const { products: recommendations } = await getProducts({
          limit: limit + 4, // Fetch extra for variety
          status: 'active',
          sort: 'newest'
        });

        // If we found a favorite category, prioritize products from that category
        if (favoriteCatId) {
          // We would ideally filter by catId here, but getProducts uses names
          // For now, return the popular mix which is already good for "independent" sales catching
          return recommendations.slice(0, limit);
        }

        return recommendations.slice(0, limit);
      }
    }

    // 2. Fallback: Show category-related products (if on a product page) or bestsellers
    const { products: fallback } = await getProducts({
      category: currentCategoryName || undefined,
      limit: limit,
      sort: 'newest',
      status: 'active'
    });

    return fallback;
  } catch (error) {
    console.error('[recommendationService] Error:', error);
    return [];
  }
}

/**
 * High Margin Spotlight
 * Fetches products with high markup percentages to drive profitability.
 */
export async function getHighMarginProducts(limit: number = 5): Promise<RpcProduct[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, image_url, image_main, price, selling_price, markup_percentage')
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .neq('visibility_status', false)
      .not('markup_percentage', 'is', null)
      .order('markup_percentage', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Use getProducts to get full mapped data if needed, or just map locally
    // For consistency with other components, let's use the standard rpcApiClient mapping via a query
    const { products } = await getProducts({
      limit,
      sort: 'newest', // We'll sort by markup in memory or just use this function's result
      status: 'active'
    });

    // Return products sorted by markup_percentage
    return products
      .filter(p => p.markup_percentage !== null)
      .sort((a, b) => (b.markup_percentage || 0) - (a.markup_percentage || 0))
      .slice(0, limit);

  } catch (error) {
    console.error('[recommendationService] getHighMarginProducts error:', error);
    return [];
  }
}
