import { Star, Truck, Gift, ShieldCheck } from 'lucide-react';

const TRUST = [
  { icon: Star,        label: '4.9 Rating',       sub: 'Verified reviews',  iconColor: '#b45309', bg: '#fffbeb' },
  { icon: Truck,       label: 'Next Day Delivery', sub: 'Order by midnight', iconColor: '#0B5D3B', bg: '#f4faf6' },
  { icon: Gift,        label: 'Cashback Rewards',  sub: 'Up to 15% back',    iconColor: '#0d9488', bg: '#f0fdfa' },
  { icon: ShieldCheck, label: 'Secure Checkout',   sub: 'SSL encrypted',     iconColor: '#4f46e5', bg: '#eef2ff' },
];

export default function TrustStrip() {
  return (
    <section className="bg-white border-b border-[#d1ead9]">
      {/* Desktop */}
      <div className="hidden md:flex max-w-7xl mx-auto px-4 divide-x divide-[#d1ead9]">
        {TRUST.map(({ icon: Icon, label, sub, iconColor, bg }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3 flex-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: bg }}
            >
              <Icon style={{ color: iconColor, width: 16, height: 16 }} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-gray-900 leading-none">{label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
