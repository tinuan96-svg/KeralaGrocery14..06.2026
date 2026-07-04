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
    <section className="ka-section pt-6 pb-4 border-b border-[#d1ead9]">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="ka-icon h-4 w-4 animate-pulse flex-shrink-0" />
            <div>
              <h2 className="text-[14px] font-extrabold text-[#0a3d22] leading-none">Flash Deals</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="ka-icon h-2.5 w-2.5 flex-shrink-0" />
                <span className="ka-timer text-[10px] font-bold font-mono">
                  {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)} remaining
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{dealsProducts.length} deals</span>
            <Link
              href="/products?filter=deals"
              className="ka-view-all inline-flex items-center gap-0.5 text-xs font-bold border rounded-full px-3 py-1 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
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
