'use client';

import Link from 'next/link';

const CITIES = [
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Liverpool', 'Newcastle',
  'Sheffield', 'Bristol', 'Leicester', 'Edinburgh', 'Cardiff', 'Coventry', 'Nottingham', 'Belfast'
];

export default function LocalSEOFooter() {
  return (
    <section className="bg-white border-t border-gray-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">
          Your Local Kerala Grocery Delivery Across the UK
        </h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Kerala Grocery UK is your trusted partner for premium, authentic South Indian products.
          We provide the fastest <strong>Kerala grocery</strong> delivery service to all major UK cities including:
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CITIES.map(city => (
            <Link
              key={city}
              href={`/products?search=${city}`}
              className="text-[11px] font-bold text-gray-400 hover:text-[#0B5D3B] transition-colors"
            >
              Kerala Grocery {city}
            </Link>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t border-gray-50 text-[10px] text-gray-400 leading-relaxed">
          <p>
            Operating from our UK hub, we ensure every order of Matta rice, coconut oil, and traditional snacks reaches your doorstep
            in perfect condition. 100% Sourced from Kerala. Next Day Delivery available.
          </p>
        </div>
      </div>
    </section>
  );
}
