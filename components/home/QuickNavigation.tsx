'use client';

import Link from 'next/link';
import {
  ShoppingBag,
  Flame,
  Sparkles,
  Star,
  History,
  LayoutGrid
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Shop All', href: '/products', icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
  { label: 'Deals', href: '/products?filter=deals', icon: Flame, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
  { label: 'New', href: '/products?sort=newest', icon: Sparkles, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  { label: 'Best Sellers', href: '/products?sort=popular', icon: Star, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  { label: 'Orders', href: '/orders', icon: History, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { label: 'Categories', href: '/categories', icon: LayoutGrid, color: 'bg-gray-50 text-gray-600', border: 'border-gray-100' },
];

export default function QuickNavigation() {
  return (
    <section className="py-5 px-4 bg-white border-b border-gray-100 lg:hidden">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
          >
            <div className={`w-12 h-12 rounded-2xl ${link.color} border ${link.border} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
              <link.icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">
              {link.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
