'use client';

import { useState, useEffect } from 'react';
import { getProducts, type RpcProduct } from '@/lib/services/rpcApiClient';
import { fetchHomepageCategories } from '@/lib/services/storeProductsService';
import type { ProductWithDetails, Category } from '@/lib/types/database';

function toProductWithDetails(p: RpcProduct): ProductWithDetails {
  return {
    id: p.id,
    name: p.display_title,
    slug: p.slug ?? p.id,
    description: p.description,
    price: p.price,
    original_price: p.original_price,
    image_main: p.image_url,
    image_url: p.image_url,
    category_id: null,
    brand_id: null,
    created_at: p.created_at ?? '',
    stock: p.stock,
    is_active: true,
    discount_percentage: p.discount_pct,
    category: p.category ? { id: '', name: p.category, slug: '' } : undefined,
    brand: p.brand ? {
      id:          p.brand,
      name:        p.brand,
      slug:        p.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      logo_url:    null,
      description: null,
      created_at:  '',
      updated_at:  '',
    } : undefined,
    rating: 4.5,
  };
}

export interface HomepageData {
  allProducts: ProductWithDetails[];
  trending: ProductWithDetails[];
  deals: ProductWithDetails[];
  bestsellers: ProductWithDetails[];
  newArrivals: ProductWithDetails[];
  categories: Category[];
  isLoading: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useHomepageData(): HomepageData {
  const [trending, setTrending]       = useState<ProductWithDetails[]>([]);
  const [deals, setDeals]             = useState<ProductWithDetails[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductWithDetails[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch larger pools for rotation
    Promise.all([
      getProducts({ page: 1, limit: 30, sort: 'newest',     status: 'active' }),
      getProducts({ page: 1, limit: 30, sort: 'price_desc', status: 'active' }),
      getProducts({ page: 2, limit: 30, sort: 'newest',     status: 'active' }),
      getProducts({ page: 1, limit: 30, sort: 'price_asc',  status: 'active' }),
      fetchHomepageCategories(),
    ]).then(([newestRes, topPriceRes, page2Res, budgetRes, cats]) => {
      if (cancelled) return;

      const seen = new Set<string>();
      const dedup = (items: RpcProduct[]) =>
        shuffleArray(items)
          .filter((p) => !seen.has(p.id) && (seen.add(p.id), true))
          .map(toProductWithDetails)
          .slice(0, 10);

      setTrending(dedup(newestRes.products));
      setDeals(dedup(topPriceRes.products));
      setBestsellers(dedup(page2Res.products));
      setNewArrivals(dedup(budgetRes.products));
      setCategories(cats);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const allProducts = [
    ...trending,
    ...deals,
    ...bestsellers,
    ...newArrivals,
  ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

  return {
    allProducts,
    trending,
    deals,
    bestsellers,
    newArrivals,
    categories,
    isLoading,
  };
}
