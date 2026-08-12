'use client';

import { ShieldCheck, Truck, Leaf, Package } from 'lucide-react';

const REASONS = [
  { icon: Leaf, title: 'Authentic Products', desc: 'Genuine Kerala & Indian brands' },
  { icon: Truck, title: 'UK Delivery', desc: 'Reliable delivery across the UK' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Safe and trusted payment methods' },
  { icon: Package, title: 'Fresh Stock', desc: 'Regularly updated product selection' },
];

export default function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8" aria-label="Why Shop With KeralaGrocery">
      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 text-center mb-5">
        Why Shop With KeralaGrocery?
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REASONS.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center bg-white border border-[#d1ead9] rounded-2xl p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f4faf6] border border-[#d1ead9] flex items-center justify-center mb-2.5">
              <Icon className="h-5 w-5 text-[#0B5D3B]" />
            </div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
