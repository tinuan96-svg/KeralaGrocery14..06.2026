'use client';

import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface CashbackPicksProps {
  products: ProductWithDetails[];
}

export default function CashbackPicks({ products }: CashbackPicksProps) {
  if (!products || products.length === 0) return null;
  const items = products.slice(0, 8);

  return (
    <section className="pt-5 pb-2 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#0F6A38] flex-shrink-0" />
            <div>
              <h2 className="text-[14px] font-extrabold text-gray-900 leading-none">Cashback Picks</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Earn up to 15% back</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{items.length} products</span>
            <Link
              href="/account/wallet"
              className="inline-flex items-center gap-0.5 text-xs text-[#0B5D3B] font-bold border border-green-200 bg-green-50 rounded-full px-3 py-1 hover:bg-green-100 transition-colors whitespace-nowrap"
            >
              Earn <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Mobile carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-3 snap-x snap-mandatory md:hidden" style={{ scrollPaddingLeft: '16px' }}>
          {items.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[128px] snap-start flex flex-col">
              <ProductCard product={product} priority={false} showCashback />
            </div>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-3 px-4 pb-2">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} priority={false} showCashback />
          ))}
        </div>
      </div>
    </section>
  );
}
