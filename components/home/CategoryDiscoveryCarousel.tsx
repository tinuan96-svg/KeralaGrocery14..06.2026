'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
    <section className="px-4 py-5 bg-white border-b border-[#d1ead9]">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded-full" />
        <div className="h-3 w-14 bg-gray-100 animate-pulse rounded-full" />
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-4 overflow-hidden mb-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5" style={{ width: 80 }}>
              <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-2.5 w-12 bg-gray-100 animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function CategoryChip({ item, priority }: { item: CategoryCarouselItem; priority: boolean }) {
  const g = CATEGORY_GRADIENTS[item.slug] ?? FALLBACK;

  return (
    <Link
      href={`/products?filter=${item.slug}`}
      className="group flex flex-col items-center gap-1.5 flex-shrink-0"
      style={{ width: 80 }}
      draggable={false}
    >
      <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden ring-1 ring-black/[0.05] group-active:scale-95 transition-transform duration-150 shadow-sm">
        {item.hero_image ? (
          <>
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
            />
            <img
              src={item.hero_image}
              alt={item.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain p-1.5 group-hover:scale-110 transition-transform duration-200"
            />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
          >
            {g.emoji}
          </div>
        )}
      </div>

      <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight line-clamp-2 w-full group-hover:text-[#0B5D3B] transition-colors duration-150 px-0.5">
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
    const SPEED = 0.4;
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
      className="flex gap-4 overflow-x-auto scrollbar-hide pb-0.5"
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
      className="px-4 py-5 bg-white border-b border-[#d1ead9]"
      onTouchStart={() => { pausedRef.current = true; }}
      onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 1800); }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-extrabold text-[#0a3d22] tracking-tight">Shop By Category</h2>
        <Link
          href="/categories"
          className="ka-view-all text-[11px] font-semibold border rounded-full px-2.5 py-0.5 hover:opacity-90 transition-opacity"
        >
          View All →
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
