import { createServerSupabaseClient } from './supabase/server';
import type { Category, ProductWithDetails } from './types/database';

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
  is_deleted,
  is_active,
  is_featured,
  is_bestseller,
  is_deal,
  is_new_arrival,
  is_hot_product,
  hot_product_expires_at,
  rating,
  review_count,
  sold_count,
  discount_percentage,
  created_at,
  category_id,
  brand_id,
  categories(id, name, slug, icon, sort_order),
  brands(id, name, slug, logo_url, sort_order)
`;

export function mapProduct(p: any): ProductWithDetails {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price ?? 0,
    original_price: p.original_price,
    image_main: p.image_main?.startsWith('http') ? p.image_main : null,
    image_url: (
      (p.image_main?.startsWith('http') ? p.image_main : null) ??
      (p.image_url?.startsWith('http') ? p.image_url : null) ??
      null
    ),
    image_path: p.image_path,
    category_id: p.category_id,
    brand_id: p.brand_id,
    created_at: p.created_at,
    stock: 999,
    is_active: p.is_active ?? true,
    discount_percentage: p.discount_percentage,
    is_bestseller: p.is_bestseller,
    is_featured: p.is_featured,
    is_deal: p.is_deal,
    is_new_arrival: p.is_new_arrival,
    is_hot_product: p.is_hot_product,
    hot_product_expires_at: p.hot_product_expires_at,
    rating: p.rating,
    review_count: p.review_count,
    sold_count: p.sold_count,
    category: p.categories ?? undefined,
    brand: p.brands ?? undefined,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

export async function getAllProducts(): Promise<ProductWithDetails[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCTS_SELECT)
    .eq('is_deleted', false)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('visibility_status', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return (data || []).map(mapProduct);
}
