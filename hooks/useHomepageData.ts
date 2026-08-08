'use client';

import { useState, useEffect } from 'react';
import { fetchStoreProducts, fetchHomepageCategories } from '@/lib/services/storeProductsService';
import type { ProductWithDetails, Category } from '@/lib/types/database';

export interface HomepageData {
  allProducts: ProductWithDetails[];
  trending: ProductWithDetails[];
  deals: ProductWithDetails[];
  bestsellers: ProductWithDetails[];
  newArrivals: ProductWithDetails[];
  categories: Category[];
  isLoading: boolean;
}

export interface HomepageDataOptions {
  initialCategories?: Category[];
  initialTrending?: ProductWithDetails[];
  initialDeals?: ProductWithDetails[];
  initialBestsellers?: ProductWithDetails[];
  initialNewArrivals?: ProductWithDetails[];
}

export function useHomepageData(options: HomepageDataOptions = {}): HomepageData {
  const [trending, setTrending]       = useState<ProductWithDetails[]>(options.initialTrending || []);
  const [deals, setDeals]             = useState<ProductWithDetails[]>(options.initialDeals || []);
  const [bestsellers, setBestsellers] = useState<ProductWithDetails[]>(options.initialBestsellers || []);
  const [newArrivals, setNewArrivals] = useState<ProductWithDetails[]>(options.initialNewArrivals || []);
  const [categories, setCategories]   = useState<Category[]>(options.initialCategories || []);
  const [isLoading, setIsLoading]     = useState(!options.initialCategories && !options.initialTrending);
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>(options.initialTrending || []);

  useEffect(() => {
    let cancelled = false;

    // Skip client-side re-fetch if we have enough initial data to show the homepage
    if (options.initialTrending && options.initialDeals && options.initialBestsellers && options.initialCategories) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      // Avoid redundant fetch if we already have initial categories and trending products
      const [
        trendingItems,
        dealItems,
        bestsellerItems,
        arrivalItems,
        allItems,
        cats
      ] = await Promise.all([
        options.initialTrending ? Promise.resolve({ products: options.initialTrending }) : fetchStoreProducts({ is_featured: true, limit: 12 }),
        options.initialDeals ? Promise.resolve({ products: options.initialDeals }) : fetchStoreProducts({ is_deal: true, limit: 12 }),
        options.initialBestsellers ? Promise.resolve({ products: options.initialBestsellers }) : fetchStoreProducts({ is_bestseller: true, limit: 12 }),
        options.initialNewArrivals ? Promise.resolve({ products: options.initialNewArrivals }) : fetchStoreProducts({ is_new_arrival: true, limit: 12 }),
        fetchStoreProducts({ limit: 40 }), // For "Kitchen Essentials" and general pool
        options.initialCategories ? Promise.resolve(options.initialCategories) : fetchHomepageCategories(),
      ]);

      if (cancelled) return;

      const tItems = (trendingItems as any).products || [];
      const dItems = (dealItems as any).products || [];
      const bItems = (bestsellerItems as any).products || [];
      const nItems = (arrivalItems as any).products || [];
      const aItems = (allItems as any).products || [];

      setTrending(tItems.length > 0 ? tItems : aItems.slice(0, 10));
      setDeals(dItems.length > 0 ? dItems : aItems.slice(10, 20));
      setBestsellers(bItems.length > 0 ? bItems : aItems.slice(20, 30));
      setNewArrivals(nItems.length > 0 ? nItems : aItems.slice(30, 40));

      setAllProducts(aItems);
      setCategories(cats as Category[]);
      setIsLoading(false);
    }

    loadData();

    return () => { cancelled = true; };
  }, []);

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
