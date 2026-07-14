'use client';

import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import type { Category } from '@/lib/types/database';

interface MajorCategoriesProps {
  categories: Category[];
}

const CATEGORY_STYLES: Record<string, { emoji: string; color: string; bg: string }> = {
  'ari':                { emoji: '🍚', color: 'text-stone-700',  bg: 'bg-stone-50 border-stone-100'  },
  'masala-kootu':       { emoji: '🍛', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'podi-whole-spices':  { emoji: '🌶️', color: 'text-red-700',    bg: 'bg-red-50 border-red-100'      },
  'achar-preserves':    { emoji: '🥒', color: 'text-green-700',  bg: 'bg-green-50 border-green-100'  },
  'palaharam-sweets':   { emoji: '🍿', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100'  },
  'ready-foods':        { emoji: '🍱', color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-100'    },
  'enna-neyy':          { emoji: '🫙', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100'},
  'snacks-namkeens':    { emoji: '🥜', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100'},
};

export default function MajorCategories({ categories }: MajorCategoriesProps) {
  if (!categories || categories.length === 0) return null;

  // Curate a few major ones for the homepage display
  const majorSlugs = ['ari', 'podi-whole-spices', 'achar-preserves', 'palaharam-sweets', 'ready-foods'];
  const displayCategories = categories
    .filter(c => majorSlugs.includes(c.slug))
    .sort((a, b) => majorSlugs.indexOf(a.slug) - majorSlugs.indexOf(b.slug))
    .slice(0, 5);

  // If we don't have enough specific ones, just take the first 5
  if (displayCategories.length < 3) {
    displayCategories.push(...categories.filter(c => !majorSlugs.includes(c.slug)).slice(0, 5 - displayCategories.length));
  }

  return (
    <section className="py-8 bg-white border-b border-gray-100 ka-section">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header - Matching Brands Style */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center ka-icon-bg">
              <LayoutGrid className="h-5 w-5 ka-icon" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-gray-900 leading-none tracking-tight">Major Categories</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Shop Kerala Grocery by department</p>
            </div>
          </div>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ka-view-all px-3 py-1.5 rounded-full border transition-all"
          >
            All Categories <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Category Grid - Matching Brands Style */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
          {displayCategories.map((category) => {
            const style = CATEGORY_STYLES[category.slug] ?? { emoji: '🛒', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' };

            return (
              <Link
                key={category.id}
                href={`/products?filter=${category.slug}`}
                className="group relative flex flex-col items-center gap-3 p-4 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-[0_15px_40px_rgba(11,93,59,0.08)] hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] flex items-center justify-center text-3xl shadow-inner border-2 border-white/20 transition-transform duration-500 group-hover:scale-110 ${style.bg}`}>
                  <span className="drop-shadow-sm">{style.emoji}</span>
                </div>
                <div className="text-center">
                  <p className={`text-[12px] sm:text-[13px] font-black leading-tight transition-colors line-clamp-1 ${style.color} group-hover:text-[#0B5D3B]`}>
                    {category.name}
                  </p>
                  <div className="mt-1.5 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-1 w-6 rounded-full bg-[#0B5D3B]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
