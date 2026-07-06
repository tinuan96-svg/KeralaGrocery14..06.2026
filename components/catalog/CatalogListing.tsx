'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw, CircleAlert, Package, ChevronLeft, ChevronRight, Wifi } from 'lucide-react';
import {
  fetchCatalogProducts,
  fetchProductTypes,
  subscribeToProductsChanges,
  type CatalogProduct,
} from '@/lib/services/catalogService';
import CatalogProductCard from './CatalogProductCard';
import CatalogSkeleton from './CatalogSkeleton';

const PAGE_SIZE = 24;

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 py-10" aria-label="Pagination">
      <button
        onClick={() => onPage(page - 1)} disabled={page === 1}
        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
              p === page ? 'bg-[#0B5D3B] text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >{p}</button>
        )
      )}
      <button
        onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export default function CatalogListing() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  const topRef = useRef<HTMLDivElement>(null);
  // Keep current page in a ref so the stable realtime callbacks can read it
  const pageRef = useRef(page);
  const searchRef = useRef(search);
  const activeTypeRef = useRef(activeType);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { activeTypeRef.current = activeType; }, [activeType]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Load filter options once
  useEffect(() => {
    fetchProductTypes().then(setProductTypes);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch products
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetchCatalogProducts({ page, pageSize: PAGE_SIZE, search, productType: activeType }).then((res) => {
      setProducts(res.products);
      setTotal(res.total);
      setError(res.error);
      setIsLoading(false);
    });
  }, [page, search, activeType, fetchKey]);

  // Scroll to top on page change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  // Realtime subscription — update UI state without page refresh
  useEffect(() => {
    setRealtimeStatus('connecting');

    const channel = subscribeToProductsChanges({
      onInsert: (product) => {
        // Only surface inserts on page 1 with no filters — avoids confusing mid-filter insertions
        if (pageRef.current === 1 && !searchRef.current && !activeTypeRef.current) {
          setProducts((prev) => {
            if (prev.some((p) => p.id === product.id)) return prev;
            return [product, ...prev].slice(0, PAGE_SIZE);
          });
          setTotal((t) => t + 1);
        }
      },
      onUpdate: (product) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
        );
      },
      onDelete: (id) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      },
      onResync: () => {
        setRealtimeStatus('error');
        setFetchKey((k) => k + 1);
      },
      onStatusChange: (status) => setRealtimeStatus(status),
    });

    return () => {
      channel.unsubscribe();
    };
  // Intentionally stable — only runs once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setActiveType(null);
    setPage(1);
  }, []);

  const retry = useCallback(() => setFetchKey((k) => k + 1), []);

  const hasFilters = search || activeType;

  return (
    <div className="min-h-screen bg-gray-50" ref={topRef}>

      {/* ── Sticky toolbar ─────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-8 h-9 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white text-sm focus:outline-none focus:border-[#0B5D3B] transition-colors"
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

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}

          {/* Filter indicator */}
          {activeType && (
            <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#0B5D3B] text-white text-sm font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeType}
              <button onClick={() => setActiveType(null)} className="ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── Type filter chips ─────────────────────────── */}
        {productTypes.length > 0 && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
              <button
                onClick={() => { setActiveType(null); setPage(1); }}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  !activeType ? 'bg-[#0B5D3B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {productTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => { setActiveType(activeType === t ? null : t); setPage(1); }}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeType === t ? 'bg-[#0B5D3B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Result count + live indicator ────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {isLoading ? (
            <span className="inline-block h-4 w-32 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              {total.toLocaleString()} product{total !== 1 ? 's' : ''}
              {search ? ` for "${search}"` : ''}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {realtimeStatus === 'live' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </>
          ) : realtimeStatus === 'error' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600">Reconnecting…</span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
              <span className="text-xs text-gray-400">Connecting…</span>
            </>
          )}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        {isLoading ? (
          <CatalogSkeleton count={PAGE_SIZE} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <CircleAlert className="w-12 h-12 text-red-400" />
            <p className="font-semibold text-gray-800">Failed to load products</p>
            <p className="text-sm text-gray-400 max-w-xs">{error}</p>
            <button
              onClick={retry}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors mt-1"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <Package className="w-14 h-14 text-gray-200" />
            <p className="font-semibold text-gray-800 text-lg">No products found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors mt-2"
            >
              <RotateCcw className="w-4 h-4" /> Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => (
              <CatalogProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
