'use client';

import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { getTier } from '@/lib/services/walletService';

const TIERS = [
  { key: 'bronze', label: 'Bronze', rate: '2%',  icon: '🥉' },
  { key: 'silver', label: 'Silver', rate: '10%', icon: '🥈' },
  { key: 'gold',   label: 'Gold',   rate: '15%', icon: '🥇' },
];

export default function LoyaltyBanner() {
  const { user } = useAuth();
  const { wallet, activeCycle, settings, loading } = useWallet();

  const spend = parseFloat(activeCycle?.spend?.toString() ?? '0');
  const currentTier = settings ? getTier(spend, settings) : 'bronze';
  const silverMin = settings?.silver_min ?? 251;
  const goldMin = settings?.gold_min ?? 500;

  let progressPct = 0;
  let progressLabel = '';
  if (user && !loading) {
    if (currentTier === 'bronze') {
      progressPct = Math.min(100, Math.round((spend / silverMin) * 100));
      progressLabel = `£${Math.max(0, silverMin - spend).toFixed(0)} more to unlock Silver`;
    } else if (currentTier === 'silver') {
      progressPct = Math.min(100, Math.round(((spend - silverMin) / (goldMin - silverMin)) * 100));
      progressLabel = `£${Math.max(0, goldMin - spend).toFixed(0)} more to unlock Gold`;
    } else {
      progressPct = 100;
      progressLabel = 'Maximum tier — 15% cashback active';
    }
  }

  const tierIdx = TIERS.findIndex(t => t.key === currentTier);

  return (
    <section className="py-6 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-[32px] overflow-hidden bg-[#0a3d22] shadow-[0_12px_40px_rgba(10,61,34,0.15)]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(ellipse at 90% 50%, rgba(245,158,11,0.18) 0%, transparent 60%),
                                radial-gradient(ellipse at 10% 100%, rgba(16,185,129,0.12) 0%, transparent 50%)`,
            }}
          />

          <div className="relative z-10 px-5 py-6">
            {/* Top row: copy + CTAs */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span className="text-amber-300 text-[10px] font-black uppercase tracking-[0.15em]">KG Wallet Rewards</span>
                </div>
                <h2 className="text-white text-[19px] font-black leading-tight tracking-tight">
                  Earn Up To <span className="text-amber-400">15% Cashback</span>
                </h2>
                <p className="text-white/60 text-[12px] mt-1 leading-snug font-medium">
                  Shop more and unlock bigger rewards.
                </p>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  href="/account/wallet"
                  className="inline-flex items-center justify-center gap-1 bg-amber-400 hover:bg-amber-300 text-[#0a3d22] font-black text-[11px] px-4 py-2 rounded-2xl transition-all shadow-lg shadow-amber-500/30 whitespace-nowrap active:scale-95"
                >
                  <Wallet className="h-3 w-3" /> View Wallet
                </Link>
              </div>
            </div>

            {/* Tier strip */}
            <div className="flex items-center gap-1.5 mb-3">
              {TIERS.map((tier, i) => {
                const isActive = tier.key === currentTier;
                const isPast = i < tierIdx;
                return (
                  <div key={tier.key} className="flex items-center gap-1.5">
                    <div className={[
                      'flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
                      isActive
                        ? 'bg-amber-400/20 border-amber-400/60 text-amber-300 ring-1 ring-amber-400/40'
                        : isPast
                          ? 'bg-white/10 border-white/20 text-white/60'
                          : 'bg-white/5 border-white/10 text-white/35',
                    ].join(' ')}>
                      <span>{tier.icon}</span>
                      <span>{tier.rate}</span>
                    </div>
                    {i < TIERS.length - 1 && (
                      <span className="text-white/25 text-[10px]">→</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar — logged-in users */}
            {user && !loading && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/50">
                    Current: <span className="text-white/80 font-semibold capitalize">{currentTier}</span>
                  </span>
                  <span className="text-[10px] text-white/50">{progressLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="ka-wallet-bar h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Logged-out nudge */}
            {!user && (
              <p className="text-[10px] text-white/40 leading-relaxed">
                Spend £500+ this month and unlock 15% cashback on every order.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
