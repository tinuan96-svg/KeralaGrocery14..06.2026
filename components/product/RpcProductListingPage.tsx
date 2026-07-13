'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, X, SlidersHorizontal, Package,
  RotateCcw, ChevronLeft, ChevronRight, Loader as Loader2,
  CircleAlert as AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRpcProducts } from '@/hooks/useRpcProducts';
import RpcProductCard from '@/components/product/RpcProductCard';
import type { RpcSortOption } from '@/lib/services/rpcApiClient';
import { useProductSync } from '@/hooks/useProductSync';
import { useAuth } from '@/lib/context/AuthContext';

const SORT_OPTIONS: { value: RpcSortOption; label: string }[] = [
  { value: 'newest',     label: 'Newest'             },
  { value: 'oldest',     label: 'Oldest'             },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc',   label: 'Name: A–Z'          },
];

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 w-16 bg-gray-100 rounded-full" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-5 w-20 bg-gray-100 rounded mt-1" />
        <div className="h-9 w-full bg-gray-100 rounded-xl mt-1" />
      </div>
    </div>
  );
}

function GridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 py-8" aria-label="Pagination">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
              p === page
                ? 'bg-[#0B5D3B] text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export default function RpcProductListingPage() {
  useProductSync();
  const { user, loading: authLoading } = useAuth();
  const authKey = authLoading ? 'loading' : (user?.id ?? 'anon');
  const {
    products, total, page, totalPages,
    isLoading, error,
    filters,
    search, category, brand, sort,
    setSearch, setCategory, setBrand, setSort,
    goToPage, resetFilters, retry,
  } = useRpcProducts(20, authKey);

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Scroll to top on page change
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  const activeFilterCount = [category ? 1 : 0, brand ? 1 : 0].reduce((a, b) => a + b, 0);

  const handleReset = () => {
    setSearchInput('');
    resetFilters();
  };

  return (
    <div className="min-h-screen bg-gray-50" ref={topRef}>
      {/* ── Sticky filter header — sits below the main app header (z-50) ── */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, brands…"
              className="pl-9 pr-8 h-9 border-gray-200 bg-gray-50 focus:bg-white text-sm"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 h-9 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                showFilters ? 'bg-white text-green-600' : 'bg-green-600 text-white'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as RpcSortOption)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-green-500 hidden sm:block"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── Filter panel ────────────────────────────────────── */}
        {showFilters && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 max-w-7xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-green-500"
                >
                  <option value="">All Categories</option>
                  {filters.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Brand
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-green-500"
                >
                  <option value="">All Brands</option>
                  {filters.brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Mobile sort */}
              <div className="sm:hidden">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Sort by
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as RpcSortOption)}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-green-500"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filters row */}
            {(activeFilterCount > 0 || search) && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Active:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setSearchInput('')}>
                    &quot;{search}&quot; <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
                {category && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setCategory('')}>
                    {category} <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
                {brand && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setBrand('')}>
                    {brand} <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
                <button
                  onClick={handleReset}
                  className="ml-auto flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Reset all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category chip strip ─────────────────────────────── */}
      {filters.categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                !category
                  ? 'bg-[#0B5D3B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {filters.categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? '' : c)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  category === c
                    ? 'bg-[#0B5D3B] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Result count ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isLoading ? (
            <span className="inline-block w-32 h-4 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              {search ? `Results for "${search}"` : 'All Products'}
            </>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-4">
        {isLoading ? (
          <GridSkeleton count={20} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-gray-700 font-semibold">Failed to load products</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={retry}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors mt-1"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Package className="w-14 h-14 text-gray-200" />
            <p className="text-gray-700 font-semibold text-lg">No products found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors mt-2"
            >
              <RotateCcw className="w-4 h-4" /> Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((product, i) => (
              <RpcProductCard
                key={product.id}
                product={product}
                priority={i < 10}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
