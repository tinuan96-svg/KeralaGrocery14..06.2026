'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProducts,
  getCategories,
  getBrands,
  type StorefrontProduct,
  type SortOption,
  type GetProductsOptions,
} from '@/lib/services/keralaGroceriesService';

const DEFAULT_PAGE_SIZE = 24;

export interface UseKeralaProductsReturn {
  products: StorefrontProduct[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  categories: string[];
  brands: string[];
  // filter state
  search: string;
  category: string;
  brand: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  inStockOnly: boolean;
  sort: SortOption;
  // actions
  loadMore: () => void;
  setSearch: (s: string) => void;
  setCategory: (c: string) => void;
  setBrand: (b: string) => void;
  setMinPrice: (v: number | undefined) => void;
  setMaxPrice: (v: number | undefined) => void;
  setInStockOnly: (v: boolean) => void;
  setSort: (s: SortOption) => void;
  resetFilters: () => void;
  retry: () => void;
}

export function useKeralaProducts(
  pageSize = DEFAULT_PAGE_SIZE
): UseKeralaProductsReturn {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrandsState] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState('');
  const [category, setCategoryState] = useState('');
  const [brand, setBrandState] = useState('');
  const [minPrice, setMinPriceState] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPriceState] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnlyState] = useState(false);
  const [sort, setSortState] = useState<SortOption>('newest');
  const [fetchKey, setFetchKey] = useState(0);

  // load meta once
  useEffect(() => {
    Promise.all([getCategories(), getBrands()]).then(([cats, brs]) => {
      setCategories(cats);
      setBrandsState(brs);
    });
  }, []);

  // initial / filter-reset fetch (page === 1)
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setProducts([]);

    const opts: GetProductsOptions = {
      page: 1,
      limit: pageSize,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
    };

    getProducts(opts).then((result) => {
      if (cancelled) return;
      setProducts(result.products);
      setTotal(result.total);
      setError(result.error);
      setPage(1);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, brand, minPrice, maxPrice, inStockOnly, sort, pageSize, fetchKey]);

  // load-more fetch (page > 1)
  const loadMoreRef = useRef(false);
  const loadMore = useCallback(() => {
    if (loadMoreRef.current) return;
    const nextPage = page + 1;
    const loaded = products.length;
    if (loaded >= total && total > 0) return;

    loadMoreRef.current = true;
    setIsLoadingMore(true);

    const opts: GetProductsOptions = {
      page: nextPage,
      limit: pageSize,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
    };

    getProducts(opts).then((result) => {
      loadMoreRef.current = false;
      if (result.error) {
        setIsLoadingMore(false);
        return;
      }
      setProducts((prev) => [...prev, ...result.products]);
      setTotal(result.total);
      setPage(nextPage);
      setIsLoadingMore(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, products.length, total, pageSize, search, category, brand, minPrice, maxPrice, inStockOnly, sort]);

  const resetPage = () => setPage(1);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCategory = useCallback((c: string) => {
    setCategoryState(c);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBrand = useCallback((b: string) => {
    setBrandState(b);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMinPrice = useCallback((v: number | undefined) => {
    setMinPriceState(v);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMaxPrice = useCallback((v: number | undefined) => {
    setMaxPriceState(v);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInStockOnly = useCallback((v: boolean) => {
    setInStockOnlyState(v);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSort = useCallback((s: SortOption) => {
    setSortState(s);
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = useCallback(() => {
    setSearchState('');
    setCategoryState('');
    setBrandState('');
    setMinPriceState(undefined);
    setMaxPriceState(undefined);
    setInStockOnlyState(false);
    setSortState('newest');
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  const hasMore = products.length < total;

  return {
    products,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    categories,
    brands,
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
    loadMore,
    setSearch,
    setCategory,
    setBrand,
    setMinPrice,
    setMaxPrice,
    setInStockOnly,
    setSort,
    resetFilters,
    retry,
  };
}
