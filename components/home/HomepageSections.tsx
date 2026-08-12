'use client';

import dynamic from 'next/dynamic';
import { useHomepageData } from '@/hooks/useHomepageData';
import { ProductGridSkeleton } from '@/components/product/ProductCardSkeleton';
import { PersonalisedGreeting } from '@/components/layout/CartEnhancements';
import type { Brand } from '@/lib/types/database';

const BestSellers = dynamic(() => import('@/components/home/BestSellers'), { ssr: false });
const DealsSection = dynamic(() => import('@/components/home/DealsSection'), { ssr: false });
const NewArrivals = dynamic(() => import('@/components/home/NewArrivals'), { ssr: false });
const LoyaltyBanner = dynamic(() => import('@/components/home/LoyaltyBanner'), { ssr: false });
const BrandShowcase = dynamic(() => import('@/components/home/BrandShowcase'), { ssr: false });
const DiscoverMoreFeed = dynamic(() => import('@/components/home/DiscoverMoreFeed'), { ssr: false });

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
        <ProductGridSkeleton count={8} />
        <ProductGridSkeleton count={8} />
      </>
    );
  }

  return (
    <>
      <PersonalisedGreeting />

      {/* Best Sellers */}
      {bestsellers.length > 0 && <BestSellers products={bestsellers} />}
      {bestsellers.length === 0 && allProducts.length > 0 && (
        <BestSellers products={allProducts.slice(0, 8)} />
      )}

      {/* Deals & Offers */}
      {deals.length > 0 && <DealsSection products={deals} />}
      {deals.length === 0 && allProducts.length > 8 && (
        <DealsSection products={allProducts.slice(8, 16)} />
      )}

      {/* Popular Brands */}
      <BrandShowcase brands={brands} />

      {/* New Arrivals */}
      {newArrivals.length > 0 && <NewArrivals products={newArrivals} />}
      {newArrivals.length === 0 && allProducts.length > 0 && (
        <NewArrivals products={allProducts.slice(0, 8)} />
      )}

      {/* Loyalty / Wallet — kept lower on page */}
      <LoyaltyBanner />

      {/* Discover More — infinite scroll feed */}
      <DiscoverMoreFeed />
    </>
  );
}
