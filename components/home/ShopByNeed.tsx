'use client';

import Link from 'next/link';
import { SHOP_BY_NEED } from '@/lib/config/departments';

export default function ShopByNeed() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6" aria-label="Shop by Need">
      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-4">Shop by Need</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SHOP_BY_NEED.map((item) => (
          <Link
            key={item.title}
            href={`/products?search=${encodeURIComponent(item.searchTerms.join(' '))}`}
            className="group bg-white border border-[#d1ead9] rounded-2xl p-4 hover:shadow-lg hover:border-[#0B5D3B]/30 transition-all duration-200 active:scale-95"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#0B5D3B] transition-colors leading-tight">
                  {item.title}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
