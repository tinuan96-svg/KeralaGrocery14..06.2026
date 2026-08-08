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
}

export function useHomepageData(options: HomepageDataOptions = {}): HomepageData {
  const [trending, setTrending]       = useState<ProductWithDetails[]>(options.initialTrending || []);
  const [deals, setDeals]             = useState<ProductWithDetails[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductWithDetails[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories]   = useState<Category[]>(options.initialCategories || []);
  const [isLoading, setIsLoading]     = useState(!options.initialCategories);
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>(options.initialTrending || []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      // If we have initial data, we can skip some initial loading or fetch in background
      const [
        { products: trendingItems },
        { products: dealItems },
        { products: bestsellerItems },
        { products: arrivalItems },
        { products: allItems },
        cats
      ] = await Promise.all([
        fetchStoreProducts({ is_featured: true, limit: 12 }),
        fetchStoreProducts({ is_deal: true, limit: 12 }),
        fetchStoreProducts({ is_bestseller: true, limit: 12 }),
        fetchStoreProducts({ is_new_arrival: true, limit: 12 }),
        fetchStoreProducts({ limit: 40 }), // For "Kitchen Essentials" and general pool
        fetchHomepageCategories(),
      ]);

      if (cancelled) return;

      setTrending(trendingItems.length > 0 ? trendingItems : allItems.slice(0, 10));
      setDeals(dealItems.length > 0 ? dealItems : allItems.slice(10, 20));
      setBestsellers(bestsellerItems.length > 0 ? bestsellerItems : allItems.slice(20, 30));
      setNewArrivals(arrivalItems.length > 0 ? arrivalItems : allItems.slice(30, 40));

      setAllProducts(allItems);
      setCategories(cats);
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
