import { getSupabase } from '@/lib/supabase/client';
import type { ProductWithDetails, Category } from '@/lib/types/database';

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
  rating,
  review_count,
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
  brand_id
`;

function mapProduct(p: any): ProductWithDetails {
  return {
    id: p.id,
    name: p.name ?? '',
    slug: p.slug ?? '',
    description: p.description ?? null,
    price: p.price ?? 0,
    original_price: p.original_price ?? null,
    image_main: p.image_main?.startsWith('http') ? p.image_main : null,
    image_url: (
      (p.image_main?.startsWith('http') ? p.image_main : null) ??
      (p.image_url?.startsWith('http') ? p.image_url : null) ??
      null
    ),
    image_path: p.image_path ?? null,
    category_id: p.category_id ?? null,
    brand_id: p.brand_id ?? null,
    created_at: p.created_at ?? '',
    stock: 999,
    is_active: p.is_active ?? true,
    discount_percentage: p.discount_percentage ?? undefined,
    is_bestseller: p.is_bestseller ?? undefined,
    is_featured: p.is_featured ?? undefined,
    is_new_arrival: p.is_new_arrival ?? undefined,
    is_hot_product: p.is_hot_product ?? undefined,
    hot_product_expires_at: p.hot_product_expires_at ?? undefined,
    is_deal: p.is_deal ?? undefined,
    sold_count: p.sold_count ?? undefined,
    rating: p.rating ?? undefined,
    review_count: p.review_count ?? undefined,
    category: p.categories ?? undefined,
    brand: p.brands
      ? { ...p.brands, description: null, created_at: '', updated_at: '' }
      : undefined,
  };
}

export interface FetchStoreProductsOptions {
  stockOnly?: boolean;
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

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCTS_SELECT)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .eq('visibility_status', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storeProductsService] Error fetching products:', error);
      return { products: [], error: error.message };
    }

    const products = (data || []).map(mapProduct);

    // Manually map categories and brands
    try {
      const [catRes, brandRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug'),
        supabase.from('brands').select('id, name, slug, logo_url'),
      ]);
      const catMap = new Map((catRes.data || []).map((c: any) => [c.id, c]));
      const brandMap = new Map((brandRes.data || []).map((b: any) => [b.id, b]));

      products.forEach((p: any) => {
        if (p.category_id) p.category = catMap.get(p.category_id) as Category | undefined;
        if (p.brand_id) p.brand = brandMap.get(p.brand_id) as any;
      });
    } catch (mapErr) {
      console.warn('[storeProductsService] mapping failed:', mapErr);
    }

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
