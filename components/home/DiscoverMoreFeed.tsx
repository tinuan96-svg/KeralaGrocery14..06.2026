'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader as Loader2, Sparkles } from 'lucide-react';
import { getProducts, type RpcProduct } from '@/lib/services/rpcApiClient';
import RpcProductCard from '@/components/product/RpcProductCard';

const PAGE_SIZE = 16;
// Start from page 3 so we don't duplicate what the curated sections already show
const START_PAGE = 3;

export default function DiscoverMoreFeed() {
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [page, setPage] = useState(START_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async (nextPage: number) => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await getProducts({
        page: nextPage,
        limit: PAGE_SIZE,
        sort: 'newest',
        status: 'active',
      });
      const incoming = result.products;
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setHasMore(incoming.length === PAGE_SIZE);
      setPage(nextPage + 1);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore]);

  // Initial load
  useEffect(() => {
    loadMore(START_PAGE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection observer sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          setPage((p) => { loadMore(p); return p; });
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (products.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="py-4 px-4 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h2 className="text-[15px] font-extrabold text-gray-900 tracking-tight">Discover More</h2>
        <span className="text-xs text-gray-400 font-medium">Keep browsing</span>
      </div>

      {/* Product grid - Increased density */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {products.map((product, i) => (
          <RpcProductCard key={product.id} product={product} priority={i < 6} />
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading more…</span>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && products.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-6 font-medium">
          You have reached the end of the catalogue
        </p>
      )}

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />
    </section>
  );
}
