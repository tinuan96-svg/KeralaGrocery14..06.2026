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
    <section className="pt-8 pb-6 bg-white border-b border-[#f0f9f4] ka-section">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center border border-gray-100 shadow-sm ka-icon-bg">
              <TrendingUp className="h-5 w-5 ka-icon" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-[#0a3d22] leading-none tracking-tight">Trending Now</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Popular this week</p>
            </div>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ka-view-all px-3 py-1.5 rounded-full border transition-all"
          >
            See All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 snap-x snap-mandatory md:hidden" style={{ scrollPaddingLeft: '16px' }}>
          {items.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[135px] sm:w-[170px] snap-start flex flex-col">
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
