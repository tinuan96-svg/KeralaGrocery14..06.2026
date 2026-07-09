'use client';

import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import { ChevronRight, ChefHat } from 'lucide-react';
import type { ProductWithDetails } from '@/lib/types/database';

interface KitchenEssentialsProps {
  products: ProductWithDetails[];
}

export default function KitchenEssentials({ products }: KitchenEssentialsProps) {
  if (!products || products.length === 0) return null;
  // Curate essentials - maybe things with 'rice', 'oil', 'spice', 'masala' in name
  const essentials = products.filter(p =>
    p.name.toLowerCase().includes('rice') ||
    p.name.toLowerCase().includes('oil') ||
    p.name.toLowerCase().includes('spice') ||
    p.name.toLowerCase().includes('masala') ||
    p.name.toLowerCase().includes('flour')
  ).slice(0, 12);

  if (essentials.length === 0) return null;

  return (
    <section className="pt-8 pb-10 bg-[#F8F6F2] border-b border-[#e5e1da]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold text-gray-900 leading-none">Kitchen Essentials</h2>
              <p className="text-[13px] text-gray-500 mt-1.5 font-medium">Must-have authentic ingredients for every Kerala home</p>
            </div>
          </div>
          <Link
            href="/products?filter=essentials"
            className="ka-view-all inline-flex items-center gap-1 text-sm font-bold text-amber-700 hover:underline transition-all whitespace-nowrap"
          >
            Shop Essentials <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Dense grid for high product visibility */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4">
          {essentials.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
