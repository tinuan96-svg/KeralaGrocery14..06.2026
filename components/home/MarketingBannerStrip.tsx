'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { fetchActiveBanners, type PromoBanner } from '@/lib/services/bannerService';

export default function MarketingBannerStrip({ offset = 0, limit = 1 }: { offset?: number, limit?: number }) {
  const [banners, setBanners] = useState<PromoBanner[]>([]);

  useEffect(() => {
    fetchActiveBanners().then(data => {
      const filtered = data.filter(b => b.banner_type === 'marketing_strip');
      setBanners(filtered.slice(offset, offset + limit));
    });
  }, [offset, limit]);

  if (banners.length === 0) return null;

  return (
    <div className="space-y-6 py-4">
      {banners.map((banner) => {
        const bg = banner.bg_gradient ?? banner.bg_color ?? '#0B5D3B';
        const isDark = banner.text_color === 'dark';

        return (
          <section key={banner.id} className="max-w-7xl mx-auto px-4">
            <Link
              href={banner.cta_link}
              className="block relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group"
            >
              <div
                className="relative flex flex-col md:flex-row items-center min-h-[220px] md:min-h-[160px] overflow-hidden"
                style={{ background: bg }}
              >
                {/* Decorative overlay */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="flex-1 p-6 md:p-8 relative z-10 text-center md:text-left">
                  <h2 className={`text-xl md:text-3xl font-black mb-2 leading-tight ${isDark ? 'text-gray-900' : 'text-white'}`}>
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className={`text-sm md:text-lg mb-5 opacity-90 font-medium ${isDark ? 'text-gray-700' : 'text-white/90'}`}>
                      {banner.subtitle}
                    </p>
                  )}
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all group-hover:gap-3 ${
                    isDark
                      ? 'bg-gray-900 text-white shadow-lg shadow-black/20'
                      : 'bg-white text-gray-900 shadow-lg shadow-white/10'
                  }`}>
                    {banner.cta_text}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                {/* Image */}
                {banner.image_url && (
                  <div className="relative w-full md:w-[320px] h-[200px] md:h-full flex-shrink-0">
                    <Image
                      src={banner.image_url}
                      alt={banner.image_alt || banner.title}
                      fill
                      className="object-contain p-4 md:p-6 drop-shadow-2xl transition-transform duration-700 group-hover:scale-110"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </Link>
          </section>
        );
      })}
    </div>
  );
}
