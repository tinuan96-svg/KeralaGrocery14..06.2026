'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, X, SlidersHorizontal, Package,
  RotateCcw, ChevronLeft, ChevronRight, Loader as Loader2,
  CircleAlert as AlertCircle, Filter, Check, LayoutGrid, List
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRpcProducts } from '@/hooks/useRpcProducts';
import RpcProductCard from '@/components/product/RpcProductCard';
import CategorySEOContent from '@/components/product/CategorySEOContent';
import type { RpcSortOption } from '@/lib/services/rpcApiClient';
import { useProductSync } from '@/hooks/useProductSync';
import { useAuth } from '@/lib/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const SORT_OPTIONS: { value: RpcSortOption; label: string }[] = [
  { value: 'newest',     label: 'Newest Arrivals'    },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc',   label: 'Name: A–Z'          },
];

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-50" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 w-16 bg-gray-100 rounded-full" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-9 w-full bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
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
  } = useRpcProducts(24, authKey);

  const [searchInput, setSearchInput] = useState(search);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sync searchInput with URL search state
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Scroll to top on page change
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page, isLoading]);

  // Debounce search
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput, search, setSearch]);

  const activeFilterCount = [category ? 1 : 0, brand ? 1 : 0].reduce((a, b) => a + b, 0);

  const handleReset = () => {
    setSearchInput('');
    resetFilters();
  };

  return (
    <div className="min-h-screen bg-[#F9FBFA]" ref={topRef}>
      {/* ── Enhanced Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search over 500+ authentic items..."
                className="pl-9 pr-10 h-11 border-gray-200 bg-gray-50 focus:bg-white text-sm rounded-xl focus:ring-green-500/20"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 h-11 rounded-xl border text-sm font-bold transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[#0B5D3B] text-white border-[#0B5D3B] shadow-md shadow-green-900/10'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center ${
                  showFilters ? 'bg-white text-[#0B5D3B]' : 'bg-white text-[#0B5D3B]'
                }`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-lg mr-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#0B5D3B]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#0B5D3B]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as RpcSortOption)}
              className="h-11 pl-4 pr-10 text-sm font-bold border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-green-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Enhanced Filter Panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border-t border-gray-100"
            >
              <div className="max-w-7xl mx-auto px-4 py-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Categories */}
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Categories</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                    <button
                      onClick={() => setCategory('')}
                      className={`flex items-center justify-between w-full text-sm py-1 ${!category ? 'text-[#0B5D3B] font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All Items
                      {!category && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {filters.categories.map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`flex items-center justify-between w-full text-sm py-1 ${category === c ? 'text-[#0B5D3B] font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {c}
                        {category === c && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Popular Brands</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                    <button
                      onClick={() => setBrand('')}
                      className={`flex items-center justify-between w-full text-sm py-1 ${!brand ? 'text-[#0B5D3B] font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All Brands
                      {!brand && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {filters.brands.map(b => (
                      <button
                        key={b}
                        onClick={() => setBrand(b)}
                        className={`flex items-center justify-between w-full text-sm py-1 ${brand === b ? 'text-[#0B5D3B] font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {b}
                        {brand === b && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status/Availability */}
                <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Availability</h3>
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 flex items-center justify-center group-hover:border-green-500 transition-colors">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-sm opacity-0 transition-opacity" />
                    </div>
                    <span className="text-sm text-gray-600">In Stock Only</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group py-1 mt-2">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 flex items-center justify-center group-hover:border-green-500 transition-colors">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-sm opacity-0 transition-opacity" />
                    </div>
                    <span className="text-sm text-gray-600">On Sale</span>
                  </label>
                </div>

                {/* Summary / Actions */}
                <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Total Found</p>
                    <p className="text-2xl font-black text-[#0B5D3B]">{total}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all mt-4"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Content Area ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Active Filter Badges */}
        {(activeFilterCount > 0 || search) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Active:</span>
            {search && (
              <Badge variant="secondary" className="pl-3 pr-2 py-1.5 rounded-full bg-white border-gray-200 text-gray-700 font-bold text-xs gap-2 group cursor-pointer hover:border-red-200" onClick={() => setSearchInput('')}>
                Search: &quot;{search}&quot; <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="pl-3 pr-2 py-1.5 rounded-full bg-white border-gray-200 text-gray-700 font-bold text-xs gap-2 group cursor-pointer hover:border-red-200" onClick={() => setCategory('')}>
                Category: {category} <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
              </Badge>
            )}
            {brand && (
              <Badge variant="secondary" className="pl-3 pr-2 py-1.5 rounded-full bg-white border-gray-200 text-gray-700 font-bold text-xs gap-2 group cursor-pointer hover:border-red-200" onClick={() => setBrand('')}>
                Brand: {brand} <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
              </Badge>
            )}
          </div>
        )}

        {/* Grid / List View */}
        {isLoading ? (
          <GridSkeleton count={24} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6 max-w-xs">{error}</p>
            <button onClick={retry} className="px-6 py-3 bg-[#0B5D3B] text-white rounded-xl font-bold hover:bg-green-700 transition-all">
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">No matching products</h2>
            <p className="text-gray-500 mb-8 max-w-xs">We couldn&apos;t find anything matching your current filters.</p>
            <button onClick={handleReset} className="px-8 py-3 bg-[#0B5D3B] text-white rounded-xl font-bold shadow-lg shadow-green-900/20 hover:-translate-y-0.5 transition-all">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-6"
            : "flex flex-col gap-4 max-w-4xl mx-auto"
          }>
            {products.map((product, i) => (
              <RpcProductCard
                key={product.id}
                product={product}
                priority={i < 12}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-12 flex flex-col items-center gap-4">
          {!isLoading && total > products.length && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Showing {((page - 1) * products.length) + 1} - {Math.min(page * products.length, total)} of {total} products
            </p>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={goToPage}
          />
        </div>

        {/* SEO Category Content */}
        {category && !isLoading && products.length > 0 && (
          <div className="mt-16">
            <CategorySEOContent category={category} />
          </div>
        )}
      </div>
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
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white hover:border-green-500 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1.5 mx-2">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-300">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm ${
                p === page
                  ? 'bg-[#0B5D3B] text-white shadow-green-900/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-600'
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white hover:border-green-500 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  );
}

