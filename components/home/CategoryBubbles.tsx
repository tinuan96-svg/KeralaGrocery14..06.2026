'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

export default function CategoryBubbles() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCats() {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('categories')
          .select('id, name, slug, image_url')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(10);

        if (data) setCategories(data);
      } catch (err) {
        console.error('Failed to fetch bubble categories:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCats();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-6 px-4 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm animate-pulse" />
            <div className="w-12 h-3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white/30 backdrop-blur-sm py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Quick Shop</h3>
          <Link href="/categories" className="text-[11px] font-bold text-[#0B5D3B] flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 group snap-start"
            >
              <div className="w-20 h-20 rounded-[1.75rem] bg-white shadow-[0_10px_25px_rgba(0,0,0,0.05)] border border-white flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_15px_35px_rgba(11,93,59,0.15)] group-hover:-translate-y-1 group-active:scale-90">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover p-2"
                  />
                ) : (
                  <span className="text-[10px] font-black text-emerald-800 text-center px-1 uppercase tracking-tighter leading-tight">
                    {cat.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-black text-gray-700 group-hover:text-[#0B5D3B] transition-colors uppercase tracking-tight">
                {cat.name.split(' ')[0]}
              </span>
            </Link>
          ))}

          {/* "See More" Bubble */}
          <Link
            href="/categories"
            className="flex-shrink-0 flex flex-col items-center gap-2 group snap-start"
          >
            <div className="w-20 h-20 rounded-[1.75rem] bg-emerald-50 shadow-[0_10px_25px_rgba(0,0,0,0.02)] border border-emerald-100/50 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:bg-[#0B5D3B] group-hover:text-white group-active:scale-90">
              <ChevronRight className="w-8 h-8 text-[#0B5D3B] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[11px] font-black text-gray-400 group-hover:text-[#0B5D3B] transition-colors uppercase tracking-tight">
              All
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
