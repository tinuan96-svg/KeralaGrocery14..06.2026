/**
 * Product and Category related actions.
 * Optimized for static export environments.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
// import { revalidatePath } from 'next/cache';
import type { Category } from '@/lib/types/database';

export async function createProduct(data: {
  name: string;
  slug: string;
  description?: string;
  price: number;
  category_id: string;
  brand_id?: string;
  image_url?: string;
}) {
  const supabase = createServerSupabaseClient();

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      price: data.price,
      category_id: data.category_id,
      brand_id: data.brand_id || null,
      image_url: data.image_url || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    throw new Error(error.message);
  }

  // revalidatePath is a no-op in static export
  // revalidatePath('/products');
  // revalidatePath('/admin');
  return product;
}

export async function createCategory(data: { name: string; slug: string }) {
  const supabase = createServerSupabaseClient();

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      name: data.name,
      slug: data.slug,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw new Error(error.message);
  }

  // revalidatePath is a no-op in static export
  // revalidatePath('/products');
  // revalidatePath('/admin');
  return category;
}

export async function fetchProducts(): Promise<{
  products: any[];
  categories: Category[];
}> {
  const supabase = createServerSupabaseClient();

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select(`
        id, name, slug, description, price, original_price,
        image_url, image_main, is_active, is_deleted, is_featured,
        is_bestseller, is_deal, is_new_arrival,
        discount_percentage, created_at, category_id, brand_id,
        approval_status, visibility_status, stock
      `)
      .eq('is_deleted', false)
      .eq('approval_status', 'approved')
      .eq('visibility_status', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true }),
  ]);

  return {
    products: productsResult.data || [],
    categories: categoriesResult.data || [],
  };
}
