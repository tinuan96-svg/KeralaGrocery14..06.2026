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
      const [{ products: allItems }, cats] = await Promise.all([
        fetchStoreProducts({ limit: 80, stockOnly: true }),
        fetchHomepageCategories(),
      ]);

      if (cancelled) return;

      setAllProducts(allItems);

      setTrending(allItems.filter(p => p.is_featured).slice(0, 12).length > 0
        ? allItems.filter(p => p.is_featured).slice(0, 12)
        : allItems.slice(0, 10));

      setDeals(allItems.filter(p => p.is_deal).slice(0, 12).length > 0
        ? allItems.filter(p => p.is_deal).slice(0, 12)
        : allItems.slice(10, 20));

      setBestsellers(allItems.filter(p => p.is_bestseller).slice(0, 12).length > 0
        ? allItems.filter(p => p.is_bestseller).slice(0, 12)
        : allItems.slice(20, 30));

      setNewArrivals(allItems.filter(p => p.is_new_arrival).slice(0, 12).length > 0
        ? allItems.filter(p => p.is_new_arrival).slice(0, 12)
        : allItems.slice(30, 40));

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
