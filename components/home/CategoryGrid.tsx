'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEPARTMENTS } from '@/lib/config/departments';
import { getSupabase } from '@/lib/supabase/client';

interface DeptData {
  image: string | null;
  count: number;
}

export default function CategoryGrid() {
  const [deptData, setDeptData] = useState<Record<string, DeptData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();

      // Single query: get all categories
      const { data: allCats } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('is_active', true);
      if (!allCats) { setLoading(false); return; }

      const slugToId = new Map(allCats.map((c: any) => [c.slug, c.id]));

      // Single query: get product counts + first image per category
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, category_id, image_main, image_url')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('approval_status', 'approved')
        .eq('visibility_status', 'visible')
        .not('centralhub_product_id', 'is', null)
        .gt('price', 0)
        .order('sold_count', { ascending: false, nullsFirst: false })
        .limit(300);

      if (!allProducts) { setLoading(false); return; }

      // Group by category_id
      const byCat = new Map<string, { count: number; image: string | null }>();
      for (const p of allProducts as any[]) {
        const cid = p.category_id;
        if (!cid) continue;
        const existing = byCat.get(cid);
        if (existing) {
          existing.count++;
          if (!existing.image && p.image_main) {
            existing.image = p.image_main;
          }
        } else {
          byCat.set(cid, { count: 1, image: p.image_main || p.image_url || null });
        }
      }

      // Aggregate per department
      const result: Record<string, DeptData> = {};
      for (const dept of DEPARTMENTS) {
        let totalCount = 0;
        let deptImage: string | null = null;
        for (const slug of dept.categorySlugs) {
          const cid = slugToId.get(slug);
          if (!cid) continue;
          const catData = byCat.get(cid);
          if (catData) {
            totalCount += catData.count;
            if (!deptImage && catData.image) {
              deptImage = catData.image;
            }
          }
        }
        result[dept.slug] = { image: deptImage, count: totalCount };
      }

      setDeptData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  // Only show departments with products
  const visibleDepts = DEPARTMENTS.filter((d) => {
    const data = deptData[d.slug];
    return data && data.count > 0;
  });

  if (!loading && visibleDepts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8" aria-label="Shop by Category">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Shop by Category</h2>
        <Link href="/categories" className="text-xs font-bold text-[#0B5D3B] hover:underline">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-2xl" />
            ))
          : visibleDepts.map((dept) => {
              const data = deptData[dept.slug];
              return (
                <Link
                  key={dept.slug}
                  href={`/products?filter=${dept.categorySlugs[0] || dept.slug}`}
                  className="group bg-white border border-[#d1ead9] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#0B5D3B]/30 transition-all duration-200 active:scale-95"
                >
                  <div className="w-full aspect-square bg-[#f4faf6] relative overflow-hidden">
                    {data?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.image}
                        alt={dept.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {dept.emoji}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight group-hover:text-[#0B5D3B] transition-colors">
                      {dept.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-1">
                      {dept.description}
                    </p>
                    {data && (
                      <p className="text-[10px] font-semibold text-[#0B5D3B] mt-1">
                        {data.count} {data.count === 1 ? 'product' : 'products'}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}


export default CategoryGrid