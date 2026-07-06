'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const SHOWCASE = [
  { name: 'Kerala Rice',   category: 'Ari & Grains',      price: 'from £3.99', emoji: '🍚', color: 'from-stone-500 to-stone-700' },
  { name: 'Mango Pickle',  category: 'Achar & Preserves', price: 'from £2.49', emoji: '🥒', color: 'from-green-500 to-green-700' },
  { name: 'Masala Mix',    category: 'Podi & Spices',     price: 'from £1.99', emoji: '🌶️', color: 'from-red-500 to-orange-600' },
  { name: 'Coconut Oil',   category: 'Enna & Neyy',       price: 'from £4.99', emoji: '🫙', color: 'from-yellow-500 to-amber-600' },
  { name: 'Chai & Coffee', category: 'Chaaya & Coffee',   price: 'from £3.49', emoji: '☕', color: 'from-amber-700 to-stone-700' },
];

export default function PremiumHero() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % SHOWCASE.length), 2600);
    return () => clearInterval(t);
  }, []);

  const cards = [
    { item: SHOWCASE[activeIdx],                          pos: { top: '2%',   left: '2%'  }, delay: '0s'   },
    { item: SHOWCASE[(activeIdx + 1) % SHOWCASE.length], pos: { top: '2%',   right: '2%' }, delay: '0.4s' },
    { item: SHOWCASE[(activeIdx + 2) % SHOWCASE.length], pos: { bottom: '8%',left: '22%' }, delay: '0.8s' },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0a3d22]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 0% 100%, rgba(245,158,11,0.15) 0%, transparent 55%),
            radial-gradient(ellipse at 100% 0%, rgba(52,211,153,0.10) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center py-3 md:py-8">

          {/* ── Left — copy + CTAs ── */}
          <div className="py-0 md:py-0">
            {/* Delivery badge */}
            <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-400/25 rounded-full px-3 py-1 mb-2.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-xs font-semibold">Now delivering across the UK 🇬🇧</span>
            </div>

            {/* Headline */}
            <h1 className="text-[1.35rem] sm:text-[2.1rem] md:text-[2.3rem] font-extrabold text-white leading-[1.1] mb-2">
              Authentic Kerala Groceries{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400">
                Delivered Across The UK
              </span>
            </h1>

            {/* Short description — hidden on smallest screens to save space */}
            <p className="hidden sm:block text-white/75 text-sm sm:text-[15px] mb-3 leading-relaxed max-w-lg">
              500+ authentic products. Fresh stock weekly. Fast nationwide delivery.
            </p>

            {/* CTAs — Shop Now only on mobile */}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 bg-[#F59E0B] hover:bg-amber-500 text-white font-extrabold px-5 py-2 md:px-6 md:py-2.5 rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/30 active:scale-95"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/categories"
                className="hidden md:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm transition-all duration-200 active:scale-95"
              >
                Browse Categories
              </Link>
            </div>
          </div>

          {/* ── Right — desktop only rotating showcase ── */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-[340px] h-[210px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-[120px] h-[120px] bg-white/10 backdrop-blur-md rounded-3xl border border-white/25 flex items-center justify-center shadow-2xl animate-float">
                  <Image
                    src="/logo_KG_Trans.png"
                    alt="Kerala Groceries"
                    width={90}
                    height={90}
                    className="rounded-2xl object-contain"
                    priority
                  />
                </div>
              </div>

              {cards.map(({ item, pos, delay }, i) => (
                <div
                  key={`${i}-${item.name}`}
                  className="absolute w-[100px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 animate-float transition-all duration-700"
                  style={{ ...pos, animationDelay: delay } as React.CSSProperties}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] font-bold leading-tight truncate">{item.name}</p>
                      <p className="text-white/50 text-[9px] leading-tight truncate">{item.category}</p>
                    </div>
                  </div>
                  <div className={`px-1.5 py-0.5 rounded-lg bg-gradient-to-r ${item.color} opacity-80`}>
                    <p className="text-white text-[9px] font-extrabold text-center">{item.price}</p>
                  </div>
                </div>
              ))}

              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {SHOWCASE.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-400 ${i === activeIdx ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-white/25'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
