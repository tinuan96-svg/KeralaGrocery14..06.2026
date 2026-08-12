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
  description: 'The UK\'s #1 Kerala Grocery store for authentic South Indian products. Fast delivery of spices, Matta rice, snacks, and pickles nationwide.',
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
    answer: "We deliver authentic Kerala grocery products across the entire United Kingdom, including England, Scotland, Wales, and Northern Ireland. Next-day delivery is available for most postcodes."
  },
  {
    question: "Do you offer free delivery on Kerala grocery orders?",
    answer: "Yes, we offer free standard delivery on all Kerala grocery orders over £45. For orders below this amount, a small delivery fee applies which is calculated at checkout."
  },
  {
    question: "Is your Kerala grocery store authentically sourced?",
    answer: "Absolutely. We work directly with trusted suppliers in Kerala to ensure our Kerala grocery store stocks only 100% authentic spices, rice, snacks, and oils."
  },
  {
    question: "Can I buy Matta rice from your Kerala grocery online?",
    answer: "Yes, our Kerala grocery online store stocks a wide range of Matta rice (Palakkadan), Banana chips, and traditional Kerala sweets for fast UK delivery."
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

        {/* Existing homepage sections (deals, bestsellers, new arrivals, etc.) */}
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
          title="Frozen Foods"
          emoji="❄️"
          categorySlugs={['frozen-foods']}
          viewAllHref="/products?filter=frozen-foods"
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
