import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { Brand } from '@/lib/types/database';
import { blurDataURL } from '@/lib/utils/image';

interface BrandShowcaseProps {
  brands: Brand[];
}

const FEATURED_BRANDS = [
  { name: 'Double Horse', color: 'from-red-500 to-red-700',    initials: 'DH' },
  { name: 'Eastern',      color: 'from-orange-500 to-amber-600', initials: 'EA' },
  { name: 'Ajmi',         color: 'from-green-600 to-emerald-700', initials: 'AJ' },
  { name: 'Nirapara',     color: 'from-blue-600 to-cyan-700',   initials: 'NP' },
  { name: 'Tasty Nibbles',color: 'from-pink-500 to-rose-600',   initials: 'TN' },
];

export default function BrandShowcase({ brands }: BrandShowcaseProps) {
  // Build display list: featured brands first, then supplement with DB brands
  const dbBrandMap = new Map(brands.map(b => [b.name.toLowerCase(), b]));

  const displayBrands = FEATURED_BRANDS.map((fb) => {
    const dbBrand = dbBrandMap.get(fb.name.toLowerCase());
    return {
      id: fb.name,
      name: fb.name,
      slug: fb.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      logo_url: dbBrand?.logo_url ?? null,
      color: fb.color,
      initials: fb.initials,
    };
  });

  return (
    <section className="py-8 bg-[#f8faf7] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
              <Tag className="h-5 w-5 text-[#0B5D3B]" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-gray-900 leading-none tracking-tight">Trusted Brands</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Kerala Grocery partners</p>
            </div>
          </div>
          <Link
            href="/brands"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
          >
            All Brands <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
          {displayBrands.slice(0, 5).map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${encodeURIComponent(brand.name)}`}
              className="group relative flex flex-col items-center gap-3 p-4 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 transition-all duration-300"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] overflow-hidden flex-shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                {brand.logo_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={brand.logo_url}
                      alt={brand.name}
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className={`w-full h-full rounded-[24px] bg-gradient-to-br ${brand.color} flex items-center justify-center border-2 border-white/20 shadow-inner`}>
                    <span className="text-white font-black text-lg sm:text-xl tracking-tighter">{brand.initials}</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-[12px] sm:text-[13px] font-black text-gray-900 leading-tight group-hover:text-[#0B5D3B] transition-colors line-clamp-1">
                  {brand.name}
                </p>
                <div className="mt-1.5 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-1 w-6 rounded-full bg-[#0B5D3B]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Tag } from 'lucide-react';
