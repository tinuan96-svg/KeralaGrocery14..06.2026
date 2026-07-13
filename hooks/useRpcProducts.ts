'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  getProducts,
  getFilters,
  type RpcProduct,
  type RpcFilters,
  type GetRpcProductsParams,
  type RpcSortOption,
} from '@/lib/services/rpcApiClient';

const DEFAULT_LIMIT = 2000;

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

  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RpcFilters>({ categories: [], brands: [], price_min: 0, price_max: 9999 });
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [search, setSearchState] = useState(initialSearch);
  const [category, setCategoryState] = useState(initialCategory);
  const [brand, setBrandState] = useState(initialBrand);
  const [sort, setSortState] = useState<RpcSortOption>(initialSort);
  const [fetchKey, setFetchKey] = useState(0);

  // Sync state with URL when searchParams change (handles Back button)
  useEffect(() => {
    setSearchState(searchParams.get('q') || '');
    setCategoryState(searchParams.get('category') || '');
    setBrandState(searchParams.get('brand') || '');
    setSortState((searchParams.get('sort') as RpcSortOption) || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Update URL whenever filter state changes
  const updateUrl = useCallback((newParams: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setFiltersLoading(true);
    getFilters().then(({ filters: f }) => {
      setFilters(f);
      setFiltersLoading(false);
    });
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    const params: GetRpcProductsParams = {
      page,
      limit,
      search,
      category: category || null,
      brand: brand || null,
      sort,
      status: 'active',
    };

    getProducts(params).then((result) => {
      setProducts(result.products);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setError(result.error);
      setIsLoading(false);
    });

    return () => { abortRef.current?.abort(); };
  }, [page, search, category, brand, sort, limit, fetchKey, authKey]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    updateUrl({ page: p });
  }, [updateUrl]);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

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
    products, total, page, totalPages,
    isLoading, error,
    filters, filtersLoading,
    search, category, brand, sort,
    setSearch, setCategory, setBrand, setSort,
    goToPage, resetFilters, retry,
  };
}
