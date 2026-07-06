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
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">
          Everything you need
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          Shop by Category
        </h1>
        <p className="text-gray-500 mt-2">
          Explore our wide range of authentic Kerala products
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No categories available at the moment.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category.slug] ?? DEFAULT_CONFIG;
            return (
              <Link
                key={category.id}
                href={`/products?filter=${category.slug}`}
                className={`
                  group relative flex flex-col items-center text-center
                  bg-gradient-to-br ${config.gradient}
                  border-2 ${config.border}
                  rounded-2xl p-4 pt-5
                  transition-all duration-200
                  hover:shadow-lg hover:-translate-y-0.5 hover:border-green-300
                  cursor-pointer
                `}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 text-3xl group-hover:scale-110 transition-transform duration-200">
                  {config.emoji}
                </div>
                <span className={`text-sm font-bold ${config.text} leading-snug mb-1`}>
                  {category.name}
                </span>
                <span className="text-[11px] text-gray-500 leading-tight mb-3">
                  {config.description}
                </span>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${config.badge} group-hover:bg-green-600 group-hover:text-white transition-colors duration-200`}>
                  Shop now
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
        >
          View all products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
