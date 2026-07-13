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

export function useHomepageData(): HomepageData {
  const [trending, setTrending]       = useState<ProductWithDetails[]>([]);
  const [deals, setDeals]             = useState<ProductWithDetails[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductWithDetails[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [{ products }, cats] = await Promise.all([
        fetchStoreProducts(),
        fetchHomepageCategories(),
      ]);

      if (cancelled) return;

      // Group products into logical sections based on flags or simple distribution
      // in a real app, these would come from specialized queries, but here we
      // derive them from the main pool for efficiency.
      const trendingItems = products.filter(p => p.is_featured || p.is_hot_product).slice(0, 10);
      const dealItems = products.filter(p => p.is_deal || (p.discount_percentage && p.discount_percentage > 0)).slice(0, 10);
      const bestsellerItems = products.filter(p => p.is_bestseller).slice(0, 10);
      const arrivalItems = products.filter(p => p.is_new_arrival).slice(0, 10);

      // Fallbacks if sections are empty
      setTrending(trendingItems.length > 0 ? trendingItems : products.slice(0, 10));
      setDeals(dealItems.length > 0 ? dealItems : products.slice(10, 20));
      setBestsellers(bestsellerItems.length > 0 ? bestsellerItems : products.slice(20, 30));
      setNewArrivals(arrivalItems.length > 0 ? arrivalItems : products.slice(30, 40));

      setAllProducts(products);
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
