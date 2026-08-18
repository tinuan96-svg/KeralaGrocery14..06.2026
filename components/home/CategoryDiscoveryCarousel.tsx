'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { fetchCategoryCarouselData, type CategoryCarouselItem } from '@/lib/services/storeProductsService';

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; emoji: string }> = {
  'rice-grains':        { from: '#FEF3C7', to: '#FDE68A', emoji: '🌾' },
  'pickles-chutneys':   { from: '#DCFCE7', to: '#BBF7D0', emoji: '🫙' },
  'snacks-namkeens':    { from: '#FEF9C3', to: '#FEF08A', emoji: '🥜' },
  'oils-ghee':          { from: '#FFF7ED', to: '#FED7AA', emoji: '🫒' },
  'rice-powders-flour': { from: '#F5F5FF', to: '#E5E7FF', emoji: '🌿' },
  'tea-coffee':         { from: '#FDF4FF', to: '#F5D0FE', emoji: '☕' },
  'ready-to-eat':       { from: '#FFF1F2', to: '#FFE4E6', emoji: '🍱' },
  'frozen-foods':       { from: '#EFF6FF', to: '#DBEAFE', emoji: '❄️' },
  'sweets':             { from: '#FFF0F6', to: '#FECDD3', emoji: '🍬' },
  'personal-care':      { from: '#F0FDFA', to: '#CCFBF1', emoji: '🌸' },
  'beverages':          { from: '#ECFDF5', to: '#A7F3D0', emoji: '🥤' },
  'spices':             { from: '#FFF7ED', to: '#FFEDD5', emoji: '🌶️' },
  'condiments':         { from: '#FEF9C3', to: '#FDE047', emoji: '🫙' },
  'sugar':              { from: '#FDF4FF', to: '#E9D5FF', emoji: '🍬' },
};
const FALLBACK = { from: '#F1F5F9', to: '#E2E8F0', emoji: '🛒' };

function Skeleton() {
  return (
    <section className="px-4 py-8 bg-white border-b border-[#f0f9f4] ka-section">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gray-50 animate-pulse border border-gray-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-gray-100 animate-pulse rounded-full" />
            <div className="h-2.5 w-24 bg-gray-50 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 85 }}>
            <div className="w-[76px] h-[76px] rounded-[28px] bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
            </div>
            <div className="h-3 w-14 bg-gray-50 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryChip({ item, priority }: { item: CategoryCarouselItem; priority: boolean }) {
  const g = CATEGORY_GRADIENTS[item.slug] ?? FALLBACK;

  return (
    <Link
      href={`/products?filter=${item.slug}`}
      className="group flex flex-col items-center gap-2 flex-shrink-0"
      style={{ width: 85 }}
      draggable={false}
    >
      <div className="relative w-[76px] h-[76px] rounded-[28px] overflow-hidden ring-1 ring-black/[0.03] group-active:scale-90 transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.04)] group-hover:shadow-[0_12px_30px_rgba(11,93,59,0.12)] group-hover:-translate-y-1 bg-white">
        <div
          className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
        />
        {item.hero_image ? (
          <Image
            src={item.hero_image}
            alt={item.name}
            fill
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain p-2.5 group-hover:scale-110 transition-transform duration-500 z-10"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl z-10 relative"
          >
            {g.emoji}
          </div>
        )}
      </div>

      <span className="text-[11px] font-black text-gray-900 text-center leading-tight line-clamp-2 w-full group-hover:text-[#0B5D3B] transition-colors duration-200 px-0.5 tracking-tight">
        {item.name}
      </span>
    </Link>
  );
}

function AutoScrollRow({
  items,
  reverse,
  pausedRef,
  priority,
}: {
  items: CategoryCarouselItem[];
  reverse: boolean;
  pausedRef: React.MutableRefObject<boolean>;
  priority: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const doubled  = [...items, ...items];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;
    const SPEED = 0.35;
    const tick = () => {
      if (!pausedRef.current && track) {
        if (reverse) {
          track.scrollLeft -= SPEED;
          if (track.scrollLeft <= 0) {
            track.scrollLeft += track.scrollWidth / 2;
          }
        } else {
          track.scrollLeft += SPEED;
          if (track.scrollLeft >= track.scrollWidth / 2) {
            track.scrollLeft -= track.scrollWidth / 2;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    // seed reverse row at midpoint so it scrolls seamlessly
    if (reverse) track.scrollLeft = track.scrollWidth / 2;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [items, reverse, pausedRef]);

  return (
    <div
      ref={trackRef}
      className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {doubled.map((item, idx) => (
        <CategoryChip key={`${item.id}-${idx}`} item={item} priority={priority && idx < 6} />
      ))}
    </div>
  );
}

export default function CategoryDiscoveryCarousel() {
  const [items, setItems]   = useState<CategoryCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pausedRef = useRef(false);

  useEffect(() => {
    fetchCategoryCarouselData().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Skeleton />;
  if (items.length === 0) return null;

  const half   = Math.ceil(items.length / 2);
  const rowA   = items.slice(0, half);
  const rowB   = items.slice(half);

  return (
    <section
      className="px-4 py-8 bg-white border-b border-[#f0f9f4] ka-section"
      onTouchStart={() => { pausedRef.current = true; }}
      onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 1800); }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-gray-100 shadow-sm ka-icon-bg">
            <svg className="w-5 h-5 ka-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </div>
          <div>
            <h2 className="text-[17px] font-black text-[#0a3d22] leading-none tracking-tight">Shop By Category</h2>
            <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Our full collection</p>
          </div>
        </div>
        <Link
          href="/categories"
          className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ka-view-all px-3 py-1.5 rounded-full border transition-all"
        >
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Mobile: 2 auto-scrolling rows */}
      <div className="md:hidden flex flex-col gap-2.5">
        <AutoScrollRow items={rowA} reverse={false} pausedRef={pausedRef} priority={true} />
        <AutoScrollRow items={rowB} reverse={true}  pausedRef={pausedRef} priority={false} />
      </div>

      {/* Desktop: wrapped grid */}
      <div className="hidden md:flex gap-5 overflow-x-auto scrollbar-hide flex-wrap">
        {items.map((item, idx) => (
          <CategoryChip key={item.id} item={item} priority={idx < 10} />
        ))}
      </div>
    </section>
  );
}
