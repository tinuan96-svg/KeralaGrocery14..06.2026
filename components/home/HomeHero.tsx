'use client';

import Link from 'next/link';
import { ShieldCheck, Truck, Leaf, Package } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: Truck, text: 'UK Delivery' },
  { icon: ShieldCheck, text: 'Secure Payments' },
  { icon: Leaf, text: 'Authentic Products' },
  { icon: Package, text: 'Fresh Stock' },
];

export default function HomeHero() {
  return (
    <section className="relative bg-gradient-to-br from-[#0a3d22] via-[#0B5D3B] to-[#0d6b44] overflow-hidden">
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-6 sm:py-10 md:py-12">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Authentic Kerala Groceries Delivered Across the UK
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/80 leading-relaxed">
            Shop rice, spices, snacks, frozen foods, fresh essentials and more.
          </p>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Link
              href="/products"
              className="inline-flex items-center justify-center h-11 sm:h-12 px-6 bg-[#6FDB2F] hover:bg-[#7fe835] text-[#0a3d22] font-bold text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-lg"
            >
              SHOP ALL PRODUCTS
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center h-11 sm:h-12 px-6 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-95 backdrop-blur-sm"
            >
              BROWSE CATEGORIES
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
            {TRUST_ITEMS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[#6FDB2F]" />
                <span className="text-[11px] sm:text-xs font-semibold text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
