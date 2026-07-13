'use client';

import { Truck, ShieldCheck, Award } from 'lucide-react';

const BENEFITS = [
  { icon: Truck, text: 'Next Day Delivery', sub: 'Across UK', color: 'text-blue-600' },
  { icon: Award, text: '100% Authentic', sub: 'Kerala Sourced', color: 'text-[#0B5D3B]' },
  { icon: ShieldCheck, text: 'Secure Payments', sub: 'SSL Encrypted', color: 'text-amber-600' },
];

export default function TrustStrip() {
  return (
    <section className="bg-white py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide">
      <div className="flex items-center justify-between min-w-max md:min-w-0 md:justify-center md:gap-12 px-4">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5 pr-6 last:pr-0 md:pr-0">
            <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center`}>
              <b.icon className={`w-4 h-4 ${b.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-900 leading-tight uppercase tracking-tight">{b.text}</p>
              <p className="text-[9px] font-bold text-gray-400 leading-tight uppercase tracking-widest mt-0.5">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
