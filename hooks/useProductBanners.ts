'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { resolveProductImage } from '@/lib/utils/image';

const BANNER_FETCH_LIMIT = 32;
const BANNER_DISPLAY_LIMIT = 10;

export interface BannerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  stock: number;
  discount: number;
  cat_id: string | null;
  cat_name: string | null;
  cat_slug: string | null;
  brd_id: string | null;
  brd_name: string | null;
  brd_slug: string | null;
}

export type BannerKey = 'top_sellers' | 'new_arrivals' | 'ready_foods' | 'featured' | 'random_picks';

export interface BannerConfig {
  key: BannerKey;
  title: string;
  subtitle: string;
  accentColor: string;
  tagColor: string;
  viewAllHref: string;
  icon: string;
}

export const BANNER_CONFIGS: BannerConfig[] = [
  {
    key: 'top_sellers',
    title: 'Top Sellers',
    subtitle: 'Most loved by our customers',
    accentColor: 'from-amber-500 to-orange-500',
    tagColor: 'text-amber-600',
    viewAllHref: '/products?sort=popular',
    icon: '🏆',
  },
  {
    key: 'new_arrivals',
    title: 'New Arrivals',
    subtitle: 'Fresh to our shelves',
    accentColor: 'from-blue-500 to-cyan-500',
    tagColor: 'text-blue-600',
    viewAllHref: '/products?sort=new',
    icon: '✨',
  },
  {
    key: 'ready_foods',
    title: 'Ready to Eat',
    subtitle: 'Quick, convenient Kerala meals',
    accentColor: 'from-green-500 to-emerald-600',
    tagColor: 'text-green-700',
    viewAllHref: '/categories?category=ready-to-eat',
    icon: '🍱',
  },
  {
    key: 'featured',
    title: 'Featured Picks',
    subtitle: 'Handpicked for you',
    accentColor: 'from-rose-500 to-pink-500',
    tagColor: 'text-rose-600',
    viewAllHref: '/products?featured=true',
    icon: '⭐',
  },
  {
    key: 'random_picks',
    title: 'Discover More',
    subtitle: 'Something different today',
    accentColor: 'from-teal-500 to-cyan-600',
    tagColor: 'text-teal-600',
    viewAllHref: '/products',
    icon: '🎲',
  },
];

export interface ProductBannersData {
  banners: Record<BannerKey, BannerProduct[]>;
  isLoading: boolean;
}

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  original_price: number | null;
  discount_percentage: number | null;
  image_main: string | null;
  enhanced_image_url: string | null;
  is_featured: boolean | null;
  is_bestseller: boolean | null;
  is_new_arrival: boolean | null;
  sold_count: number | null;
  category_id: string | null;
  brand_id: string | null;
  created_at: string | null;
};

type LookupRow = { id: string; name: string; slug: string | null };

function resolveImage(row: ProductRow): string | null {
  return resolveProductImage({
    image_main: row.image_main,
    enhanced_image_url: row.enhanced_image_url,
    image_url: row.image_url,
  });
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toProduct(row: ProductRow, catMap: Record<string, LookupRow>, brdMap: Record<string, LookupRow>): BannerProduct {
  const price = Number(row.price ?? 0);
  const orig = row.original_price ? Number(row.original_price) : null;
  const discount = orig && orig > price
    ? Math.round(((orig - price) / orig) * 100)
    : Number(row.discount_percentage ?? 0);
  const cat = row.category_id ? catMap[row.category_id] ?? null : null;
  const brd = row.brand_id ? brdMap[row.brand_id] ?? null : null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? row.id,
    price,
    original_price: orig,
    image_url: resolveImage(row),
    stock: 100,
    discount,
    cat_id: cat?.id ?? null,
    cat_name: cat?.name ?? null,
    cat_slug: cat?.slug ?? null,
    brd_id: brd?.id ?? null,
    brd_name: brd?.name ?? null,
    brd_slug: brd?.slug ?? null,
  };
}

const BASE_FILTER = {
  approval_status: 'approved',
  is_active: true,
} as const;

const SELECT = 'id,name,slug,price,original_price,discount_percentage,image_url,image_main,enhanced_image_url,is_featured,is_bestseller,is_new_arrival,sold_count,category_id,brand_id,created_at';

export function useProductBanners(): ProductBannersData {
  const [banners, setBanners] = useState<Record<BannerKey, BannerProduct[]>>({
    top_sellers: [],
    new_arrivals: [],
    ready_foods: [],
    featured: [],
    random_picks: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = getSupabase();

      // Fetch lookup maps safely
      const [catRes, brdRes] = await Promise.all([
        supabase.from('categories').select('id,name,slug'),
        (async () => {
          try { return await supabase.from('brands').select('id,name,slug'); }
          catch { return { data: null, error: { message: 'Table missing' } }; }
        })(),
      ]);

      const catMap: Record<string, LookupRow> = {};
      for (const r of (catRes.data ?? []) as LookupRow[]) catMap[r.id] = r;

      const readyToEatCat = (catRes.data ?? []).find((c: any) =>
        c.slug === 'ready-to-eat' || c.name.toLowerCase().includes('ready to eat')
      );

      const brdMap: Record<string, LookupRow> = {};
      for (const r of (brdRes.data ?? []) as LookupRow[]) brdMap[r.id] = r;

      // Fetch larger pools for rotation
      const [bestsellers, newArrivals, featured, readyFoods, recent] = await Promise.all([
        supabase
          .from('products')
          .select(SELECT)
          .match(BASE_FILTER)
          .neq('visibility_status', false)
          .neq('is_deleted', true)
          .not('centralhub_product_id', 'is', null)
          .not('brand', 'ilike', 'Brahmins')
          .eq('is_bestseller', true)
          .order('sold_count', { ascending: false })
          .limit(BANNER_FETCH_LIMIT),
        supabase
          .from('products')
          .select(SELECT)
          .match(BASE_FILTER)
          .neq('visibility_status', false)
          .neq('is_deleted', true)
          .not('centralhub_product_id', 'is', null)
          .not('brand', 'ilike', 'Brahmins')
          .eq('is_new_arrival', true)
          .order('created_at', { ascending: false })
          .limit(BANNER_FETCH_LIMIT),
        supabase
          .from('products')
          .select(SELECT)
          .match(BASE_FILTER)
          .neq('visibility_status', false)
          .neq('is_deleted', true)
          .not('centralhub_product_id', 'is', null)
          .not('brand', 'ilike', 'Brahmins')
          .eq('is_featured', true)
          .limit(BANNER_FETCH_LIMIT),
        readyToEatCat
          ? supabase
              .from('products')
              .select(SELECT)
              .match(BASE_FILTER)
              .neq('visibility_status', false)
              .neq('is_deleted', true)
              .not('centralhub_product_id', 'is', null)
              .not('brand', 'ilike', 'Brahmins')
              .eq('category_id', readyToEatCat.id)
              .limit(BANNER_FETCH_LIMIT)
          : Promise.resolve({ data: [] }),
        supabase
          .from('products')
          .select(SELECT)
          .match(BASE_FILTER)
          .neq('visibility_status', false)
          .neq('is_deleted', true)
          .not('centralhub_product_id', 'is', null)
          .not('brand', 'ilike', 'Brahmins')
          .order('created_at', { ascending: false })
          .limit(BANNER_FETCH_LIMIT * 2),
      ]);

      if (cancelled) return;

      const mapRows = (rows: any[]) => (rows ?? []).map(r => toProduct(r, catMap, brdMap));

      // Shuffle and slice to rotate visibility
      const allBanners = {
        top_sellers:  shuffleArray(mapRows(bestsellers.data as any)).slice(0, BANNER_DISPLAY_LIMIT),
        new_arrivals: shuffleArray(mapRows(newArrivals.data as any)).slice(0, BANNER_DISPLAY_LIMIT),
        featured:     shuffleArray(mapRows(featured.data as any)).slice(0, BANNER_DISPLAY_LIMIT),
        ready_foods:  shuffleArray(mapRows(readyFoods.data as any)).slice(0, BANNER_DISPLAY_LIMIT),
        random_picks: shuffleArray(mapRows(recent.data as any)).slice(0, BANNER_DISPLAY_LIMIT),
      };

      // Fallback for missing images
      const allProductsFlat = Object.values(allBanners).flat();
      const missingIds = allProductsFlat.filter((p) => !p.image_url).map((p) => p.id);

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
              const url = g.enhanced_image_url ?? g.image_url;
              if (url?.startsWith('http')) galleryMap.set(g.product_id, url);
            }
          }
          for (const key of Object.keys(allBanners) as BannerKey[]) {
            for (const p of allBanners[key]) {
              if (!p.image_url && galleryMap.has(p.id)) {
                p.image_url = galleryMap.get(p.id)!;
              }
            }
          }
        }
      }

      setBanners(allBanners);
      setIsLoading(false);
    }

    load().catch(() => setIsLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { banners, isLoading };
}
