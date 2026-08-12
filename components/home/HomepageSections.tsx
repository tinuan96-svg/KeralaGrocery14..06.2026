'use client';

import dynamic from 'next/dynamic';
import { useHomepageData } from '@/hooks/useHomepageData';
import LoyaltyBanner from '@/components/home/LoyaltyBanner';
import MarketingBannerStrip from '@/components/home/MarketingBannerStrip';
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton';
import { PersonalisedGreeting } from '@/components/layout/CartEnhancements';
import type { Brand } from '@/lib/types/database';

const DealsSection = dynamic(() => import('@/components/home/DealsSection'), {
  loading: () => (
    <section className="py-3 px-4">
      <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px] h-48 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    </section>
  ),
  ssr: false,
});

const BestSellers = dynamic(() => import('@/components/home/BestSellers'), {
  loading: () => (
    <section className="py-3 px-4 max-w-7xl mx-auto">
      <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mb-3" />
      <ProductGridSkeleton count={6} />
    </section>
  ),
  ssr: false,
});

const NewArrivals = dynamic(() => import('@/components/home/NewArrivals'), {
  loading: () => (
    <section className="py-3 px-4 max-w-7xl mx-auto">
      <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mb-3" />
      <ProductGridSkeleton count={6} />
    </section>
  ),
  ssr: false,
});

const BrandShowcase = dynamic(() => import('@/components/home/BrandShowcase'), {
  loading: () => <div className="h-24 bg-gray-50 animate-pulse rounded-xl mx-4 my-4" />,
  ssr: false,
});

const DiscoverMoreFeed = dynamic(
  () => import('@/components/home/DiscoverMoreFeed'),
  { ssr: false }
);

function SkeletonSection() {
  return (
    <section className="py-3 px-4">
      <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mb-3" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-full aspect-[3/4] bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export default function HomepageSections() {
  const { trending, deals, bestsellers, newArrivals, allProducts, isLoading } =
    useHomepageData();

  const brands: Brand[] = isLoading
    ? []
    : Array.from(
        new Map(
          allProducts
            .filter((p) => p.brand && p.stock > 0)
            .map((p) => [p.brand!.name, p.brand!])
        ).values()
      )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8);

  if (isLoading) {
    return (
      <>
        <SkeletonSection />
        <SkeletonSection />
      </>
    );
  }

  return (
    <>
      {/* Personalised greeting for logged-in users */}
      <PersonalisedGreeting />

      {/* Flash Deals */}
      {deals.length > 0 && <DealsSection products={deals} />}

      {/* Best Sellers */}
      {bestsellers.length > 0 && <BestSellers products={bestsellers} />}

      {/* Popular Brands */}
      <BrandShowcase brands={brands} />

      {/* Loyalty / Wallet — kept but lower on page */}
      <LoyaltyBanner />

      {/* New Arrivals */}
      {newArrivals.length > 0 && <NewArrivals products={newArrivals} />}

      {/* Marketing banners */}
      <MarketingBannerStrip />

      {/* Discover More — infinite scroll feed */}
      <DiscoverMoreFeed />
    </>
  );
}
