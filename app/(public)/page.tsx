import SEOContent from '@/components/home/SEOContent';
import { LocalBusinessSchema, MerchantReturnPolicySchema, ShippingPolicySchema } from '@/components/seo/StructuredData';
import PromoBannerCarousel from '@/components/home/PromoBannerCarousel';
import HomepageSections from '@/components/home/HomepageSections';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import { EmailCapture } from '@/components/home/EmailCapture';
import dynamic from 'next/dynamic';

const StickySearchBar = dynamic(
  () => import('@/components/home/StickySearchBar'),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: '#f4faf6' }}>
      <LocalBusinessSchema />
      <MerchantReturnPolicySchema />
      <ShippingPolicySchema />

      {/* Sticky search appears below header once hero scrolls away */}
      <StickySearchBar sentinelId="hero-end" />

      <PromoBannerCarousel />

      {/* Sentinel — StickySearchBar watches this element */}
      <div id="hero-end" />

      {/* All product sections in feed order */}
      <HomepageSections />

      <WhyChooseUs />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <EmailCapture />
      </div>

      <SEOContent />
    </div>
  );
}
