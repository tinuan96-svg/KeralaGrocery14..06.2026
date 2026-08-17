import { getSupabase } from '@/lib/supabase/client';
import { resolveProductImage } from '@/lib/utils/image';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const KERALA_STORE_ID = 'a2e4d9f9-6b51-4071-97eb-decf72485b5a';

// Exact columns fetched from v_storefront_products — no wildcards
const PRODUCT_COLUMNS = [
  'product_id',
  'store_id',
  'product_code',
  'product_title',
  'product_display_name',
  'brand',
  'effective_price',
  'original_price',
  'effective_stock',
  'unit',
  'weight',
  'display_category',
  'main_category',
  'parent_category',
  'product_slug',
  'image_url',
  'image_main',
  'product_description',
  'status',
  'created_at',
].join(',');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StorefrontProduct {
  product_id: string;
  store_id: string | null;
  product_code: string | null;
  product_title: string;
  product_display_name: string | null;
  brand: string | null;
  effective_price: number;
  original_price: number;
  effective_stock: number;
  unit: string | null;
  weight: number | null;
  display_category: string | null;
  main_category: string | null;
  parent_category: string | null;
  product_slug: string | null;
  /** Canonical resolved image from v_storefront_products — use directly, no client fallback needed */
  image_url: string | null;
  image_main: string | null;
  product_description: string | null;
  status: string | null;
  created_at: string;
  /** Derived: effective_stock > 0 */
  is_available: boolean;
}

export type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'name_asc';

export interface GetProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortOption;
}

export interface GetProductsResult {
  products: StorefrontProduct[];
  total: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function castRow(row: Record<string, unknown>): StorefrontProduct {
  const stock = Number(row.effective_stock ?? 0);
  const imageUrl = resolveProductImage({
    image_url: row.image_url as string,
    image_main: row.image_main as string,
  });

  return {
    product_id: row.product_id as string,
    store_id: (row.store_id as string | null) ?? null,
    product_code: (row.product_code as string | null) ?? null,
    product_title: row.product_title as string,
    product_display_name: (row.product_display_name as string | null) ?? null,
    brand: (row.brand as string | null) ?? null,
    effective_price: Number(row.effective_price ?? 0),
    original_price: Number(row.original_price ?? 0),
    effective_stock: stock,
    unit: (row.unit as string | null) ?? null,
    weight: row.weight != null ? Number(row.weight) : null,
    display_category: (row.display_category as string | null) ?? null,
    main_category: (row.main_category as string | null) ?? null,
    parent_category: (row.parent_category as string | null) ?? null,
    product_slug: (row.product_slug as string | null) ?? null,
    image_url: imageUrl,
    image_main: imageUrl,
    product_description: (row.product_description as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    created_at: row.created_at as string,
    is_available: stock > 0,
  };
}

// ---------------------------------------------------------------------------
// getProducts
// ---------------------------------------------------------------------------

export async function getProducts(
  options: GetProductsOptions = {}
): Promise<GetProductsResult> {
  const {
    page = 1,
    limit = 24,
    search = '',
    category = '',
    brand = '',
    minPrice,
    maxPrice,
    inStockOnly = false,
    sort = 'newest',
  } = options;

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('v_storefront_products')
      .select(PRODUCT_COLUMNS, { count: 'exact' })
      .eq('store_id', KERALA_STORE_ID);

    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `product_title.ilike.%${term}%,product_display_name.ilike.%${term}%,product_code.ilike.%${term}%,brand.ilike.%${term}%`
      );
    }

    if (category) query = query.eq('display_category', category);
    if (brand)    query = query.eq('brand', brand);
    if (minPrice != null) query = query.gte('effective_price', minPrice);
    if (maxPrice != null) query = query.lte('effective_price', maxPrice);
    if (inStockOnly)      query = query.gt('effective_stock', 0);

    switch (sort) {
      case 'price_asc':  query = query.order('effective_price', { ascending: true });  break;
      case 'price_desc': query = query.order('effective_price', { ascending: false }); break;
      case 'name_asc':   query = query.order('product_title',   { ascending: true });  break;
      case 'newest':
      default:           query = query.order('created_at',      { ascending: false }); break;
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[keralaGroceries] getProducts error:', error);
      return { products: [], total: 0, error: error.message };
    }

    return {
      products: (data as unknown as Record<string, unknown>[]).map(castRow),
      total: count ?? 0,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[keralaGroceries] getProducts unexpected:', err);
    return { products: [], total: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// ProductVariant
// ---------------------------------------------------------------------------

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  price: number;
  discounted_price: number | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, variant_name, price, discounted_price, stock, is_active, sort_order, image_url')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[keralaGroceries] getProductVariants error:', error);
      return [];
    }
    return (data ?? []).map((v: Record<string, unknown>) => ({
      id: v.id as string,
      product_id: v.product_id as string,
      variant_name: v.variant_name as string,
      price: Number(v.price ?? 0),
      discounted_price: v.discounted_price != null ? Number(v.discounted_price) : null,
      stock: Number(v.stock ?? 0),
      is_active: Boolean(v.is_active),
      sort_order: Number(v.sort_order ?? 0),
      image_url: (v.image_url as string | null) ?? null,
    }));
  } catch (err) {
    console.error('[keralaGroceries] getProductVariants unexpected:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getProductBySlug
// ---------------------------------------------------------------------------

export async function getProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_storefront_products')
      .select(PRODUCT_COLUMNS)
      .eq('store_id', KERALA_STORE_ID)
      .eq('product_slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[keralaGroceries] getProductBySlug error:', error);
      return null;
    }
    return data ? castRow(data as unknown as Record<string, unknown>) : null;
  } catch (err) {
    console.error('[keralaGroceries] getProductBySlug unexpected:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------

export async function getProductById(productId: string): Promise<StorefrontProduct | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_storefront_products')
      .select(PRODUCT_COLUMNS)
      .eq('store_id', KERALA_STORE_ID)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('[keralaGroceries] getProductById error:', error);
      return null;
    }
    return data ? castRow(data as unknown as Record<string, unknown>) : null;
  } catch (err) {
    console.error('[keralaGroceries] getProductById unexpected:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_storefront_products')
      .select('display_category')
      .eq('store_id', KERALA_STORE_ID)
      .not('display_category', 'is', null);

    if (error) {
      console.error('[keralaGroceries] getCategories error:', error);
      return [];
    }

    return Array.from(
      new Set((data as { display_category: string }[]).map((r) => r.display_category))
    ).filter(Boolean).sort();
  } catch (err) {
    console.error('[keralaGroceries] getCategories unexpected:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getBrands
// ---------------------------------------------------------------------------

export async function getBrands(): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_storefront_products')
      .select('brand')
      .eq('store_id', KERALA_STORE_ID)
      .not('brand', 'is', null);

    if (error) {
      console.error('[keralaGroceries] getBrands error:', error);
      return [];
    }

    return Array.from(
      new Set((data as { brand: string }[]).map((r) => r.brand))
    ).filter(Boolean).sort();
  } catch (err) {
    console.error('[keralaGroceries] getBrands unexpected:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getRelatedProducts  (same category, excluding current, in-stock only)
// ---------------------------------------------------------------------------

export async function getRelatedProducts(
  productId: string,
  category: string,
  limit = 12
): Promise<StorefrontProduct[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_storefront_products')
      .select(PRODUCT_COLUMNS)
      .eq('store_id', KERALA_STORE_ID)
      .eq('display_category', category)
      .neq('product_id', productId)
      .gt('effective_stock', 0)
      .limit(limit);

    if (error) {
      console.error('[keralaGroceries] getRelatedProducts error:', error);
      return [];
    }

    return (data as unknown as Record<string, unknown>[]).map(castRow);
  } catch (err) {
    console.error('[keralaGroceries] getRelatedProducts unexpected:', err);
    return [];
  }
}
