'use client';

import { Truck, Gift, Zap, ShieldCheck } from 'lucide-react';

const ITEMS = [
  { icon: Truck,       text: 'Free Delivery Over £45' },
  { icon: Zap,         text: 'Next Day Delivery Available' },
  { icon: Gift,        text: 'Earn Up To 15% Cashback' },
  { icon: ShieldCheck, text: 'Secure Checkout · SSL Encrypted' },
  { icon: Truck,       text: 'UK-Wide Delivery' },
];

export default function PromoStrip() {
  return (
    <div className="h-8 bg-[#0F6A38] text-white overflow-hidden flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex items-center justify-center md:justify-between gap-6 overflow-x-auto scrollbar-hide whitespace-nowrap">
          {ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              <item.icon className="h-3 w-3 text-green-300 flex-shrink-0" />
              <span className="text-[11px] font-semibold tracking-wide text-white/90">{item.text}</span>
              {i < ITEMS.length - 1 && (
                <span className="ml-4 hidden md:block w-px h-3 bg-white/25 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
