'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/types/database';


interface CategoryPillsProps {
  categories: Category[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  'spices-masala':        '🌶️',
  'rice-grains':          '🍚',
  'oils-ghee':            '🫙',
  'pickles-condiments':   '🥒',
  'flours-powders':       '🌾',
  'beverages':            '☕',
  'pulses-lentils':       '🫘',
  'ready-to-eat':         '🍱',
  'household-cleaning':   '🧹',
  'masala-kootu':         '🍛',
  'madhuram':             '🍮',
  'atta-podikal':         '🌾',
  'kondattam-fryums':     '🥨',
  'arogya-care':          '💊',
  'enna-neyy':            '🫙',
  'achar-preserves':      '🥒',
  'parippu-payar':        '🫘',
  'ready-foods':          '🍱',
  'ari':                  '🍚',
  'thalippu-condiments':  '🧂',
  'palaharam-sweets':     '🍿',
  'podi-whole-spices':    '🌶️',
  'chaaya-coffee':        '☕',
};

const CATEGORY_BG: Record<string, string> = {
  'spices-masala':       'bg-red-50   border-red-100   text-red-700',
  'rice-grains':         'bg-orange-50 border-orange-100 text-orange-700',
  'oils-ghee':           'bg-yellow-50 border-yellow-100 text-yellow-700',
  'pickles-condiments':  'bg-emerald-50 border-emerald-100 text-emerald-700',
  'flours-powders':      'bg-pink-50   border-pink-100   text-pink-700',
  'beverages':           'bg-blue-50   border-blue-100   text-blue-700',
  'pulses-lentils':      'bg-amber-50  border-amber-100  text-amber-700',
  'ready-to-eat':        'bg-teal-50   border-teal-100   text-teal-700',
  'household-cleaning':  'bg-gray-50   border-gray-200   text-gray-700',
};

function getBg(slug: string): string {
  return CATEGORY_BG[slug] ?? 'bg-green-50 border-green-100 text-green-700';
}

export default function CategoryPills({ categories }: CategoryPillsProps) {
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get('filter');

  return (
    <>
      {/* Mobile: non-sticky, inline below hero */}
      <div className="md:hidden bg-white border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <Link
              href="/products"
              className={`flex-shrink-0 snap-start flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-[12px] border transition-all duration-150 whitespace-nowrap active:scale-95 ${
                !activeFilter
                  ? 'bg-[#0B5D3B] text-white border-[#0B5D3B]'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <span className="text-sm leading-none">🛒</span>
              All
            </Link>
            {categories.map((category) => {
              const isActive = activeFilter === category.slug;
              const emoji = CATEGORY_EMOJI[category.slug] ?? '🏷️';
              const colorCls = getBg(category.slug);
              return (
                <Link
                  key={category.id}
                  href={`/products?filter=${category.slug}`}
                  className={`flex-shrink-0 snap-start flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-[12px] border transition-all duration-150 whitespace-nowrap active:scale-95 ${
                    isActive ? 'bg-[#0B5D3B] text-white border-[#0B5D3B]' : `${colorCls} hover:opacity-80`
                  }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: sticky bar */}
      <div className="hidden md:block sticky top-[56px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {/* All pill */}
            <Link
              href="/products"
              className={`flex-shrink-0 snap-start flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-[12px] border transition-all duration-150 whitespace-nowrap active:scale-95 ${
                !activeFilter
                  ? 'bg-[#0B5D3B] text-white border-[#0B5D3B] shadow-sm'
                  : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'
              }`}
            >
              <span className="text-sm leading-none">🛒</span>
              All
            </Link>

            {categories.map((category) => {
              const isActive = activeFilter === category.slug;
              const emoji = CATEGORY_EMOJI[category.slug] ?? '🏷️';
              const colorCls = getBg(category.slug);

              return (
                <Link
                  key={category.id}
                  href={`/products?filter=${category.slug}`}
                  className={`flex-shrink-0 snap-start flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-[12px] border transition-all duration-150 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-[#0B5D3B] text-white border-[#0B5D3B] shadow-sm ring-2 ring-green-300/40'
                      : `${colorCls} hover:opacity-80`
                  }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
