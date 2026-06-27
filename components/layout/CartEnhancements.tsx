'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Truck, Trophy, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useCart } from '@/lib/context/CartContext';
import { fetchWalletSummary, getTier, TIER_LABELS, daysRemaining, type WalletSettings, type WalletCycle } from '@/lib/services/walletService';

const FREE_DELIVERY_THRESHOLD = 45;

// ── Free Delivery Progress Bar ────────────────────────────────────────────────

export function FreeDeliveryBar() {
  const { cartTotal } = useCart();
  if (cartTotal <= 0) return null;

  const pct = Math.min(100, (cartTotal / FREE_DELIVERY_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal);
  const qualified = cartTotal >= FREE_DELIVERY_THRESHOLD;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${qualified ? 'bg-green-50' : 'bg-amber-50'} border-b border-gray-100`}>
      <Truck className={`h-4 w-4 flex-shrink-0 ${qualified ? 'text-green-600' : 'text-amber-600'}`} />
      <div className="flex-1">
        <p className={`text-[11px] font-semibold mb-1 ${qualified ? 'text-green-700' : 'text-amber-800'}`}>
          {qualified
            ? 'You qualify for FREE delivery!'
            : `Spend £${remaining.toFixed(2)} more for FREE delivery`}
        </p>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${qualified ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!qualified && (
        <Link href="/products" className="flex-shrink-0">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Shop More</span>
        </Link>
      )}
    </div>
  );
}

// ── Personalised Homepage Greeting ────────────────────────────────────────────

export function PersonalisedGreeting() {
  const { user, loading: authLoading } = useAuth();
  const { cartTotal } = useCart();
  const [walletData, setWalletData] = useState<{
    cycle: WalletCycle | null;
    settings: WalletSettings | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWalletSummary(user.id).then(({ activeCycle, settings }) => {
      setWalletData({ cycle: activeCycle, settings });
    }).catch(() => {});
  }, [user]);

  if (authLoading || !user) return null;

  const firstName = user.email?.split('@')[0]?.split('.')[0] ?? 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const cycle = walletData?.cycle;
  const settings = walletData?.settings;
  const spend = cycle?.spend ?? 0;
  const tier = settings ? getTier(spend, settings) : 'bronze';
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const daysLeft = cycle ? daysRemaining(cycle.cycle_end) : null;

  // What does the user need to reach the next tier?
  let tierMessage: string | null = null;
  if (settings && tier !== 'gold') {
    const nextThreshold = tier === 'bronze' ? settings.silver_min : settings.gold_min;
    const needed = Math.max(0, nextThreshold - spend);
    const nextTier = tier === 'bronze' ? 'Silver' : 'Gold';
    if (needed > 0 && needed < 200) {
      tierMessage = `£${needed.toFixed(2)} away from ${nextTier} tier`;
    }
  }

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#0B5D3B] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-black">{displayName[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-gray-900 truncate">Welcome back, {displayName}</p>
            {tierMessage ? (
              <p className="text-[10px] text-amber-700 font-semibold truncate">{tierMessage}</p>
            ) : (
              <p className="text-[10px] text-gray-400 truncate">
                {tierLabel} member{daysLeft !== null ? ` · ${daysLeft}d left in cycle` : ''}
              </p>
            )}
          </div>
        </div>

        <Link
          href="/account/wallet"
          className="flex items-center gap-1.5 flex-shrink-0 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-100 transition-colors"
        >
          <Trophy className="h-3 w-3" />
          {tierLabel}
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Sticky Mini Cart Popup ─────────────────────────────────────────────────────

export function StickyMiniCart() {
  const { cartTotal, cart } = useCart();
  const [visible, setVisible] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (cartCount > lastCount && cartCount > 0) {
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3500);
    }
    setLastCount(cartCount);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [cartCount]);

  if (cartCount === 0) return null;

  return (
    <div
      className={[
        'lg:hidden fixed z-[990] transition-all duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 70px)',
        left: '50%',
        transform: `translateX(-50%) ${visible ? 'translateY(0)' : 'translateY(1rem)'}`,
      }}
    >
      <Link
        href="/cart"
        className="flex items-center gap-2.5 bg-[#0B5D3B] text-white rounded-full px-4 py-2.5 shadow-[0_8px_28px_rgba(11,93,59,0.45)] active:scale-95 transition-transform"
        onClick={() => setVisible(false)}
      >
        <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black">
          {cartCount}
        </span>
        <span className="text-[12px] font-bold">View Cart</span>
        <span className="text-[12px] font-extrabold text-green-200">£{cartTotal.toFixed(2)}</span>
        <ArrowRight className="h-3.5 w-3.5 text-green-200" />
      </Link>
    </div>
  );
}
