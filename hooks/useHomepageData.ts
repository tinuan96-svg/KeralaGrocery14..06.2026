'use client';

import { useQuery } from '@tanstack/react-query';
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
  const { data, isLoading } = useQuery({
    queryKey: ['homepage-data'],
    queryFn: async () => {
      const [{ products: allItems }, cats] = await Promise.all([
        fetchStoreProducts({ limit: 100, stockOnly: true }),
        fetchHomepageCategories(),
      ]);

      const featured = allItems.filter(p => p.is_featured).slice(0, 12);
      const trending = featured.length > 0 ? featured : allItems.slice(0, 10);

      const deals = allItems.filter(p => p.is_deal).slice(0, 12);
      const activeDeals = deals.length > 0 ? deals : allItems.slice(10, 20);

      const bs = allItems.filter(p => p.is_bestseller).slice(0, 12);
      const bestsellers = bs.length > 0 ? bs : allItems.slice(20, 30);

      const na = allItems.filter(p => p.is_new_arrival).slice(0, 12);
      const newArrivals = na.length > 0 ? na : allItems.slice(30, 40);

      return {
        allProducts: allItems,
        trending,
        deals: activeDeals,
        bestsellers,
        newArrivals,
        categories: cats,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    allProducts: data?.allProducts || [],
    trending: data?.trending || [],
    deals: data?.deals || [],
    bestsellers: data?.bestsellers || [],
    newArrivals: data?.newArrivals || [],
    categories: data?.categories || [],
    isLoading,
  };
}
