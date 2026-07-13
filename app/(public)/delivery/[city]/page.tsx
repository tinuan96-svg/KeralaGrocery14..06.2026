import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Truck, MapPin, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomepageSections from '@/components/home/HomepageSections';
import TrustStrip from '@/components/home/TrustStrip';

interface Props {
  params: { city: string };
}

const VALID_CITIES = [
  'london', 'birmingham', 'manchester', 'glasgow', 'leeds', 'liverpool',
  'newcastle', 'sheffield', 'bristol', 'belfast', 'leicester', 'nottingham',
  'reading', 'cambridge', 'oxford', 'cardiff', 'coventry', 'croydon'
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = params.city.charAt(0).toUpperCase() + params.city.slice(1);

  return {
    title: `Authentic Kerala Grocery Delivery in ${city} | KeralaGrocery.com`,
    description: `Get fresh Kerala groceries, spices, Matta rice, and snacks delivered to your door in ${city}. Fast UK-wide delivery. Shop authentic South Indian brands today.`,
    alternates: {
      canonical: `https://keralagrocery.com/delivery/${params.city}`,
    },
  };
}

export default function CityDeliveryPage({ params }: Props) {
  if (!VALID_CITIES.includes(params.city.toLowerCase())) {
    // Optionally return 404 if city not in our SEO list,
    // or just render a generic version.
  }

  const city = params.city.charAt(0).toUpperCase() + params.city.slice(1);

  return (
    <div className="min-h-screen bg-[#f4faf6]">
      {/* Hero Section */}
      <div className="bg-[#0B5D3B] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm font-semibold">
                <MapPin className="w-4 h-4 text-yellow-400" />
                Serving all postcodes in {city}
              </div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight">
                Authentic Kerala Groceries <br />
                <span className="text-yellow-400">Delivered to {city}</span>
              </h1>
              <p className="text-lg text-green-50/80 max-w-xl">
                Missing the taste of home? We deliver 100% authentic spices, snacks, and fresh
                produce from Kerala directly to your doorstep in {city}.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/products">
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold px-8 h-12 text-lg">
                    Shop Now
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="w-5 h-5 text-yellow-400" />
                  Free delivery on orders over £45
                </div>
              </div>
            </div>
            <div className="flex-1 relative hidden md:block">
              <div className="bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                <h3 className="text-xl font-bold mb-4">Why {city} chooses us:</h3>
                <ul className="space-y-4">
                  {[
                    'Direct from Kerala Suppliers',
                    'Next-day delivery available',
                    'Safe & Secure Packaging',
                    'UK-based Customer Support'
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TrustStrip />

      {/* City Specific Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-green-100 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Looking for Kerala stores in {city}?
          </h2>
          <div className="prose prose-green max-w-none text-gray-600 space-y-4">
            <p>
              Finding authentic Kerala groceries in <strong>{city}</strong> can be a challenge.
              While there might be local Indian shops, they often lack the specific regional
              brands and fresh quality you find in Kerala.
            </p>
            <p>
              <strong>KeralaGrocery.com</strong> bridges that gap by offering a massive catalog of over
              500+ authentic products, including Palakkadan Matta Rice, Ajmi Puttu Podi,
              Banana Chips, and traditional spices, all available for fast delivery to
              any address in {city}.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            <div className="bg-[#f4faf6] p-5 rounded-2xl">
              <h4 className="font-bold text-green-900 mb-2">London Postcodes</h4>
              <p className="text-sm text-gray-600">Full coverage across all {city} areas including suburbs.</p>
            </div>
            <div className="bg-[#f4faf6] p-5 rounded-2xl">
              <h4 className="font-bold text-green-900 mb-2">Delivery Time</h4>
              <p className="text-sm text-gray-600">Usually 24-48 hours from order placement.</p>
            </div>
            <div className="bg-[#f4faf6] p-5 rounded-2xl">
              <h4 className="font-bold text-green-900 mb-2">Bulk Orders</h4>
              <p className="text-sm text-gray-600">Special rates for religious festivals and community events.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products for the city */}
      <div className="pb-16">
        <div className="max-w-6xl mx-auto px-4 mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Popular in {city}</h2>
          <Link href="/products" className="text-green-700 font-bold text-sm flex items-center hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <HomepageSections />
      </div>
    </div>
  );
}
