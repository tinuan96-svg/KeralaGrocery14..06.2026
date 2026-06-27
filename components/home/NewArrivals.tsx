import ProductCard from '@/components/product/ProductCard';
import { Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ProductWithDetails } from '@/lib/types/database';

interface NewArrivalsProps {
  products: ProductWithDetails[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (!products || products.length === 0) return null;
  const items = products.slice(0, 10);

  return (
    <section className="ka-section pt-6 pb-4 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="ka-icon h-4 w-4 flex-shrink-0" />
            <div>
              <h2 className="text-[14px] font-extrabold text-gray-900 leading-none">New Arrivals</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Just landed in stock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{items.length} products</span>
            <Link
              href="/products?sort=new"
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
              <ProductCard product={product} priority={index < 4} />
            </div>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-3 px-4 pb-2">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
