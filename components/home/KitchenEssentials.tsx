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
    <section className="pt-8 pb-10 bg-[#FBFBF9] border-b border-[#ecece8]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center border border-amber-200 shadow-sm">
              <ChefHat className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-gray-900 leading-none tracking-tight">Kitchen Essentials</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Must-have ingredients</p>
            </div>
          </div>
          <Link
            href="/products?filter=essentials"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-100 transition-all"
          >
            Shop All <ChevronRight className="h-4 w-4" />
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
