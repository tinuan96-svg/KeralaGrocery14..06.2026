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
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { fetchActiveBanners } from '@/lib/services/bannerService';
import { fetchStoreProducts, fetchHomepageCategories } from '@/lib/services/storeProductsService';
import { fetchActiveGridCards } from '@/lib/services/homepageGridService';

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

export default async function HomePage() {
  // Fetch all critical storefront data on server to minimize waterfalls and LCP
  const [banners, categories, trendingRes, dealsRes, bestsellersRes, newArrivalsRes, gridCards] = await Promise.all([
    fetchActiveBanners(),
    fetchHomepageCategories(),
    fetchStoreProducts({ is_featured: true, limit: 12 }),
    fetchStoreProducts({ is_deal: true, limit: 12 }),
    fetchStoreProducts({ is_bestseller: true, limit: 12 }),
    fetchStoreProducts({ is_new_arrival: true, limit: 12 }),
    fetchActiveGridCards(),
  ]);

  return (
    <PullToRefresh>
      <div className="min-h-screen pb-20 md:pb-0 bg-[#f1f3f4]">
        <LocalBusinessSchema />
        <MerchantReturnPolicySchema />
        <ShippingPolicySchema />
        <GroceryStoreSchema />
        <FAQSchema items={homepageFAQs} />

        {/* Sticky search appears below header once hero scrolls away */}
        <StickySearchBar sentinelId="hero-end" />

        {/* Pass initial banners to avoid LCP delay */}
        <PromoBannerCarousel initialBanners={banners} />

        {/* Sentinel — StickySearchBar watches this element */}
        <div id="hero-end" />

        {/* Amazon-style content grid */}
        <AmazonStyleGrid initialCards={gridCards} />

        <PersonalizedRecommendations />

        {/* Dynamic Local City Marketing Banner */}
        <LocalCityBanner />

        {/* All product sections in feed order */}
        <HomepageSections
          initialCategories={categories}
          initialTrending={trendingRes.products}
          initialDeals={dealsRes.products}
          initialBestsellers={bestsellersRes.products}
          initialNewArrivals={newArrivalsRes.products}
        />

        <WhyChooseUs />

        <SEOContent />
        <LocalSEOFooter />
      </div>
    </PullToRefresh>
  );
}
