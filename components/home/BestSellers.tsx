import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

interface BestSellersProps {
  products: ProductWithDetails[];
}

export default function BestSellers({ products }: BestSellersProps) {
  const items = products.slice(0, 12);
  if (items.length === 0) return null;

  return (
    <section className="ka-section pt-8 pb-6 border-b border-[#d1ead9]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#0a3d22] leading-none">Top Sellers</h2>
              <p className="text-[12px] text-gray-500 mt-1">Our most loved authentic products</p>
            </div>
          </div>
          <Link
            href="/products"
            className="ka-view-all inline-flex items-center gap-1 text-sm font-bold text-[#0B5D3B] hover:underline transition-all whitespace-nowrap"
          >
            See All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile carousel */}
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 snap-x snap-mandatory md:hidden" style={{ scrollPaddingLeft: '16px' }}>
          {items.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[170px] snap-start flex flex-col">
              <ProductCard product={product} priority={index < 4} />
            </div>
          ))}
        </div>

        {/* Desktop grid - More density for premium feel */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 px-4">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
