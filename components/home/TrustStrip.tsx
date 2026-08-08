import { Truck, ShieldCheck, Award } from 'lucide-react';

const BENEFITS = [
  { icon: Truck, text: 'Next Day Delivery', sub: 'Across UK', color: 'text-blue-600' },
  { icon: Award, text: '100% Authentic', sub: 'Kerala Sourced', color: 'text-[#0B5D3B]' },
  { icon: ShieldCheck, text: 'Secure Payments', sub: 'SSL Encrypted', color: 'text-amber-600' },
];

export default function TrustStrip() {
  return (
    <section className="bg-white py-4 border-b border-gray-100 overflow-x-auto scrollbar-hide shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-max md:min-w-0 md:justify-around px-6">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-center gap-3 pr-8 last:pr-0 md:pr-0 group">
            <div className={`w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:shadow-md group-hover:rotate-3`}>
              <b.icon className={`w-5 h-5 ${b.color} transition-transform duration-300 group-hover:scale-110`} />
            </div>
            <div>
              <p className="text-[12px] font-black text-gray-900 leading-tight uppercase tracking-tight group-hover:text-[#0B5D3B] transition-colors">{b.text}</p>
              <p className="text-[10px] font-bold text-gray-400 leading-tight uppercase tracking-widest mt-0.5">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
