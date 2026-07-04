'use client';

import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import { ChevronRight, TrendingUp } from 'lucide-react';
import type { ProductWithDetails } from '@/lib/types/database';

interface TrendingNowProps {
  products: ProductWithDetails[];
}

export default function TrendingNow({ products }: TrendingNowProps) {
  if (!products || products.length === 0) return null;
  const items = products.slice(0, 8);

  return (
    <section className="pt-6 pb-4 bg-white border-b border-[#d1ead9]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0B5D3B] flex-shrink-0" />
            <div>
              <h2 className="text-[14px] font-extrabold text-[#0a3d22] leading-none">Trending Now</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Popular picks right now</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{items.length} products</span>
            <Link
              href="/products"
              className="ka-view-all inline-flex items-center gap-0.5 text-xs font-bold border rounded-full px-3 py-1 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Mobile carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-3 snap-x snap-mandatory md:hidden" style={{ scrollPaddingLeft: '16px' }}>
          {items.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[160px] snap-start flex flex-col">
              <ProductCard product={product} priority={index < 3} />
            </div>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-3 px-4 pb-2">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 3} />
          ))}
        </div>
      </div>
    </section>
  );
}
