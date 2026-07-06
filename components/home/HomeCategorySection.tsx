'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/lib/types/database';

interface HomeCategorySectionProps {
  categories: Category[];
}

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  'masala-kootu':        { emoji: '🍛', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'madhuram':            { emoji: '🍮', color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-100'   },
  'atta-podikal':        { emoji: '🌾', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100'  },
  'kondattam-fryums':    { emoji: '🥨', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100'},
  'arogya-care':         { emoji: '💊', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'    },
  'veedu-care':          { emoji: '🧹', color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-100'  },
  'enna-neyy':           { emoji: '🫙', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100'},
  'achar-preserves':     { emoji: '🥒', color: 'text-green-700',  bg: 'bg-green-50 border-green-100'  },
  'parippu-payar':       { emoji: '🫘', color: 'text-lime-700',   bg: 'bg-lime-50 border-lime-100'    },
  'ready-foods':         { emoji: '🍱', color: 'text-red-700',    bg: 'bg-red-50 border-red-100'      },
  'ari':                 { emoji: '🍚', color: 'text-stone-700',  bg: 'bg-stone-50 border-stone-100'  },
  'thalippu-condiments': { emoji: '🧂', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-100'    },
  'palaharam-sweets':    { emoji: '🍿', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100'},
  'podi-whole-spices':   { emoji: '🌶️', color: 'text-red-700',   bg: 'bg-red-50 border-red-100'      },
  'chaaya-coffee':       { emoji: '☕', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100'},
};

export default function HomeCategorySection({ categories }: HomeCategorySectionProps) {
  if (!categories || categories.length === 0) return null;

  const visible = categories.slice(0, 15);

  return (
    <section className="bg-white py-4 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-extrabold text-gray-900">Shop by Category</h2>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-xs font-semibold text-[#0F6A38] hover:text-green-700 transition-colors"
          >
            All categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Desktop: 5-col then 6-col grid — compact horizontal cards */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 gap-2">
          {visible.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat.slug] ?? { emoji: '🛒', color: 'text-green-700', bg: 'bg-green-50 border-green-100' };
            return (
              <Link
                key={cat.id}
                href={`/products?filter=${cat.slug}`}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl border ${cfg.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <span className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200 leading-none">{cfg.emoji}</span>
                <span className={`text-[11px] font-bold ${cfg.color} leading-tight line-clamp-2`}>{cat.name}</span>
              </Link>
            );
          })}
          <Link
            href="/categories"
            className="group flex items-center gap-2 px-2.5 py-2 rounded-xl border bg-[#0F6A38] border-green-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-xl flex-shrink-0 leading-none">🗂️</span>
            <span className="text-[11px] font-bold text-white leading-tight">View All</span>
          </Link>
        </div>

        {/* Mobile: 2-col compact grid */}
        <div className="md:hidden grid grid-cols-2 gap-1.5">
          {visible.slice(0, 8).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat.slug] ?? { emoji: '🛒', color: 'text-green-700', bg: 'bg-green-50 border-green-100' };
            return (
              <Link
                key={cat.id}
                href={`/products?filter=${cat.slug}`}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${cfg.bg} active:scale-95 transition-transform`}
              >
                <span className="text-lg flex-shrink-0 leading-none">{cfg.emoji}</span>
                <span className={`text-[11px] font-bold ${cfg.color} leading-tight line-clamp-1`}>{cat.name}</span>
              </Link>
            );
          })}
          <Link
            href="/categories"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#0F6A38] border border-green-600 col-span-2 justify-center active:scale-95 transition-transform"
          >
            <span className="text-[11px] font-bold text-white">View All Categories</span>
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </Link>
        </div>
      </div>
    </section>
  );
}
