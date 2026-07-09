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
  const items = products.slice(0, 12);

  return (
    <section className="pt-8 pb-6 bg-white border-b border-[#d1ead9]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#0B5D3B]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#0a3d22] leading-none">Trending Now</h2>
              <p className="text-[12px] text-gray-500 mt-1">Popular picks from our Kerala community</p>
            </div>
          </div>
          <Link
            href="/products"
            className="ka-view-all inline-flex items-center gap-1 text-sm font-bold text-[#0B5D3B] hover:underline transition-all whitespace-nowrap"
          >
            Explore All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 snap-x snap-mandatory md:hidden" style={{ scrollPaddingLeft: '16px' }}>
          {items.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[170px] snap-start flex flex-col">
              <ProductCard product={product} priority={index < 3} />
            </div>
          ))}
        </div>

        {/* Desktop grid - More products visible */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 px-4">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
