'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Truck, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Leicester', 'Croydon',
  'Newcastle', 'Bristol', 'Reading', 'Oxford', 'Cambridge'
];

export default function LocalCityBanner() {
  const { profile } = useAuth();
  const [displayCity, setDisplayCity] = useState('the UK');
  const [cityIndex, setCityIndex] = useState(0);

  useEffect(() => {
    // If user has a city in their profile, use it
    if (profile?.city) {
      setDisplayCity(profile.city);
      return;
    }

    // Otherwise, rotate through major cities for dynamic marketing feel
    const interval = setInterval(() => {
      setCityIndex((prev) => (prev + 1) % UK_CITIES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [profile]);

  // Use the rotating city only if not logged in/no city profile
  const cityToShow = profile?.city || UK_CITIES[cityIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 mb-8 hidden md:block">
      <div className="bg-white rounded-[2rem] border border-green-100 overflow-hidden shadow-sm flex flex-col md:flex-row items-center">
        <div className="bg-[#0B5D3B] p-6 md:p-10 text-white flex-1 w-full">
          <div className="flex items-center gap-2 mb-4 bg-white/10 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
            Live UK Coverage
          </div>

          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
            Fresh Kerala Groceries <br />
            <span className="text-yellow-400 flex items-center gap-2">
              Delivered to
              <AnimatePresence mode="wait">
                <motion.span
                  key={cityToShow}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {cityToShow}
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>

          <p className="text-green-50/70 text-sm md:text-base mb-8 max-w-md">
            Order your favorite Matta rice, authentic spices, and Malabar snacks today.
            Next-day delivery available for all {cityToShow} postcodes.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link href={`/delivery/${cityToShow.toLowerCase().replace(/\s+/g, '-')}`}>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-green-950 font-bold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2">
                Check {cityToShow} Delivery <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold text-green-200">
              <Truck className="w-4 h-4" /> Free over £45
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 md:p-10 grid grid-cols-2 gap-4 w-full">
          <div className="bg-[#f4faf6] p-5 rounded-3xl border border-green-50">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm mb-1">Authentic Brands</h4>
            <p className="text-xs text-gray-500">Nirapara, Ajmi, Brahmins & more.</p>
          </div>
          <div className="bg-[#f4faf6] p-5 rounded-3xl border border-green-50">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm mb-1">Fast Delivery</h4>
            <p className="text-xs text-gray-500">24-48h turnaround time.</p>
          </div>
          <div className="col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-3xl border border-green-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-green-900">New in {cityToShow}?</h4>
              <p className="text-xs text-green-700/70">Get your first order delivered free.</p>
            </div>
            <Link href="/products" className="text-green-700 font-bold text-xs hover:underline flex items-center gap-1">
              Shop Now <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
