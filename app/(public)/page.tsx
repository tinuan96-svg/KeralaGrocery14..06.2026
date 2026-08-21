import SEOContent from '@/components/home/SEOContent';
import { LocalBusinessSchema, MerchantReturnPolicySchema, ShippingPolicySchema, GroceryStoreSchema, FAQSchema } from '@/components/seo/StructuredData';
import PromoBannerCarousel from '@/components/home/PromoBannerCarousel';
import HomepageSections from '@/components/home/HomepageSections';
import AmazonStyleGrid from '@/components/home/AmazonStyleGrid';
import LocalCityBanner from '@/components/home/LocalCityBanner';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import PersonalizedRecommendations from '@/components/product/PersonalizedRecommendations';
import LocalSEOFooter from '@/components/layout/LocalSEOFooter';
import PullToRefresh from '@/components/home/PullToRefresh';
import DeliveryCountdown from '@/components/home/DeliveryCountdown';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { fetchSiteSettings } from '@/lib/services/siteSettingsService';

// Incremental Static Regeneration — Rebuild page every hour in background
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Kerala Grocery UK | Buy Authentic Kerala Groceries Online',
  description: 'The UK\'s #1 Kerala Grocery store for authentic South Indian products. Fast delivery of spices, Matta rice, snacks, and pickles nationwide.',
  alternates: {
    canonical: 'https://keralagrocery.com',
  },
};

const StickySearchBar = dynamic(
  () => import('@/components/home/StickySearchBar'),
  { ssr: false }
);

export default async function HomePage() {
  const settings = await fetchSiteSettings();

  return (
    <PullToRefresh>
      <div className="min-h-screen pb-20 md:pb-0 bg-[#f1f3f4]">
        <LocalBusinessSchema />
        <MerchantReturnPolicySchema />
        <ShippingPolicySchema />
        <GroceryStoreSchema />
        <FAQSchema items={settings.homepage_faqs} />

        {/* Sales Multiplier: Delivery Timer */}
        <DeliveryCountdown />

        {/* Sticky search appears below header once hero scrolls away */}
        <StickySearchBar sentinelId="hero-end" />

        <PromoBannerCarousel />

        {/* Sentinel — StickySearchBar watches this element */}
        <div id="hero-end" />

        {/* Amazon-style content grid */}
        <AmazonStyleGrid />

        <PersonalizedRecommendations />

        {/* Dynamic Local City Marketing Banner */}
        <LocalCityBanner />

        {/* All product sections in feed order */}
        <HomepageSections />

        <WhyChooseUs />

        <SEOContent />
        <LocalSEOFooter />
      </div>
    </PullToRefresh>
  );
}
