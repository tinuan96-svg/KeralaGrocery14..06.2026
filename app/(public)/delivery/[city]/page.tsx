import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Truck, MapPin, Star, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomepageSections from '@/components/home/HomepageSections';
import { FAQSchema, LocalBusinessSchema } from '@/components/seo/StructuredData';

// This would ideally come from your Supabase database in the future
const UK_CITIES: Record<string, any> = {
  'london': { name: 'London', area: 'Greater London', pop: '9M+' },
  'birmingham': { name: 'Birmingham', area: 'West Midlands', pop: '1.1M+' },
  'manchester': { name: 'Manchester', area: 'Greater Manchester', pop: '550k+' },
  'glasgow': { name: 'Glasgow', area: 'Scotland', pop: '600k+' },
  'leicester': { name: 'Leicester', area: 'East Midlands', pop: '350k+' },
  'croydon': { name: 'Croydon', area: 'South London', pop: '380k+' },
};

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = UK_CITIES[params.city.toLowerCase()];
  if (!city) return { title: 'Delivery Area Not Found' };

  return {
    title: `Kerala Grocery Delivery in ${city.name} | Next Day UK Delivery`,
    description: `Shop authentic Kerala groceries online for fast delivery in ${city.name}. We deliver Matta rice, fresh spices, banana chips, and pickles across ${city.area}. Order today!`,
    alternates: {
      canonical: `https://keralagrocery.com/delivery/${params.city.toLowerCase()}`,
    },
  };
}

export default function CityDeliveryPage({ params }: { params: { city: string } }) {
  const cityData = UK_CITIES[params.city.toLowerCase()];

  if (!cityData) {
    notFound();
  }

  const cityFAQs = [
    {
      question: `Do you deliver Kerala groceries to all parts of ${cityData.name}?`,
      answer: `Yes, we offer comprehensive Kerala grocery delivery across all postcodes in ${cityData.name} and surrounding areas in ${cityData.area}.`
    },
    {
      question: `How long does delivery take to ${cityData.name}?`,
      answer: `We offer standard next-day delivery to ${cityData.name} for orders placed before 12 PM. Standard shipping usually arrives within 1-2 working days.`
    }
  ];

  return (
    <div className="min-h-screen bg-white pb-20">
      <LocalBusinessSchema />
      <FAQSchema items={cityFAQs} />

      {/* Hero Section */}
      <section className="relative bg-[#0B5D3B] text-white py-16 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <MapPin className="w-3 h-3" /> {cityData.name} Delivery Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            Authentic Kerala Groceries <br /> Delivered to <span className="text-yellow-400">{cityData.name}</span>
          </h1>
          <p className="text-lg text-green-50/90 mb-8 max-w-2xl mx-auto">
            Bringing the taste of home to {cityData.area}. Shop 1000+ authentic Malayali essentials with reliable next-day delivery service.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/products">
              <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-[#0B5D3B] font-black h-14 px-8 rounded-2xl shadow-xl">
                Shop Groceries Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Row */}
      <section className="py-12 border-b border-gray-100 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Clock, label: 'Fast Delivery', sub: 'Next-day available' },
            { icon: ShieldCheck, label: 'Quality Guarantee', sub: '100% Authentic' },
            { icon: Truck, label: 'Free Shipping', sub: 'On orders over £45' },
            { icon: Star, label: 'Top Rated', sub: '5-star UK service' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#0B5D3B]">
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Localized Content */}
      <section className="py-16 px-4 bg-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-gray-600 leading-relaxed text-sm">
              <h2 className="text-2xl font-bold text-gray-900">Why choose us for your {cityData.name} grocery needs?</h2>
              <p>
                Finding authentic Kerala products in {cityData.name} can be challenging. Whether you're looking for <strong>Palakkadan Matta Rice</strong>,
                <strong>Eastern Sambar Powder</strong>, or fresh <strong>Banana Chips</strong>, we've got you covered.
              </p>
              <ul className="space-y-3">
                {[
                  'Daily delivery slots across all local postcodes',
                  'Carefully packed to ensure zero leakage',
                  'Competitive pricing vs local high-street stores',
                  'Dedicated customer support for the Malayali community'
                ].map((txt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
               <img src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800" alt="Authentic Kerala Spices" className="object-cover w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Reusing existing sections for the shop feed */}
      <div className="max-w-7xl mx-auto mt-8">
        <h2 className="px-4 text-xl font-bold text-gray-900 mb-4 uppercase tracking-tighter">Bestsellers in {cityData.name} Area</h2>
        <HomepageSections />
      </div>
    </div>
  );
}
