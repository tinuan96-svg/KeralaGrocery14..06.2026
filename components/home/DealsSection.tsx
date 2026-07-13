'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Flame, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface DealsSectionProps {
  products: ProductWithDetails[];
}

export default function DealsSection({ products }: DealsSectionProps) {
  const dealsProducts = products.slice(0, 10);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="pt-6 pb-4 bg-white border-b border-[#fef2f2]">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
              <Flame className="h-5 w-5 text-red-500 fill-red-500/20 animate-pulse" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-[#991b1b] leading-none tracking-tight">Flash Deals</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-3 w-3 text-red-400" />
                <span className="text-[11px] font-bold font-mono text-red-500 tracking-tighter">
                  {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s left
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/products?filter=deals"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 hover:bg-red-100 transition-all"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-3 snap-x snap-mandatory" style={{ scrollPaddingLeft: '16px' }}>
          {dealsProducts.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[176px] snap-start flex flex-col">
              <ProductCard product={product} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
