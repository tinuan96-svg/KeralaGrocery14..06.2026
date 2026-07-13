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
    <section className="py-4 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gray-400" />
            <h2 className="text-[14px] font-extrabold text-gray-900">Trusted Kerala Brands</h2>
          </div>
          <Link
            href="/brands"
            className="inline-flex items-center gap-0.5 text-xs text-gray-600 font-bold border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
          >
            All Brands <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {displayBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${encodeURIComponent(brand.name)}`}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {brand.logo_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={brand.logo_url}
                      alt={brand.name}
                      fill
                      sizes="48px"
                      className="object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                    />
                  </div>
                ) : (
                  <div className={`w-full h-full rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center`}>
                    <span className="text-white font-extrabold text-sm">{brand.initials}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] font-bold text-gray-700 text-center leading-tight group-hover:text-[#0F6A38] transition-colors line-clamp-2">
                {brand.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
