import HomeHero from '@/components/home/HomeHero';
import CategoryGrid from '@/components/home/CategoryGrid';
import ShopByNeed from '@/components/home/ShopByNeed';
import TrustSection from '@/components/home/TrustSection';
import HomepageSections from '@/components/home/HomepageSections';
import SEOContent from '@/components/home/SEOContent';
import LocalSEOFooter from '@/components/layout/LocalSEOFooter';
import CategoryProductSection from '@/components/home/CategoryProductSection';
import PullToRefresh from '@/components/home/PullToRefresh';
import { LocalBusinessSchema, MerchantReturnPolicySchema, ShippingPolicySchema, GroceryStoreSchema, FAQSchema } from '@/components/seo/StructuredData';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kerala Grocery UK | Buy Authentic Kerala Groceries Online',
  description: 'Shop authentic Kerala and South Indian groceries online. Rice, spices, snacks, frozen foods, pickles and more with UK-wide delivery.',
  alternates: {
    canonical: 'https://keralagrocery.com',
  },
};

const StickySearchBar = dynamic(
  () => import('@/components/home/StickySearchBar'),
  { ssr: false }
);

const homepageFAQs = [
  {
    question: "Where do you deliver Kerala grocery in the UK?",
    answer: "We deliver authentic Kerala grocery products across the United Kingdom. Delivery is available for most postcodes."
  },
  {
    question: "Do you offer free delivery on Kerala grocery orders?",
    answer: "We offer free standard delivery on qualifying orders. Delivery fees are calculated at checkout based on your location and order size."
  },
  {
    question: "Can I buy Matta rice from your Kerala grocery online?",
    answer: "Yes, our store stocks a range of Matta rice (Palakkadan), banana chips, and traditional Kerala products for UK delivery."
  }
];

export default function HomePage() {
  return (
    <PullToRefresh>
      <div className="min-h-screen pb-20 md:pb-0 bg-[#f1f3f4]">
        <LocalBusinessSchema />
        <MerchantReturnPolicySchema />
        <ShippingPolicySchema />
        <GroceryStoreSchema />
        <FAQSchema items={homepageFAQs} />

        <StickySearchBar sentinelId="hero-end" />

        {/* Hero */}
        <HomeHero />

        {/* Sentinel for sticky search */}
        <div id="hero-end" />

        {/* Shop by Category */}
        <CategoryGrid />

        {/* Shop by Need */}
        <ShopByNeed />

        {/* Best Sellers, Deals, Brands, New Arrivals, Wallet, Discover More */}
        <HomepageSections />

        {/* Category product sections — lazy loaded */}
        <CategoryProductSection
          title="Kerala Snacks"
          emoji="🍌"
          categorySlugs={['snacks-namkeens']}
          viewAllHref="/products?filter=snacks-namkeens"
        />
        <CategoryProductSection
          title="Rice & Daily Essentials"
          emoji="🍚"
          categorySlugs={['rice-grains', 'rice-powders-flour']}
          viewAllHref="/products?filter=rice-grains"
        />
        <CategoryProductSection
          title="Spices & Masalas"
          emoji="🌶️"
          categorySlugs={['spices']}
          viewAllHref="/products?filter=spices"
        />
        <CategoryProductSection
          title="Pickles & Chutneys"
          emoji="🥭"
          categorySlugs={['pickles-chutneys', 'condiments']}
          viewAllHref="/products?filter=pickles-chutneys"
        />

        {/* Trust */}
        <TrustSection />

        {/* SEO content near bottom */}
        <SEOContent />
        <LocalSEOFooter />
      </div>
    </PullToRefresh>
  );
}
