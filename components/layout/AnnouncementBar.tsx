'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck, Gift, Zap, Star, Package, Sparkles,
  ChevronLeft, ChevronRight, LogIn, Trophy, Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useCart } from '@/lib/context/CartContext';
import { getSupabase } from '@/lib/supabase/client';

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  truck:    Truck,
  gift:     Gift,
  zap:      Zap,
  star:     Star,
  package:  Package,
  sparkles: Sparkles,
  trophy:   Trophy,
  wallet:   Wallet,
};

// ── Static fallback messages ──────────────────────────────────────────────────

const STATIC_MESSAGES = [
  { text: 'Free Delivery Over £45', icon: 'truck', link: '/delivery-policy' },
  { text: 'Earn Up To 15% Cashback', icon: 'gift', link: '/account/wallet' },
  { text: 'Daily Flash Deals', icon: 'zap', link: '/products?filter=deals' },
  { text: '4.9 Star Customer Rating', icon: 'star', link: '/about-us' },
  { text: 'Next-Day Delivery Available', icon: 'package', link: '/delivery-policy' },
  { text: 'New Kerala Products Weekly', icon: 'sparkles', link: '/products' },
];

const FREE_DELIVERY_THRESHOLD = 45;
const INTERVAL_MS = 4000;

// ── Delivery countdown helper ──────────────────────────────────────────────────

function getDeliveryCountdown(): string | null {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(22, 0, 0, 0);
  if (now >= cutoff) return null;
  const diff = cutoff.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 6) return null; // Only show within 6 hours
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnnouncementMessage {
  text: string;
  icon: string;
  link: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnnouncementBar() {
  const { user } = useAuth();
  const { cartTotal } = useCart();
  const router = useRouter();

  const [dbMessages, setDbMessages] = useState<AnnouncementMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch DB messages ──────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    getSupabase()
      .from('announcement_messages')
      .select('text, icon, link')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data?.length) setDbMessages(data as AnnouncementMessage[]);
      })
      .then(undefined, () => {/* silently fall back to static */});
  }, []);

  // ── Build full message list ────────────────────────────────────────────────
  const allMessages: AnnouncementMessage[] = (() => {
    const base = dbMessages.length > 0 ? dbMessages : STATIC_MESSAGES;
    const extra: AnnouncementMessage[] = [];

    // Delivery countdown — only on client to avoid hydration mismatch
    const countdown = mounted ? getDeliveryCountdown() : null;
    if (countdown) {
      extra.push({ text: `Order within ${countdown} for next-day dispatch`, icon: 'truck', link: '/delivery-policy' });
    }

    // Free delivery progress (cart-based)
    if (cartTotal > 0 && cartTotal < FREE_DELIVERY_THRESHOLD) {
      const remaining = (FREE_DELIVERY_THRESHOLD - cartTotal).toFixed(2);
      extra.push({ text: `Spend £${remaining} more for FREE delivery`, icon: 'truck', link: '/products' });
    } else if (cartTotal >= FREE_DELIVERY_THRESHOLD) {
      extra.push({ text: 'You qualify for FREE delivery!', icon: 'truck', link: '/cart' });
    }

    // Guest sign-up prompt
    if (!user) {
      extra.push({ text: 'Sign up and earn loyalty cashback rewards', icon: 'gift', link: '/account' });
    }

    // Interleave personalized messages at the front
    return [...extra, ...base];
  })();

  // ── Navigate with animation ────────────────────────────────────────────────
  const go = useCallback((dir: 'next' | 'prev') => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setIndex(i => {
        if (dir === 'next') return (i + 1) % allMessages.length;
        return (i - 1 + allMessages.length) % allMessages.length;
      });
      setAnimating(false);
    }, 260);
  }, [animating, allMessages.length]);

  // ── Auto-rotate timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || allMessages.length <= 1) return;
    timerRef.current = setInterval(() => go('next'), INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, allMessages.length, go]);

  // Reset index when message list changes (e.g. on login)
  useEffect(() => {
    setIndex(0);
  }, [user, cartTotal]);

  // ── Touch swipe handlers ───────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 'next' : 'prev');
    touchStartX.current = null;
    setTimeout(() => setPaused(false), 2000);
  };

  if (allMessages.length === 0) return null;

  const msg = allMessages[Math.min(index, allMessages.length - 1)];
  const Icon = ICON_MAP[msg.icon] ?? Truck;

  const slideClass = animating
    ? direction === 'next'
      ? 'animate-slide-out-up'
      : 'animate-slide-out-down'
    : direction === 'next'
      ? 'animate-slide-in-down'
      : 'animate-slide-in-up';

  const content = (
    <div
      className={`flex items-center justify-center gap-2 h-full w-full ${slideClass}`}
      key={index}
    >
      <Icon className="h-3 w-3 text-[#6FDB2F] flex-shrink-0" />
      <span className="text-[11px] sm:text-[12px] font-semibold tracking-wide text-white/90 truncate">
        {msg.text}
      </span>
      {allMessages.length > 1 && (
        <span className="hidden sm:flex items-center gap-1 ml-1">
          {allMessages.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === index ? 'bg-[#6FDB2F] scale-125' : 'bg-white/25'
              }`}
            />
          ))}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="w-full overflow-hidden select-none"
      style={{
        height: '36px',
        background: 'linear-gradient(90deg, #071f12 0%, #0B5D3B 40%, #0d6b44 70%, #071f12 100%)',
        borderBottom: '1px solid rgba(111,219,47,0.15)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="max-w-7xl mx-auto px-3 h-full relative flex items-center">

        {/* Prev */}
        {allMessages.length > 1 && (
          <button
            onClick={() => go('prev')}
            aria-label="Previous announcement"
            className="hidden sm:flex absolute left-2 w-5 h-5 items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0 z-10"
          >
            <ChevronLeft className="h-3 w-3 text-white/50" />
          </button>
        )}

        {/* Message */}
        <div className="flex-1 overflow-hidden h-full flex items-center px-2 sm:px-6">
          {msg.link ? (
            <Link href={msg.link} className="w-full h-full flex items-center justify-center" prefetch={false}>
              {content}
            </Link>
          ) : (
            <div className="w-full h-full flex items-center justify-center">{content}</div>
          )}
        </div>

        {/* Next */}
        {allMessages.length > 1 && (
          <button
            onClick={() => go('next')}
            aria-label="Next announcement"
            className="hidden sm:flex absolute right-2 w-5 h-5 items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0 z-10"
          >
            <ChevronRight className="h-3 w-3 text-white/50" />
          </button>
        )}
      </div>
    </div>
  );
}
