'use client';

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, Zap, Gift, Truck, Star, Package, Sparkles } from 'lucide-react';
import { fetchActiveBanners, trackBannerView, trackBannerClick, type PromoBanner } from '@/lib/services/bannerService';
import { applyAccent } from '@/lib/utils/themeAccent';

// ── Static fallbacks ──────────────────────────────────────────────────────────
// Shown when no DB banners are configured yet.

const FALLBACK_BANNERS: Omit<PromoBanner, 'id' | 'created_at' | 'updated_at' | 'start_date' | 'end_date' | 'display_order' | 'mobile_image_url'>[] = [
  {
    title:      'Flash Deals This Week',
    subtitle:   'Save up to 30% on selected Kerala favourites',
    image_url:  null,
    image_alt:  null,
    cta_text:   'Shop Deals',
    cta_link:   '/products?filter=deals',
    bg_color:   '#b91c1c',
    bg_gradient:'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #b91c1c 100%)',
    text_color: 'light',
    banner_type:'flash_deal',
    is_active:  true,
  },
  {
    title:      'Earn Up To 15% Cashback',
    subtitle:   'Gold Tier loyalty rewards on every order',
    image_url:  null,
    image_alt:  null,
    cta_text:   'Learn More',
    cta_link:   '/account/wallet',
    bg_color:   '#0B5D3B',
    bg_gradient:'linear-gradient(135deg, #064e3b 0%, #0B5D3B 55%, #065f46 100%)',
    text_color: 'light',
    banner_type:'cashback_promotion',
    is_active:  true,
  },
  {
    title:      'Free Delivery Weekend',
    subtitle:   'On all orders above £35 — limited time',
    image_url:  null,
    image_alt:  null,
    cta_text:   'Shop Now',
    cta_link:   '/products',
    bg_color:   '#1d4ed8',
    bg_gradient:'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #1e40af 100%)',
    text_color: 'light',
    banner_type:'free_delivery',
    is_active:  true,
  },
];

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flash_deal:         Zap,
  cashback_promotion: Gift,
  free_delivery:      Truck,
  product_promotion:  Star,
  new_arrivals:       Package,
  seasonal:           Sparkles,
  brand_promotion:    Star,
};

const TYPE_LABELS: Record<string, string> = {
  flash_deal:         '🔥 Flash Deal',
  cashback_promotion: '🎁 Cashback',
  free_delivery:      '🚚 Free Delivery',
  product_promotion:  '⭐ Featured',
  new_arrivals:       '✨ New Arrivals',
  seasonal:           '🌟 Special',
  brand_promotion:    '🏷 Brand',
};

const ROTATE_MS = 5000;

// ── Slide component ───────────────────────────────────────────────────────────

function BannerSlide({
  banner,
  priority,
  onCtaClick,
}: {
  banner: PromoBanner | (typeof FALLBACK_BANNERS)[0] & { id?: string };
  priority: boolean;
  onCtaClick: () => void;
}) {
  const isDark = banner.text_color === 'dark';
  const bg     = banner.bg_gradient ?? banner.bg_color;
  const Icon   = TYPE_ICONS[banner.banner_type] ?? Star;
  const label  = TYPE_LABELS[banner.banner_type] ?? '';

  return (
    <div
      className="relative w-full h-full flex items-center overflow-hidden select-none"
      style={{ background: bg }}
    >
      {/* Decorative overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 0% 110%, rgba(255,255,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 100% -10%, rgba(255,255,255,0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Content grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-full">

        {/* Left: text + CTA */}
        <div className="flex-1 min-w-0 py-3">
          {/* Type pill */}
          <div className="inline-flex items-center gap-1.5 mb-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              isDark
                ? 'bg-black/10 text-gray-800'
                : 'bg-white/20 text-white/90'
            }`}>
              {label}
            </span>
          </div>

          {/* Headline */}
          <h2 className={`font-extrabold leading-tight mb-1 ${
            isDark ? 'text-gray-900' : 'text-white'
          } text-[1.05rem] sm:text-[1.3rem] lg:text-[1.55rem]`}
            style={{ textShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            {banner.title}
          </h2>

          {/* Subtitle */}
          {banner.subtitle && (
            <p className={`text-[11px] sm:text-[13px] mb-3 leading-snug ${
              isDark ? 'text-gray-700' : 'text-white/85'
            }`}>
              {banner.subtitle}
            </p>
          )}

          {/* CTA button */}
          <Link
            href={banner.cta_link}
            onClick={onCtaClick}
            className={`inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 active:scale-95 shadow-lg ${
              isDark
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-black/20'
                : 'bg-white text-gray-900 hover:bg-white/90 shadow-black/20'
            }`}
          >
            {banner.cta_text}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right: banner image */}
        {banner.image_url ? (
          <div className="flex-shrink-0 h-full flex items-center justify-end py-2">
            <div className="relative w-[130px] sm:w-[180px] lg:w-[240px] h-full max-h-[170px] sm:max-h-[200px]">
              <Image
                src={banner.image_url}
                alt={banner.image_alt || banner.title}
                fill
                className="object-contain drop-shadow-xl"
                sizes="(max-width: 640px) 130px, (max-width: 1024px) 180px, 240px"
                priority={priority}
                unoptimized
              />
            </div>
          </div>
        ) : (
          // Decorative icon placeholder when no image
          <div className={`flex-shrink-0 w-[100px] sm:w-[140px] h-full flex items-center justify-center ${
            isDark ? 'opacity-10' : 'opacity-15'
          }`}>
            <Icon className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
          </div>
        )}
      </div>

      {/* Bottom edge line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

// ── Main carousel ─────────────────────────────────────────────────────────────

export default function PromoBannerCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx]         = useState(0);
  const [paused, setPaused]   = useState(false);
  const [animDir, setAnimDir] = useState<'left' | 'right'>('left');
  const [transitioning, setTransitioning] = useState(false);
  const touchStartX  = useRef<number | null>(null);
  const viewedBanners = useRef<Set<string>>(new Set());
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchActiveBanners().then(data => {
      setBanners(data);
      setLoading(false);
    });
  }, []);

  // Use DB banners or fallbacks
  const slides = useMemo(() => {
    const filtered = banners.filter(b => b.banner_type !== 'marketing_strip');
    if (filtered.length > 0) return filtered;
    // Return fallbacks with synthetic ids
    return FALLBACK_BANNERS.map((b, i) => ({
      ...b,
      id:         `fallback-${i}`,
      created_at: '',
      updated_at: '',
      start_date:  null,
      end_date:    null,
      display_order: i,
      mobile_image_url: null,
    })) as PromoBanner[];
  }, [banners]);

  const clampedIdx = Math.min(idx, slides.length - 1);

  // Track view for the visible slide
  useEffect(() => {
    const slide = slides[clampedIdx];
    if (!slide || slide.id.startsWith('fallback')) return;
    if (viewedBanners.current.has(slide.id)) return;
    viewedBanners.current.add(slide.id);
    trackBannerView(slide.id);
  }, [clampedIdx, slides]);

  // Apply dynamic accent palette whenever the active slide changes
  useEffect(() => {
    const slide = slides[clampedIdx];
    applyAccent(slide?.banner_type ?? null);
  }, [clampedIdx, slides]);

  const go = useCallback((dir: 'next' | 'prev') => {
    if (transitioning || slides.length <= 1) return;
    setAnimDir(dir === 'next' ? 'left' : 'right');
    setTransitioning(true);
    setIdx(i => dir === 'next'
      ? (i + 1) % slides.length
      : (i - 1 + slides.length) % slides.length
    );
    setTimeout(() => setTransitioning(false), 420);
  }, [transitioning, slides.length]);

  // Auto-rotate
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setInterval(() => go('next'), ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, slides.length, go]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 44) go(dx < 0 ? 'next' : 'prev');
    touchStartX.current = null;
    setTimeout(() => setPaused(false), 1500);
  };

  const handleCtaClick = () => {
    const slide = slides[clampedIdx];
    if (!slide || slide.id.startsWith('fallback')) return;
    trackBannerClick(slide.id);
  };

  if (loading) {
    return (
      <div
        className="w-full bg-[#0a3d22] animate-pulse"
        style={{ height: 'clamp(170px, 26vw, 280px)' }}
      />
    );
  }

  const current = slides[clampedIdx];

  return (
    <section
      className="relative overflow-hidden w-full sm:rounded-3xl sm:mx-4 sm:w-[calc(100%-2rem)] sm:my-4 shadow-sm"
      style={{ height: 'clamp(180px, 32vw, 320px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Promotional banner carousel"
    >
      {/* Slide track — CSS transition for smooth 60fps performance */}
      <div
        className="w-full h-full"
        style={{
          transition: transitioning ? 'opacity 0.38s ease, transform 0.38s cubic-bezier(0.25,0.1,0.25,1)' : 'none',
          opacity:    transitioning ? 0.92 : 1,
          transform:  transitioning
            ? `translateX(${animDir === 'left' ? '-1.5%' : '1.5%'})`
            : 'translateX(0)',
        }}
      >
        <BannerSlide
          key={current.id}
          banner={current}
          priority={clampedIdx === 0}
          onCtaClick={handleCtaClick}
        />
      </div>

      {/* Navigation arrows (desktop only) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => { go('prev'); setPaused(true); setTimeout(() => setPaused(false), 2000); }}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { go('next'); setPaused(true); setTimeout(() => setPaused(false), 2000); }}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center rounded-full bg-black/25 hover:bg-black/40 text-white transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setAnimDir(i > clampedIdx ? 'left' : 'right');
                setIdx(i);
                setPaused(true);
                setTimeout(() => setPaused(false), 2000);
              }}
              aria-label={`Go to banner ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === clampedIdx
                  ? 'w-5 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
          <div
            key={`${clampedIdx}-progress`}
            className="h-full bg-white/50"
            style={{
              animation: `banner-progress ${ROTATE_MS}ms linear forwards`,
            }}
          />
        </div>
      )}
    </section>
  );
}
