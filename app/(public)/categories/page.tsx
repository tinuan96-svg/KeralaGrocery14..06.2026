import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Shop by Category | Kerala & Indian Grocery Categories UK',
  description:
    'Browse all categories of authentic Kerala and Indian groceries — spices, rice, snacks, pickles, oils, sweets, ready meals, and more. Fast UK delivery.',
  alternates: {
    canonical: 'https://keralagrocery.com/categories',
  },
  openGraph: {
    title: 'Shop by Category | Kerala & Indian Grocery Categories UK',
    description:
      'Browse all categories of authentic Kerala and Indian groceries — spices, rice, snacks, pickles, oils, sweets, ready meals, and more.',
    url: 'https://keralagrocery.com/categories',
    type: 'website',
  },
};

// In static export, we don't use force-dynamic
// export const dynamic = 'force-dynamic';

interface CategoryConfig {
  emoji: string;
  gradient: string;
  border: string;
  text: string;
  badge: string;
  description: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'masala-kootu':         { emoji: '🍛', gradient: 'from-orange-50 to-amber-50',   border: 'border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-100 text-orange-700',   description: 'Authentic curry blends' },
  'madhuram':             { emoji: '🍮', gradient: 'from-pink-50 to-rose-50',       border: 'border-pink-200',    text: 'text-pink-800',    badge: 'bg-pink-100 text-pink-700',       description: 'Traditional sweets' },
  'atta-podikal':         { emoji: '🌾', gradient: 'from-amber-50 to-yellow-50',    border: 'border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700',     description: 'Fresh ground flours' },
  'kondattam-fryums':     { emoji: '🥨', gradient: 'from-yellow-50 to-lime-50',     border: 'border-yellow-200',  text: 'text-yellow-800',  badge: 'bg-yellow-100 text-yellow-700',   description: 'Crispy favourites' },
  'arogya-care':          { emoji: '💊', gradient: 'from-blue-50 to-sky-50',        border: 'border-blue-200',    text: 'text-blue-800',    badge: 'bg-blue-100 text-blue-700',       description: 'Wellness essentials' },
  'veedu-care':           { emoji: '🧹', gradient: 'from-slate-50 to-gray-50',      border: 'border-slate-200',   text: 'text-slate-800',   badge: 'bg-slate-100 text-slate-700',     description: 'Home essentials' },
  'enna-neyy':            { emoji: '🫙', gradient: 'from-yellow-50 to-amber-50',    border: 'border-yellow-200',  text: 'text-yellow-800',  badge: 'bg-yellow-100 text-yellow-700',   description: 'Pure oils & ghee' },
  'achar-preserves':      { emoji: '🥒', gradient: 'from-green-50 to-emerald-50',   border: 'border-green-200',   text: 'text-green-800',   badge: 'bg-green-100 text-green-700',     description: 'Home-style achars' },
  'parippu-payar':        { emoji: '🫘', gradient: 'from-lime-50 to-green-50',      border: 'border-lime-200',    text: 'text-lime-800',    badge: 'bg-lime-100 text-lime-700',       description: 'Protein-rich dals' },
  'ready-foods':          { emoji: '🍱', gradient: 'from-red-50 to-orange-50',      border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-100 text-red-700',         description: 'Quick Kerala meals' },
  'ari':                  { emoji: '🍚', gradient: 'from-stone-50 to-neutral-50',   border: 'border-stone-200',   text: 'text-stone-800',   badge: 'bg-stone-100 text-stone-700',     description: 'Matta, Basmati & more' },
  'thalippu-condiments':  { emoji: '🧂', gradient: 'from-teal-50 to-cyan-50',       border: 'border-teal-200',    text: 'text-teal-800',    badge: 'bg-teal-100 text-teal-700',       description: 'Flavour boosters' },
  'palaharam-sweets':     { emoji: '🍿', gradient: 'from-orange-50 to-red-50',      border: 'border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-100 text-orange-700',   description: 'Kerala favourites' },
  'podi-whole-spices':    { emoji: '🌶️', gradient: 'from-red-50 to-rose-50',        border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-100 text-red-700',         description: 'Whole & ground' },
  'chaaya-coffee':        { emoji: '☕', gradient: 'from-emerald-50 to-teal-50',    border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', description: 'Kerala brews' },
};

const DEFAULT_CONFIG: CategoryConfig = {
  emoji: '🛒',
  gradient: 'from-gray-50 to-slate-50',
  border: 'border-gray-200',
  text: 'text-gray-800',
  badge: 'bg-gray-100 text-gray-700',
  description: 'Shop now',
};

export default async function CategoriesPage() {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const categories = data || [];

  return (
    <div className="min-h-screen bg-[#f8faf7] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm pt-10 pb-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0B5D3B] text-[11px] font-black uppercase tracking-widest mb-4">
            <LayoutGrid className="w-3.5 h-3.5" />
            Explore Our World
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 leading-none tracking-tight mb-4">
            Shop by Category
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base font-medium">
            Discover thousands of authentic Kerala and Indian products carefully curated into easy-to-browse collections.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {categories.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm">
             <div className="w-20 h-20 rounded-[30px] bg-gray-50 flex items-center justify-center mx-auto mb-4">
               <Package className="h-8 w-8 text-gray-200" />
             </div>
             <p className="text-gray-900 font-black text-lg">No categories available</p>
             <p className="text-gray-400 font-medium text-sm mt-1">We are updating our catalog. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((category) => {
              const config = CATEGORY_CONFIG[category.slug] ?? DEFAULT_CONFIG;
              return (
                <Link
                  key={category.id}
                  href={`/products?filter=${category.slug}`}
                  className={`
                    group relative flex flex-col items-center text-center
                    bg-white border border-gray-100
                    rounded-[28px] p-5 pb-6
                    transition-all duration-300
                    hover:shadow-[0_20px_50px_rgba(11,93,59,0.08)] hover:-translate-y-1.5 hover:border-emerald-200
                    cursor-pointer
                  `}
                >
                  <div className={`w-16 h-16 rounded-[22px] bg-gradient-to-br ${config.gradient} shadow-sm flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform duration-300 border border-white/50`}>
                    {config.emoji}
                  </div>
                  <h3 className={`text-[15px] font-black ${config.text} leading-tight mb-1 group-hover:text-[#0B5D3B] transition-colors`}>
                    {category.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter mb-4">
                    {config.description}
                  </p>
                  <div className={`mt-auto inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-300 ${config.badge} group-hover:bg-[#0B5D3B] group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20`}>
                    Explore
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-[#0B5D3B] hover:shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95"
          >
            Browse All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { LayoutGrid, Package, ChevronRight } from 'lucide-react';
