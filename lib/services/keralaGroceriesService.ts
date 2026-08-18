import { getSupabase } from '@/lib/supabase/client';
import { resolveProductImage } from '@/lib/utils/image';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const KERALA_STORE_ID = 'a2e4d9f9-6b51-4071-97eb-decf72485b5a';

// Exact columns fetched from products — no wildcards
const PRODUCT_COLUMNS = [
  'id',
  'name',
  'slug',
  'brand',
  'price',
  'original_price',
  'stock',
  'unit',
  'weight',
  'category',
  'main_category',
  'image_url',
  'image_main',
  'description',
  'status',
  'created_at',
  'variants:product_variants(id, variant_id, group_key, variant_name, price, stock, is_active)'
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
  const stock = Number(row.stock ?? 0);
  const imageUrl = resolveProductImage({
    image_url: row.image_url as string,
    image_main: row.image_main as string,
  });

  return {
    product_id: row.id as string,
    store_id: null,
    product_code: null,
    product_title: row.name as string,
    product_display_name: row.name as string,
    brand: (row.brand as string | null) ?? null,
    effective_price: Number(row.price ?? 0),
    original_price: Number(row.original_price ?? 0),
    effective_stock: stock,
    unit: (row.unit as string | null) ?? null,
    weight: row.weight != null ? Number(row.weight) : null,
    display_category: (row.category as string | null) ?? null,
    main_category: (row.main_category as string | null) ?? null,
    parent_category: null,
    product_slug: (row.slug as string | null) ?? null,
    image_url: imageUrl,
    image_main: imageUrl,
    product_description: (row.description as string | null) ?? null,
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
      .from('products')
      .select(PRODUCT_COLUMNS, { count: 'exact' })
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .neq('is_deleted', true)
      .or('visibility_status.eq.visible,visibility_status.eq.true');

    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `product_title.ilike.%${term}%,product_display_name.ilike.%${term}%,product_code.ilike.%${term}%,brand.ilike.%${term}%`
      );
    }

    if (category) query = query.eq('category', category);
    if (brand)    query = query.eq('brand', brand);
    if (minPrice != null) query = query.gte('price', minPrice);
    if (maxPrice != null) query = query.lte('price', maxPrice);
    if (inStockOnly)      query = query.gt('stock', 0);

    switch (sort) {
      case 'price_asc':  query = query.order('price', { ascending: true });  break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'name_asc':   query = query.order('name',   { ascending: true });  break;
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
      products: (data as unknown as Record<string, unknown>[]).map(castRow).filter(p => p.image_main && p.image_main.startsWith('http')),
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
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('product_slug', slug)
      .eq('approval_status', 'approved')
      .eq('visibility_status', 'visible')
      .neq('is_deleted', true)
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
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', productId)
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
      .from('products')
      .select('category')
      .not('category', 'is', null)
      .eq('approval_status', 'approved')
      .eq('visibility_status', 'visible')
      .neq('is_deleted', true);

    if (error) {
      console.error('[keralaGroceries] getCategories error:', error);
      return [];
    }

    return Array.from(
      new Set((data as { category: string }[]).map((r) => r.category))
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
      .from('products')
      .select('brand')
      .not('brand', 'is', null)
      .eq('approval_status', 'approved')
      .eq('visibility_status', 'visible')
      .neq('is_deleted', true);

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
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('category', category)
      .neq('id', productId)
      .gt('stock', 0)
      .eq('approval_status', 'approved')
      .eq('visibility_status', 'visible')
      .neq('is_deleted', true)
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
