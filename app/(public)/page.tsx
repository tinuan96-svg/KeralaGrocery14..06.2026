import SEOContent from '@/components/home/SEOContent';
import { LocalBusinessSchema, MerchantReturnPolicySchema, ShippingPolicySchema, GroceryStoreSchema, FAQSchema } from '@/components/seo/StructuredData';
import PromoBannerCarousel from '@/components/home/PromoBannerCarousel';
import HomepageSections from '@/components/home/HomepageSections';
import AmazonStyleGrid from '@/components/home/AmazonStyleGrid';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import { EmailCapture } from '@/components/home/EmailCapture';
import LocalSEOFooter from '@/components/layout/LocalSEOFooter';
import dynamic from 'next/dynamic';

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
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: '#f4faf6' }}>
      <LocalBusinessSchema />
      <MerchantReturnPolicySchema />
      <ShippingPolicySchema />
      <GroceryStoreSchema />
      <FAQSchema items={homepageFAQs} />

      {/* Sticky search appears below header once hero scrolls away */}
      <StickySearchBar sentinelId="hero-end" />

      <PromoBannerCarousel />

      {/* Sentinel — StickySearchBar watches this element */}
      <div id="hero-end" />

      {/* Amazon-style content grid */}
      <AmazonStyleGrid />

      {/* All product sections in feed order */}
      <HomepageSections />

      <WhyChooseUs />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <EmailCapture />
      </div>

      <SEOContent />
      <LocalSEOFooter />
    </div>
  );
}
