import ProductCard from '@/components/product/ProductCard';
import { Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ProductWithDetails } from '@/lib/types/database';

interface NewArrivalsProps {
  products: ProductWithDetails[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (!products || products.length === 0) return null;
  const items = products.slice(0, 12);

  return (
    <section className="ka-section pt-8 pb-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-gray-900 leading-none">New Arrivals</h2>
              <p className="text-[12px] text-gray-500 mt-1">Fresh from Kerala - Just landed in stock</p>
            </div>
          </div>
          <Link
            href="/products?sort=new"
            className="ka-view-all inline-flex items-center gap-1 text-sm font-bold text-[#0B5D3B] hover:underline transition-all whitespace-nowrap"
          >
            Explore All <ChevronRight className="h-4 w-4" />
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

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 px-4">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
