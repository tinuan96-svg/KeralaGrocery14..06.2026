'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEPARTMENTS } from '@/lib/config/departments';
import { getSupabase } from '@/lib/supabase/client';

interface CategoryImage {
  [slug: string]: string;
}

export default function CategoryGrid() {
  const [categoryImages, setCategoryImages] = useState<CategoryImage>({});

  useEffect(() => {
    async function loadImages() {
      const supabase = getSupabase();
      const images: CategoryImage = {};

      for (const dept of DEPARTMENTS) {
        if (dept.categorySlugs.length === 0) continue;
        const { data } = await supabase
          .from('products')
          .select('image_main, image_url')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .eq('approval_status', 'approved')
          .in(
            'category_id',
            (await supabase
              .from('categories')
              .select('id')
              .in('slug', dept.categorySlugs)
            ).data?.map((c: any) => c.id) || []
          )
          .not('image_main', 'is', null)
          .limit(1);

        if (data && data.length > 0) {
          images[dept.slug] = data[0].image_main || data[0].image_url || '';
        }
      }
      setCategoryImages(images);
    }
    loadImages();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8" aria-label="Shop by Category">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Shop by Category</h2>
        <Link
          href="/categories"
          className="text-xs font-bold text-[#0B5D3B] hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {DEPARTMENTS.map((dept) => {
          const img = categoryImages[dept.slug];
          return (
            <Link
              key={dept.slug}
              href={`/products?filter=${dept.categorySlugs[0] || dept.slug}`}
              className="group flex flex-col items-center bg-white border border-[#d1ead9] rounded-2xl p-3 hover:shadow-lg hover:border-[#0B5D3B]/30 transition-all duration-200 active:scale-95"
            >
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#f4faf6] mb-2 relative">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={dept.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {dept.emoji}
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-[13px] font-bold text-gray-900 text-center leading-tight group-hover:text-[#0B5D3B] transition-colors">
                {dept.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
