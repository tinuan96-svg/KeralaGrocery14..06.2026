'use client';

import { Truck, Leaf, Lock, Package, Clock, ThumbsUp } from 'lucide-react';

const FEATURES = [
  { icon: Truck,    title: 'Fast UK Delivery',   desc: 'Dispatched in 24 hrs. Free over £45.',        color: '#1d4ed8', bg: '#eff6ff' },
  { icon: Leaf,     title: 'Authentic Products', desc: 'Sourced from trusted Kerala manufacturers.',   color: '#0B5D3B', bg: '#f4faf6' },
  { icon: Lock,     title: 'Secure Payments',    desc: 'SSL-encrypted via Worldpay.',                  color: '#b45309', bg: '#fffbeb' },
  { icon: Package,  title: 'Fresh Stock',        desc: 'Quality-checked, in-date products only.',      color: '#dc2626', bg: '#fef2f2' },
  { icon: Clock,    title: 'Same-Week Delivery', desc: 'Order by Wed, receive by the weekend.',        color: '#0d9488', bg: '#f0fdfa' },
  { icon: ThumbsUp, title: '1,000+ Customers',   desc: 'Trusted across the UK Kerala community.',     color: '#7c3aed', bg: '#f5f3ff' },
];

export default function WhyChooseUs() {
  return (
    <section className="py-6 border-b border-[#d1ead9]" style={{ background: '#f4faf6' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-extrabold text-[#0a3d22] tracking-tight">
            Why 1,000+ UK Customers Choose KG
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-[#d1ead9] p-3 flex flex-col gap-2 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: f.bg }}
                >
                  <Icon style={{ color: f.color, width: 15, height: 15 }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-[11px] mb-0.5 group-hover:text-[#0B5D3B] transition-colors leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-[10px] leading-snug">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
