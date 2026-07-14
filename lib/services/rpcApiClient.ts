/**
 * Products API Client — queries the products table directly via Supabase.
 * Uses simple flat queries (no embedded joins) to avoid PostgREST parsing issues.
 * Force Refresh: 2026-07-06 07:46
 */

import { getSupabase } from '@/lib/supabase/client';
import { resolveProductImage } from '@/lib/utils/image';
import { roundUpToNearestTen } from '@/lib/utils/formatters';

export type RpcSortBy = 'created_at' | 'price' | 'name';
export type RpcSortOrder = 'asc' | 'desc';
export type RpcSortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface RpcProduct {
  row_id: number;
  id: string;
  product_code: string | null;
  product_title: string;
  brand: string | null;
  category: string | null;
  parent_category: string | null;
  price: number;
  original_price: number | null;
  unit: string | null;
  weight_qnty: number | null;
  weight: number | null;
  stock: number;
  image_url: string | null;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  status: string | null;
  created_at: string | null;
  discount_pct: number;
  markup_percentage?: number | null;
  in_stock: boolean;
  display_title: string;
  variants?: ProductVariantOption[];
}

export interface ProductVariantOption {
  id: string;
  variant_name: string;
  price: number;
  cost_price?: number;
  stock: number;
  sku?: string;
  barcode?: string;
  unit_value?: number;
  unit_type?: string;
  is_active: boolean;
}

export interface RpcFilters {
  categories: string[];
  brands: string[];
  price_min: number;
  price_max: number;
}

export interface GetRpcProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string | null;
  brand?: string | null;
  sort?: RpcSortOption;
  status?: string;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new_arrival?: boolean;
  is_hot_product?: boolean;
  is_deal?: boolean;
}

export interface GetRpcProductsResult {
  products: RpcProduct[];
  total: number;
  page: number;
  totalPages: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapRow(
  row: Record<string, unknown>,
  categoryMap: Record<string, string>,
): RpcProduct {
  const rawPrice = Number(row.selling_price ?? row.price ?? 0);
  const price = roundUpToNearestTen(rawPrice);
  const originalPrice = row.original_price ? roundUpToNearestTen(Number(row.original_price)) : null;
  const discountPct = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : Number(row.discount_percentage ?? 0);

  const name = String(row.name ?? '');

  // brand column is the canonical brand value (set directly from CentralHub)
  const joinedCat = (row.categories as { name?: string } | null)?.name ?? null;
  const categoryName = joinedCat ?? categoryMap[String(row.category_id ?? '')] ?? null;
  const brandName = (row.brand as string | null)?.trim() || (row.source_brand as string | null) || null;

  const displayTitle = brandName && !name.toLowerCase().includes(brandName.toLowerCase())
    ? `${name} ${brandName}`
    : name;

  const imageUrl = resolveProductImage({
    image_main: row.image_main as string,
    enhanced_image_url: row.enhanced_image_url as string,
    image_url: row.image_url as string,
    image_medium: row.image_medium as string,
    image_cdn_url: row.image_cdn_url as string,
    image_override: row.image_override as string,
  });

  return {
    row_id:          0,
    id:              String(row.id ?? ''),
    product_code:    null,
    product_title:   name,
    brand:           brandName,
    category:        categoryName,
    parent_category: null,
    price,
    original_price:  originalPrice,
    unit:            (row.unit as string | null) ?? null,
    weight_qnty:     row.weight_qnty != null ? Number(row.weight_qnty) : null,
    weight:          row.weight != null ? Number(row.weight) : null,
    stock:           Math.max(Number(row.stock || 0), Number(row.stock_quantity || 0)),
    image_url:       imageUrl,
    slug:              (row.slug as string | null) ?? String(row.id ?? ''),
    description:       (row.description as string | null) ?? null,
    short_description: (row.short_description as string | null) ?? null,
    status:            'active',
    created_at:      (row.created_at as string | null) ?? null,
    discount_pct:    discountPct,
    markup_percentage: row.markup_percentage != null ? Number(row.markup_percentage) : null,
    in_stock:        Number(row.stock ?? row.stock_quantity ?? 0) > 0,
    display_title:   displayTitle,
  };
}

let globalCategoryMap: Record<string, string> | null = null;
let categoryFetchPromise: Promise<Record<string, string>> | null = null;

async function fetchCategoryMap(): Promise<Record<string, string>> {
  if (globalCategoryMap) return globalCategoryMap;
  if (categoryFetchPromise) return categoryFetchPromise;

  categoryFetchPromise = (async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from('categories').select('id, name');
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { id: string; name: string }[]) {
        map[row.id] = row.name;
      }
      globalCategoryMap = map;
      return map;
    } catch {
      return {};
    } finally {
      categoryFetchPromise = null;
    }
  })();

  return categoryFetchPromise;
}



// ---------------------------------------------------------------------------
// getProducts
// ---------------------------------------------------------------------------

export async function getProducts(
  params: GetRpcProductsParams = {}
): Promise<GetRpcProductsResult> {
  const {
    page    = 1,
    limit   = 20,
    search  = '',
    category = null,
    brand    = null,
    sort     = 'newest',
  } = params;

  try {
    const supabase = getSupabase();

    const categoryMap = await fetchCategoryMap();

    // Reverse map: category name → id
    const categoryIdByName: Record<string, string> = {};
    for (const [id, name] of Object.entries(categoryMap)) categoryIdByName[name] = id;

    const offset = (page - 1) * limit;

    // Use fuzzy search RPC if searching
    if (search) {
      const { data, error, count } = await supabase
        .rpc('search_products_fuzzy', {
          search_query: search,
          limit_val: limit,
          offset_val: offset
        }, { count: 'exact' });

      if (error) {
        console.error('[rpcApiClient] fuzzy search error:', error);
      } else {
        const products = (data ?? []).map((r: any) => mapRow(r, categoryMap));
        const total = count ?? products.length;
        return {
          products,
          total,
          page,
          totalPages: Math.ceil(total / limit),
          error: null
        };
      }
    }

    let query = supabase
      .from('products')
      .select(
        'id, name, slug, description, short_description, image_url, image_main, enhanced_image_url, image_medium, price, selling_price, original_price, discount_percentage, markup_percentage, brand, source_brand, category_id, brand_id, created_at, unit, weight, stock, stock_quantity',
        { count: 'exact' }
      )
      .eq('approval_status', 'approved')
      .neq('is_deleted', true)
      .neq('visibility_status', false)
      .not('centralhub_product_id', 'is', null);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category && categoryIdByName[category]) {
      query = query.eq('category_id', categoryIdByName[category]);
    }

    if (brand) {
      // Filter by brand column (canonical, from CentralHub); also match source_brand as fallback
      query = query.or(`brand.ilike.${brand},source_brand.ilike.${brand}`);
    }

    if (params.is_featured) query = query.eq('is_featured', true);
    if (params.is_bestseller) query = query.eq('is_bestseller', true);
    if (params.is_new_arrival) query = query.eq('is_new_arrival', true);
    if (params.is_hot_product) query = query.eq('is_hot_product', true);
    if (params.is_deal) query = query.eq('is_deal', true);

    switch (sort) {
      case 'oldest':     query = query.order('created_at', { ascending: true });  break;
      case 'price_asc':  query = query.order('price',      { ascending: true });  break;
      case 'price_desc': query = query.order('price',      { ascending: false }); break;
      case 'name_asc':   query = query.order('name',       { ascending: true });  break;
      default:           query = query.order('created_at', { ascending: false });
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[rpcApiClient] getProducts error:', error);
      return { products: [], total: 0, page, totalPages: 0, error: error.message };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const rows = (data ?? []) as Record<string, unknown>[];
    const products = rows.map((r) => mapRow(r, categoryMap));

    // For products with no valid image_url (e.g. blob: URLs saved to DB),
    // fall back to the first image in product_gallery_images.
    const missingIds = products.filter((p) => !p.image_url).map((p) => p.id);
    if (missingIds.length > 0) {
      const { data: galleryRows } = await supabase
        .from('product_gallery_images')
        .select('product_id, image_url, enhanced_image_url, position')
        .in('product_id', missingIds)
        .order('position');

      if (galleryRows?.length) {
        const galleryMap = new Map<string, string>();
        for (const g of galleryRows as any[]) {
          if (!galleryMap.has(g.product_id)) {
            // Use resolveProductImage to handle relative paths and priority
            const resolved = resolveProductImage({
              enhanced_image_url: g.enhanced_image_url,
              image_url: g.image_url,
            });
            if (resolved) galleryMap.set(g.product_id, resolved);
          }
        }
        for (const p of products) {
          if (!p.image_url) p.image_url = galleryMap.get(p.id) ?? null;
        }
      }
    }

    return { products, total, page, totalPages, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[rpcApiClient] getProducts unexpected:', err);
    return { products: [], total: 0, page, totalPages: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// getProductDetail
// ---------------------------------------------------------------------------

export async function getProductDetail(
  idOrSlug: string,
): Promise<{ product: RpcProduct | null; error: string | null }> {
  try {
    const supabase = getSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase
      .from('products')
      .select('id, name, slug, description, short_description, image_url, image_main, enhanced_image_url, image_medium, price, selling_price, original_price, discount_percentage, markup_percentage, brand, source_brand, category_id, brand_id, created_at, unit, weight, stock, stock_quantity')
      .eq('approval_status', 'approved')
      .neq('is_deleted', true)
      .neq('visibility_status', false)
      .not('centralhub_product_id', 'is', null);

    if (isUuid) {
      query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return { product: null, error: error.message };
    if (!data) return { product: null, error: null };

    const categoryMap = await fetchCategoryMap();
    const product = mapRow(data as Record<string, unknown>, categoryMap);

    // Fetch variants separately to avoid relationship schema issues
    try {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (variants) {
        product.variants = variants as ProductVariantOption[];
      }
    } catch (vErr) {
      console.warn('[rpcApiClient] Failed to fetch variants:', vErr);
    }

    if (!product.image_url) {
      const { data: gallery } = await supabase
        .from('product_gallery_images')
        .select('image_url, enhanced_image_url, position')
        .eq('product_id', product.id)
        .order('position')
        .limit(1)
        .maybeSingle();

      if (gallery) {
        const resolved = resolveProductImage({
          enhanced_image_url: (gallery as any).enhanced_image_url,
          image_url: (gallery as any).image_url,
        });
        if (resolved) product.image_url = resolved;
      }
    }

    return { product, error: null };
  } catch (err) {
    return { product: null, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

// ---------------------------------------------------------------------------
// getFilters
// ---------------------------------------------------------------------------

export async function getFilters(): Promise<{ filters: RpcFilters; error: string | null }> {
  const empty: RpcFilters = { categories: [], brands: [], price_min: 0, price_max: 9999 };
  try {
    const supabase = getSupabase();

    // Only include categories/brands that have at least one approved, visible product
    const [catRes, brandRes, priceRes, allCats] = await Promise.all([
      supabase
        .from('products')
        .select('category_id')
        .eq('approval_status', 'approved')
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('centralhub_product_id', 'is', null)
        .not('category_id', 'is', null),
      // Use brand column (populated from CentralHub verbatim during sync)
      supabase
        .from('products')
        .select('brand')
        .eq('approval_status', 'approved')
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('centralhub_product_id', 'is', null)
        .not('brand', 'is', null)
        .neq('brand', ''),
      supabase
        .from('products')
        .select('price')
        .eq('approval_status', 'approved')
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('centralhub_product_id', 'is', null),
      supabase
        .from('categories')
        .select('id, name, is_active')
    ]);

    const activeCatIds = new Set((allCats.data || []).filter(c => c.is_active).map(c => c.id));
    const catNameMap = new Map((allCats.data || []).map(c => [c.id, c.name]));

    const catSet = new Set<string>();
    for (const r of (catRes.data ?? []) as { category_id: string }[]) {
      if (activeCatIds.has(r.category_id)) {
        const name = catNameMap.get(r.category_id);
        if (name) catSet.add(name);
      }
    }

    const brdSet = new Set<string>();
    for (const r of (brandRes.data ?? []) as { brand: string | null }[]) {
      const b = r.brand?.trim();
      if (b) brdSet.add(b);
    }

    const categories = Array.from(catSet).sort();
    const brands = Array.from(brdSet).sort();
    const prices = (priceRes.data ?? []).map((r: { price: number }) => Number(r.price)).filter((p) => p > 0);
    const price_min = prices.length ? Math.min(...prices) : 0;
    const price_max = prices.length ? Math.max(...prices) : 9999;

    return { filters: { categories, brands, price_min, price_max }, error: null };
  } catch (err) {
    return { filters: empty, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

