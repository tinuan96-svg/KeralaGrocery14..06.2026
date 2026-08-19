'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getProducts,
  getFilters,
  type RpcProduct,
  type RpcFilters,
  type GetRpcProductsParams,
  type RpcSortOption,
} from '@/lib/services/rpcApiClient';

const DEFAULT_LIMIT = 40;

export interface UseRpcProductsReturn {
  products: RpcProduct[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filters: RpcFilters;
  filtersLoading: boolean;
  search: string;
  category: string;
  brand: string;
  sort: RpcSortOption;
  setSearch: (s: string) => void;
  setCategory: (c: string) => void;
  setBrand: (b: string) => void;
  setSort: (s: RpcSortOption) => void;
  goToPage: (p: number) => void;
  resetFilters: () => void;
  retry: () => void;
}

export function useRpcProducts(limit = DEFAULT_LIMIT, authKey?: string): UseRpcProductsReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const initialSearch = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';
  const initialSort = (searchParams.get('sort') as RpcSortOption) || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [search, setSearchState] = useState(initialSearch);
  const [category, setCategoryState] = useState(initialCategory);
  const [brand, setBrandState] = useState(initialBrand);
  const [sort, setSortState] = useState<RpcSortOption>(initialSort);
  const [page, setPage] = useState(initialPage);

  // Sync state with URL when searchParams change (handles Back button)
  useEffect(() => {
    setSearchState(searchParams.get('q') || '');
    setCategoryState(searchParams.get('category') || '');
    setBrandState(searchParams.get('brand') || '');
    setSortState((searchParams.get('sort') as RpcSortOption) || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const { data: filtersData, isLoading: filtersLoading } = useQuery({
    queryKey: ['rpc-filters'],
    queryFn: () => getFilters().then(res => res.filters),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: retry
  } = useQuery({
    queryKey: ['rpc-products', { page, search, category, brand, sort, limit, authKey }],
    queryFn: () => getProducts({
      page,
      limit,
      search,
      category: category || null,
      brand: brand || null,
      sort,
      status: 'active',
    }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateUrl = useCallback((newParams: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    updateUrl({ page: p });
  }, [updateUrl]);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setPage(1);
    updateUrl({ q: s, page: 1 });
  }, [updateUrl]);

  const setCategory = useCallback((c: string) => {
    setCategoryState(c);
    setPage(1);
    updateUrl({ category: c, page: 1 });
  }, [updateUrl]);

  const setBrand = useCallback((b: string) => {
    setBrandState(b);
    setPage(1);
    updateUrl({ brand: b, page: 1 });
  }, [updateUrl]);

  const setSort = useCallback((s: RpcSortOption) => {
    setSortState(s);
    setPage(1);
    updateUrl({ sort: s, page: 1 });
  }, [updateUrl]);

  const resetFilters = useCallback(() => {
    setSearchState('');
    setCategoryState('');
    setBrandState('');
    setSortState('newest');
    setPage(1);
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    products: productsData?.products || [],
    total: productsData?.total || 0,
    page,
    totalPages: productsData?.totalPages || 0,
    isLoading: productsLoading,
    error: productsError ? (productsError as Error).message : (productsData?.error || null),
    filters: filtersData || { categories: [], brands: [], price_min: 0, price_max: 9999 },
    filtersLoading,
    search, category, brand, sort,
    setSearch, setCategory, setBrand, setSort,
    goToPage, resetFilters, retry,
  };
}
