import { getSupabase } from '@/lib/supabase/client';
import type { ProductWithDetails, Category } from '@/lib/types/database';
import { resolveProductImage } from '@/lib/utils/image';
import { roundUpToNearestTen } from '@/lib/utils/formatters';

// Force Refresh: 2026-07-06 07:45
const PRODUCTS_SELECT = `
  id,
  name,
  slug,
  description,
  price,
  original_price,
  image_url,
  image_main,
  image_path,
  enhanced_image_url,
  discount_percentage,
  is_active,
  is_deleted,
  is_featured,
  is_bestseller,
  is_new_arrival,
  is_hot_product,
  hot_product_expires_at,
  is_deal,
  sold_count,
  created_at,
  category_id,
  brand_id,
  stock,
  categories:category_id(id, name, slug),
  brands:brand_id(id, name, slug, logo_url)
`;

function mapProduct(p: any): ProductWithDetails {
  const imageUrl = resolveProductImage({
    image_main: p.image_main,
    enhanced_image_url: p.enhanced_image_url,
    image_url: p.image_url,
  });

  return {
    id: p.id,
    name: p.name ?? '',
    slug: p.slug ?? '',
    description: p.description ?? null,
    price: roundUpToNearestTen(p.price ?? 0),
    original_price: p.original_price ? roundUpToNearestTen(p.original_price) : null,
    image_main: imageUrl,
    image_url: imageUrl,
    enhanced_image_url: p.enhanced_image_url ?? null,
    image_path: p.image_path ?? null,
    category_id: p.category_id ?? null,
    brand_id: p.brand_id ?? null,
    created_at: p.created_at ?? '',
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    discount_percentage: p.discount_percentage ?? undefined,
    is_bestseller: p.is_bestseller ?? undefined,
    is_featured: p.is_featured ?? undefined,
    is_new_arrival: p.is_new_arrival ?? undefined,
    is_hot_product: p.is_hot_product ?? undefined,
    hot_product_expires_at: p.hot_product_expires_at ?? undefined,
    is_deal: p.is_deal ?? undefined,
    sold_count: p.sold_count ?? undefined,
    category: p.categories ?? undefined,
    brand: p.brands
      ? { ...p.brands, description: null, created_at: '', updated_at: '' }
      : undefined,
  };
}

export interface FetchStoreProductsOptions {
  stockOnly?: boolean;
  limit?: number;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new_arrival?: boolean;
  is_hot_product?: boolean;
  is_deal?: boolean;
}

export interface FetchStoreProductsResult {
  products: ProductWithDetails[];
  error: string | null;
}

export async function fetchStoreProducts(
  _options: FetchStoreProductsOptions = {}
): Promise<FetchStoreProductsResult> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('products')
      .select(PRODUCTS_SELECT)
      .eq('approval_status', 'approved')
      .neq('is_deleted', true)
      .neq('visibility_status', false)
      .not('centralhub_product_id', 'is', null)
      .gt('price', 0);

    if (_options.is_featured) query = query.eq('is_featured', true);
    if (_options.is_bestseller) query = query.eq('is_bestseller', true);
    if (_options.is_new_arrival) query = query.eq('is_new_arrival', true);
    if (_options.is_hot_product) query = query.eq('is_hot_product', true);
    if (_options.is_deal) query = query.eq('is_deal', true);

    if (_options.limit) {
      query = query.limit(_options.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[storeProductsService] Error fetching products:', error);
      return { products: [], error: error.message };
    }

    const products = (data || []).map(mapProduct);

    return { products, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load products';
    console.error('[storeProductsService] Unexpected error:', err);
    return { products: [], error: message };
  }
}

export async function fetchHomepageCategories(): Promise<Category[]> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, icon, sort_order, is_active, show_on_homepage')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[storeProductsService] Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[storeProductsService] Unexpected error fetching categories:', err);
    return [];
  }
}

export interface CategoryCarouselItem {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  product_count: number;
  hero_image: string | null;
}

export async function fetchCategoryCarouselData(): Promise<CategoryCarouselItem[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_category_carousel');
    if (error) {
      console.error('[storeProductsService] Error fetching category carousel:', error);
      return [];
    }
    return (data as CategoryCarouselItem[]) || [];
  } catch (err) {
    console.error('[storeProductsService] Unexpected error fetching category carousel:', err);
    return [];
  }
}
