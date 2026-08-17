'use client';

import dynamic from 'next/dynamic';
import { useProductBanners, BANNER_CONFIGS, type BannerKey } from '@/hooks/useProductBanners';

const ProductBannerSection = dynamic(() => import('./ProductBannerSection'), { ssr: false });

function BannerSkeleton() {
  return (
    <section className="py-4 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-14 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-[200px] h-[280px] bg-gray-100 rounded-2xl animate-pulse" />
          <div className="flex gap-3 overflow-hidden flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[148px] h-[230px] bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DynamicProductBanners() {
  const { banners, isLoading } = useProductBanners();

  if (isLoading) {
    return (
      <>
        <BannerSkeleton />
        <BannerSkeleton />
        <BannerSkeleton />
      </>
    );
  }

  // Only render banners that have products
  const activeBanners = BANNER_CONFIGS.filter(
    (config) => banners[config.key as BannerKey]?.length > 0
  );

  if (activeBanners.length === 0) return null;

  return (
    <>
      {activeBanners.map((config) => (
        <ProductBannerSection
          key={config.key}
          config={config}
          products={banners[config.key as BannerKey]}
        />
      ))}
    </>
  );
}
