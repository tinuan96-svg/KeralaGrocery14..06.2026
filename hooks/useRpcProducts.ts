'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProducts,
  getFilters,
  type RpcProduct,
  type RpcFilters,
  type GetRpcProductsParams,
  type RpcSortOption,
} from '@/lib/services/rpcApiClient';

const DEFAULT_LIMIT = 20;

export interface UseRpcProductsReturn {
  // data
  products: RpcProduct[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filters: RpcFilters;
  filtersLoading: boolean;
  // filter state
  search: string;
  category: string;
  brand: string;
  sort: RpcSortOption;
  // actions
  setSearch: (s: string) => void;
  setCategory: (c: string) => void;
  setBrand: (b: string) => void;
  setSort: (s: RpcSortOption) => void;
  goToPage: (p: number) => void;
  resetFilters: () => void;
  retry: () => void;
}

export function useRpcProducts(limit = DEFAULT_LIMIT, authKey?: string): UseRpcProductsReturn {
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RpcFilters>({ categories: [], brands: [], price_min: 0, price_max: 9999 });
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [search, setSearchState] = useState('');
  const [category, setCategoryState] = useState('');
  const [brand, setBrandState] = useState('');
  const [sort, setSortState] = useState<RpcSortOption>('newest');
  const [fetchKey, setFetchKey] = useState(0);

  // Load filters once on mount
  useEffect(() => {
    setFiltersLoading(true);
    getFilters().then(({ filters: f }) => {
      setFilters(f);
      setFiltersLoading(false);
    });
  }, []);

  // Load products whenever filters/page change
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, category, brand, sort, limit, fetchKey, authKey]);

  const goToPage = useCallback((p: number) => setPage(p), []);
  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setPage(1);
  }, []);

  const setCategory = useCallback((c: string) => {
    setCategoryState(c);
    setPage(1);
  }, []);

  const setBrand = useCallback((b: string) => {
    setBrandState(b);
    setPage(1);
  }, []);

  const setSort = useCallback((s: RpcSortOption) => {
    setSortState(s);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchState('');
    setCategoryState('');
    setBrandState('');
    setSortState('newest');
    setPage(1);
  }, []);

  return {
    products,
    total,
    page,
    totalPages,
    isLoading,
    error,
    filters,
    filtersLoading,
    search,
    category,
    brand,
    sort,
    setSearch,
    setCategory,
    setBrand,
    setSort,
    goToPage,
    resetFilters,
    retry,
  };
}
