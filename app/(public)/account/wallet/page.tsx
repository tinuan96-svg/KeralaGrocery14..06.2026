'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '@/lib/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import {
  fetchTransactions,
  fetchCashbackLogs,
  getTier,
  getEstimatedCashback,
  getCashbackRate,
  daysRemaining,
  formatCurrency,
  txTypeLabel,
  TIER_LABELS,
  type WalletTransaction,
  type WalletCashbackLog,
  type WalletSettings,
} from '@/lib/services/walletService';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Trophy, Star, Zap, ShieldCheck, Clock, Calendar, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, ShoppingBag, Search, TrendingUp, Gift, CreditCard, CircleCheck as CheckCircle2, Sparkles, ArrowRight, Lock, Flame, Target, TriangleAlert as AlertTriangle, ChevronUp } from 'lucide-react';

const PAGE_SIZE = 20;

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  bronze: {
    label: 'Bronze', rate: '2%', rateNum: 0.02,
    min: 0, max: 250, minLabel: '£0', maxLabel: '£250', days: '30 Day Cycle',
    gradient: 'from-amber-600 to-orange-500',
    ring: 'ring-amber-400', glow: 'shadow-amber-500/40',
    textColor: 'text-amber-600', bgLight: 'bg-amber-50', border: 'border-amber-200',
    icon: '🥉', metalGradient: 'from-amber-300 via-orange-400 to-amber-600',
    nextLabel: 'Silver', nextRate: '10%', nextRateNum: 0.10,
  },
  silver: {
    label: 'Silver', rate: '10%', rateNum: 0.10,
    min: 251, max: 499, minLabel: '£251', maxLabel: '£499', days: '60 Day Cycle',
    gradient: 'from-slate-400 to-slate-600',
    ring: 'ring-slate-400', glow: 'shadow-slate-500/40',
    textColor: 'text-slate-600', bgLight: 'bg-slate-50', border: 'border-slate-200',
    icon: '🥈', metalGradient: 'from-slate-200 via-slate-400 to-slate-600',
    nextLabel: 'Gold', nextRate: '15%', nextRateNum: 0.15,
  },
  gold: {
    label: 'Gold', rate: '15%', rateNum: 0.15,
    min: 500, max: Infinity, minLabel: '£500', maxLabel: '∞', days: '90 Day Cycle',
    gradient: 'from-yellow-400 to-amber-500',
    ring: 'ring-yellow-400', glow: 'shadow-yellow-500/40',
    textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', border: 'border-yellow-200',
    icon: '🥇', metalGradient: 'from-yellow-200 via-yellow-400 to-amber-500',
    nextLabel: null, nextRate: null, nextRateNum: null,
  },
} as const;

type TierKey = keyof typeof TIER_CONFIG;

// ── Animated number counter ───────────────────────────────────────────────────
function AnimatedCurrency({ value, className = '' }: { value: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => `£${v.toFixed(2)}`);
  const [displayStr, setDisplayStr] = useState('£0.00');
  useEffect(() => { motionVal.set(value); }, [value, motionVal]);
  useEffect(() => { const unsub = display.on('change', setDisplayStr); return unsub; }, [display]);
  return <span className={className}>{displayStr}</span>;
}

// ── Floating particles ────────────────────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300/40"
          style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </div>
  );
}

// ── Rotating marketing messages ───────────────────────────────────────────────
const MARKETING_MESSAGES = [
  { icon: '🔥', text: 'Spend £251 more to unlock 5x cashback' },
  { icon: '🎁', text: 'Silver members earn up to £50 cashback per cycle' },
  { icon: '🏆', text: 'Gold members earn up to £75 cashback per cycle' },
  { icon: '⚡', text: "Don't leave rewards on the table — shop now" },
  { icon: '💰', text: 'Every £1 you spend earns real cashback' },
  { icon: '🚀', text: 'Reach Silver and multiply your earnings 5x' },
];

function RotatingMessages() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MARKETING_MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);
  const msg = MARKETING_MESSAGES[idx];
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F6A38] to-[#0d7348] px-4 py-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2.5"
        >
          <span className="text-xl flex-shrink-0">{msg.icon}</span>
          <span className="text-white text-sm font-semibold">{msg.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Hero wallet card ──────────────────────────────────────────────────────────
function HeroCard({
  balance, tier, activeCycle, spend, settings,
}: {
  balance: number; tier: TierKey; activeCycle: any; spend: number; settings: any;
}) {
  const cfg = TIER_CONFIG[tier];
  const cycleEnd = activeCycle?.cycle_end ?? null;
  const remaining = cycleEnd ? daysRemaining(cycleEnd) : null;
  const cashback = settings ? getEstimatedCashback(spend, settings) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-3xl overflow-hidden shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B5D3B] via-[#0d7348] to-[#064e31]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl" />
      <Particles />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-emerald-300/70 text-xs font-semibold uppercase tracking-widest mb-1">KG Wallet</p>
            <p className="text-white/60 text-[11px]">Available Balance</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-bold"
          >
            <span>{cfg.icon}</span>
            <span className="text-white">{cfg.label}</span>
          </motion.div>
        </div>

        <div className="mb-6">
          <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
            <AnimatedCurrency value={balance} />
          </div>
          {cashback > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="flex items-center gap-1.5 mt-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-semibold">
                ~{formatCurrency(cashback)} cashback pending this cycle
              </span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Calendar className="h-3.5 w-3.5" />, label: 'Cycle Start',
              value: activeCycle?.cycle_start
                ? new Date(activeCycle.cycle_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : '—',
            },
            {
              icon: <Calendar className="h-3.5 w-3.5" />, label: 'Cycle End',
              value: cycleEnd
                ? new Date(cycleEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : '—',
            },
            {
              icon: <Clock className="h-3.5 w-3.5" />, label: 'Days Left',
              value: remaining !== null ? `${remaining}d` : '—',
            },
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10"
            >
              <div className="flex items-center gap-1 text-emerald-300/70 mb-1">
                {stat.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wide">{stat.label}</span>
              </div>
              <p className="text-white font-bold text-sm">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="mt-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${cfg.gradient} shadow-lg`} />
            <span className="text-white/60 text-xs">
              Cashback rate: <span className="text-yellow-300 font-bold">{cfg.rate}</span>
            </span>
          </div>
          <Link href="/products"
            className="flex items-center gap-1 text-xs text-emerald-300 hover:text-white transition-colors font-semibold"
          >
            Shop now <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Reward thermometer (replaces old TierJourney) ─────────────────────────────
function RewardThermometer({ tier, spend, settings }: { tier: TierKey; spend: number; settings: WalletSettings }) {
  const tiers: TierKey[] = ['bronze', 'silver', 'gold'];
  const currentIdx = tiers.indexOf(tier);
  const goldMin = settings.gold_min;
  const silverMin = settings.silver_min;

  // Overall progress 0–100 across all tiers
  const totalProgress = tier === 'gold' ? 100 : Math.min(100, (spend / goldMin) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Target className="h-5 w-5 text-green-600" />
        <h2 className="font-bold text-gray-900">Reward Journey</h2>
        <span className="ml-auto text-xs text-gray-500 font-medium">
          {tier === 'gold' ? 'Max tier reached!' : `${formatCurrency(spend)} spent this cycle`}
        </span>
      </div>

      {/* Tier nodes */}
      <div className="relative">
        {/* Progress track */}
        <div className="absolute top-7 left-7 right-7 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-slate-400 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="flex items-start justify-between relative z-10">
          {tiers.map((t, i) => {
            const cfg = TIER_CONFIG[t];
            const isActive = t === tier;
            const isUnlocked = i <= currentIdx;
            const isNext = i === currentIdx + 1;

            return (
              <div key={t} className="flex flex-col items-center" style={{ width: '33%' }}>
                {/* Node */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 20px rgba(251,191,36,0.6)', '0 0 0px rgba(251,191,36,0)'] } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                  className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
                    ${isActive ? `bg-gradient-to-br ${cfg.gradient} shadow-lg` : isUnlocked ? 'bg-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}
                    transition-all duration-300`}
                >
                  {isUnlocked ? (
                    <span>{cfg.icon}</span>
                  ) : (
                    <Lock className="h-5 w-5 text-gray-300" />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute -inset-1.5 rounded-2xl ring-2 ring-yellow-400/50"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {isNext && (
                    <motion.div
                      className="absolute -inset-1 rounded-2xl ring-2 ring-slate-300/60"
                      animate={{ opacity: [0.2, 0.7, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                <p className={`text-xs font-bold mt-2 text-center ${isActive ? cfg.textColor : isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                  {cfg.label}
                </p>
                <p className={`text-[11px] font-extrabold mt-0.5 ${isActive ? 'text-gray-900' : isUnlocked ? 'text-green-600' : 'text-gray-400'}`}>
                  {cfg.rate} back
                </p>
                {!isUnlocked && (
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">
                    {t === 'silver' ? `Spend £${Math.max(0, silverMin - spend).toFixed(0)} more` : `Spend £${Math.max(0, goldMin - spend).toFixed(0)} more`}
                  </p>
                )}
                {isActive && (
                  <div className="mt-1 px-2 py-0.5 bg-green-100 rounded-full">
                    <span className="text-[10px] text-green-700 font-bold">Current</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress label */}
      {tier !== 'gold' && (
        <div className="mt-4 flex justify-between text-[10px] font-semibold text-gray-400">
          <span>£0</span>
          <span className={tier !== 'bronze' ? 'text-slate-600 font-bold' : ''}>{formatCurrency(silverMin)} Silver</span>
          <span className={tier !== 'bronze' && tier !== 'silver' ? 'text-yellow-600 font-bold' : ''}>{formatCurrency(goldMin)} Gold</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Reward Upgrade Card (main gamification card) ───────────────────────────────
function RewardUpgradeCard({ spend, settings, tier }: { spend: number; settings: WalletSettings; tier: TierKey }) {
  const cfg = TIER_CONFIG[tier];
  const isGold = tier === 'gold';

  if (isGold) {
    // Gold = max tier — show achievement card
    const goldCashback = parseFloat((spend * 0.15).toFixed(2));
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="relative rounded-3xl overflow-hidden shadow-md"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-yellow-900/70 text-xs font-bold uppercase tracking-widest">Max Tier Unlocked</p>
              <h2 className="text-yellow-900 text-2xl font-extrabold">Gold Member</h2>
            </div>
          </div>
          <p className="text-yellow-900/80 text-sm mb-4">
            You&apos;re earning the maximum 15% cashback on every order. Keep spending to maximize your rewards!
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/30 rounded-2xl p-3 text-center">
              <p className="text-yellow-900/60 text-[10px] uppercase font-bold mb-1">Cycle Spend</p>
              <p className="text-yellow-900 text-xl font-extrabold">{formatCurrency(spend)}</p>
            </div>
            <div className="bg-white/30 rounded-2xl p-3 text-center">
              <p className="text-yellow-900/60 text-[10px] uppercase font-bold mb-1">Cashback Earned</p>
              <p className="text-yellow-900 text-xl font-extrabold">{formatCurrency(goldCashback)}</p>
            </div>
          </div>
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-yellow-900 text-yellow-100 font-extrabold text-sm px-6 py-3 rounded-xl hover:bg-yellow-800 transition-colors"
          >
            Keep Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  const nextTier = tier === 'bronze' ? 'silver' : 'gold';
  const nextCfg = TIER_CONFIG[nextTier];
  const spendNeeded = tier === 'bronze' ? settings.silver_min - spend : settings.gold_min - spend;
  const currentRate = cfg.rateNum;
  const nextRate = nextCfg.rateNum;

  // Cashback comparison on a hypothetical £500 basket
  const exampleSpend = tier === 'bronze' ? settings.silver_min : settings.gold_min;
  const currentCashback = parseFloat((exampleSpend * currentRate).toFixed(2));
  const nextCashback = parseFloat((exampleSpend * nextRate).toFixed(2));
  const extraReward = parseFloat((nextCashback - currentCashback).toFixed(2));

  // Current cycle actual cashback
  const actualCashback = parseFloat((spend * nextRate).toFixed(2));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="relative rounded-3xl overflow-hidden shadow-md"
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${nextCfg.gradient} opacity-[0.12]`} />
      <div className="absolute inset-0 bg-white" />
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${nextCfg.gradient}`} />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unlock Next Tier</p>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>{nextCfg.icon}</span> Unlock {nextCfg.label} Rewards
            </h2>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${nextCfg.gradient} text-white text-xs font-extrabold shadow`}
          >
            {nextCfg.rate} cashback
          </motion.div>
        </div>

        {/* Spend needed — headline */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold text-gray-900">{formatCurrency(Math.max(0, spendNeeded))}</span>
            <span className="text-gray-500 font-semibold">more to spend</span>
          </div>
          <p className="text-sm text-gray-500">
            Increase cashback from <span className="font-bold text-amber-600">{cfg.rate}</span>
            {' '}→{' '}
            <span className={`font-extrabold ${nextCfg.textColor}`}>{nextCfg.rate}</span>
          </p>
          {/* Mini progress bar */}
          <div className="mt-3 h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient}`}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100,
                  tier === 'bronze'
                    ? (spend / settings.silver_min) * 100
                    : ((spend - settings.silver_min) / (settings.gold_min - settings.silver_min)) * 100
                )}%`,
              }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-semibold">
            <span>{formatCurrency(spend)} spent</span>
            <span>{tier === 'bronze' ? formatCurrency(settings.silver_min) : formatCurrency(settings.gold_min)} target</span>
          </div>
        </div>

        {/* Cashback comparison */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Cashback on {formatCurrency(exampleSpend)} spend
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`rounded-2xl p-3 text-center ${cfg.bgLight} border ${cfg.border}`}>
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{cfg.icon} {cfg.label}</p>
            <p className={`text-xl font-extrabold ${cfg.textColor}`}>{formatCurrency(currentCashback)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{cfg.rate} rate</p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${nextCfg.bgLight} border-2 ${nextCfg.border} relative`}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 rounded-full">
              <span className="text-[9px] text-white font-extrabold uppercase">Next</span>
            </div>
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{nextCfg.icon} {nextCfg.label}</p>
            <p className={`text-xl font-extrabold ${nextCfg.textColor}`}>{formatCurrency(nextCashback)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{nextCfg.rate} rate</p>
          </div>
          <div className="rounded-2xl p-3 text-center bg-green-50 border-2 border-green-200">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Extra Reward</p>
            <p className="text-xl font-extrabold text-green-700">+{formatCurrency(extraReward)}</p>
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">you gain</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2.5">
          <Link href="/products"
            className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${nextCfg.gradient} text-white font-extrabold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity shadow`}
          >
            <ShoppingBag className="h-4 w-4" /> Shop to Unlock {nextCfg.label}
          </Link>
          <Link href="/products"
            className="flex items-center justify-center gap-1 border-2 border-gray-200 text-gray-700 font-semibold text-sm px-4 py-3 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Browse <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Missing Reward Urgency Banner ─────────────────────────────────────────────
function MissingRewardBanner({ spend, settings, tier }: { spend: number; settings: WalletSettings; tier: TierKey }) {
  if (tier === 'gold') return null;

  const nextTier = tier === 'bronze' ? 'silver' : 'gold';
  const nextCfg = TIER_CONFIG[nextTier];
  const cfg = TIER_CONFIG[tier];
  const spendNeeded = tier === 'bronze' ? settings.silver_min - spend : settings.gold_min - spend;
  const exampleSpend = tier === 'bronze' ? settings.silver_min : settings.gold_min;
  const currentCashback = parseFloat((exampleSpend * cfg.rateNum).toFixed(2));
  const nextCashback = parseFloat((exampleSpend * nextCfg.rateNum).toFixed(2));
  const multiplier = Math.round(nextCfg.rateNum / cfg.rateNum);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="relative rounded-3xl overflow-hidden shadow-sm"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      {/* Animated stripes */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)' }}
      />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"
          >
            <Trophy className="h-6 w-6 text-white" />
          </motion.div>
          <div className="flex-1">
            <p className="text-orange-100/80 text-[11px] font-bold uppercase tracking-widest mb-0.5">Reward Alert</p>
            <h3 className="text-white font-extrabold text-lg leading-tight">
              Only {formatCurrency(Math.max(0, spendNeeded))} away from {nextCfg.label}
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-white/90 text-sm font-semibold">
            Unlock <span className="text-white font-extrabold">{multiplier}x</span> more cashback than {cfg.label}.
          </p>
          <p className="text-orange-100/80 text-sm">
            Continue shopping to earn up to{' '}
            <span className="text-white font-extrabold text-base">{formatCurrency(nextCashback)}</span>
            {' '}cashback instead of{' '}
            <span className="font-bold">{formatCurrency(currentCashback)}</span> — a difference of{' '}
            <span className="text-white font-extrabold">+{formatCurrency(nextCashback - currentCashback)}</span>
          </p>
        </div>

        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="mt-4"
        >
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors shadow"
          >
            Boost My Rewards <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Live Reward Calculator ────────────────────────────────────────────────────
function LiveRewardCalculator({ spend, settings, tier }: { spend: number; settings: WalletSettings; tier: TierKey }) {
  const cfg = TIER_CONFIG[tier];
  const isGold = tier === 'gold';
  const nextTierKey = tier === 'bronze' ? 'silver' : 'gold';
  const nextCfg = TIER_CONFIG[nextTierKey];

  // Build milestones based on current tier
  const milestones = isGold
    ? [50, 100, 250, 500].map(extra => ({
        extra,
        total: spend + extra,
        cashback: parseFloat(((spend + extra) * cfg.rateNum).toFixed(2)),
        tier: 'gold' as TierKey,
        label: `+${formatCurrency(extra)}`,
      }))
    : (() => {
        const threshold = tier === 'bronze' ? settings.silver_min : settings.gold_min;
        const nextThreshold = settings.gold_min;
        const extras = [50, 100, Math.max(0, threshold - spend), nextThreshold - spend].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);
        return extras.map(extra => {
          const total = spend + extra;
          const t = getTier(total, settings) as TierKey;
          const rate = TIER_CONFIG[t].rateNum;
          return {
            extra,
            total,
            cashback: parseFloat((total * rate).toFixed(2)),
            tier: t,
            label: total >= threshold ? `Unlock ${nextCfg.label}!` : `+${formatCurrency(extra)}`,
          };
        });
      })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-amber-500" />
        <h2 className="font-bold text-gray-900">Live Reward Calculator</h2>
        <span className="ml-auto text-xs text-gray-400 font-medium">If you spend another…</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {milestones.map((m, i) => {
          const mCfg = TIER_CONFIG[m.tier];
          const isUnlock = m.tier !== tier;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.07 }}
              className={`relative rounded-2xl p-4 border cursor-default transition-all duration-200 hover:shadow-md
                ${isUnlock ? `${mCfg.bgLight} ${mCfg.border} border-2` : 'bg-gray-50 border-gray-100'}`}
            >
              {isUnlock && (
                <div className={`absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r ${mCfg.gradient} rounded-full`}>
                  <span className="text-[9px] text-white font-extrabold uppercase">Unlocks {mCfg.label}!</span>
                </div>
              )}
              <p className="text-xs font-bold text-gray-500 mb-1">{m.label}</p>
              <p className={`text-2xl font-extrabold ${isUnlock ? mCfg.textColor : 'text-gray-900'}`}>
                {formatCurrency(m.cashback)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">cashback at {mCfg.rate}</p>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-3">Cashback calculated on total cycle spend</p>
    </motion.div>
  );
}

// ── Enhanced Cashback Preview ─────────────────────────────────────────────────
function EnhancedCashbackPreview({ spend, settings, tier }: { spend: number; settings: WalletSettings; tier: TierKey }) {
  const cfg = TIER_CONFIG[tier];
  const currentCashback = getEstimatedCashback(spend, settings);
  const silverCashback = spend > 0 ? parseFloat((spend * settings.silver_rate).toFixed(2)) : parseFloat((settings.silver_min * settings.silver_rate).toFixed(2));
  const goldCashback = spend > 0 ? parseFloat((spend * settings.gold_rate).toFixed(2)) : parseFloat((settings.gold_min * settings.gold_rate).toFixed(2));

  const scenarios = [
    {
      label: 'Current Estimate',
      sublabel: `At your ${cfg.label} rate (${cfg.rate})`,
      value: currentCashback,
      bg: `${cfg.bgLight}`,
      border: cfg.border,
      textColor: cfg.textColor,
      icon: cfg.icon,
      dim: false,
    },
    {
      label: tier === 'bronze' ? 'If Silver Reached' : 'Silver Scenario',
      sublabel: `At 10% on ${spend > 0 ? 'your spend' : formatCurrency(settings.silver_min)}`,
      value: silverCashback,
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      textColor: 'text-slate-600',
      icon: '🥈',
      dim: tier === 'gold',
    },
    {
      label: tier === 'gold' ? 'Your Gold Cashback' : 'If Gold Reached',
      sublabel: `At 15% on ${spend > 0 ? 'your spend' : formatCurrency(settings.gold_min)}`,
      value: goldCashback,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      textColor: 'text-yellow-600',
      icon: '🥇',
      dim: false,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-yellow-500" />
        <h2 className="font-bold text-gray-900">Cashback Scenarios</h2>
        <span className="ml-auto text-xs text-gray-400">if cycle ended today</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: s.dim ? 0.5 : 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className={`rounded-2xl p-3 text-center border ${s.bg} ${s.border}
              ${i === 0 ? 'border-2' : ''} transition-all`}
          >
            <span className="text-xl leading-none">{s.icon}</span>
            <p className={`text-[10px] font-bold uppercase text-gray-500 mt-1 mb-1 leading-tight`}>{s.label}</p>
            <p className={`text-xl font-extrabold ${s.textColor}`}>{formatCurrency(s.value)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.sublabel}</p>
          </motion.div>
        ))}
      </div>

      {spend === 0 && (
        <p className="text-xs text-gray-400 text-center mt-3">
          Based on minimum spend needed per tier — start shopping to see your real estimate
        </p>
      )}
    </motion.div>
  );
}

// ── Reward Journey (gamified tier cards) ──────────────────────────────────────
function RewardJourneyCards({ tier, spend, settings }: { tier: TierKey; spend: number; settings: WalletSettings }) {
  const tiers: TierKey[] = ['bronze', 'silver', 'gold'];
  const currentIdx = tiers.indexOf(tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-5 w-5 text-green-600" />
        <h2 className="font-bold text-gray-900">Reward Tiers</h2>
      </div>

      <div className="space-y-3">
        {tiers.map((t, i) => {
          const cfg = TIER_CONFIG[t];
          const isActive = t === tier;
          const isUnlocked = i < currentIdx;
          const isLocked = i > currentIdx;
          const spendToUnlock = t === 'silver' ? Math.max(0, settings.silver_min - spend) : Math.max(0, settings.gold_min - spend);
          const potentialCashback = t === 'silver'
            ? parseFloat((settings.silver_min * settings.silver_rate).toFixed(2))
            : parseFloat((settings.gold_min * settings.gold_rate).toFixed(2));

          return (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={`relative rounded-2xl border-2 p-4 overflow-hidden transition-all duration-300
                ${isActive ? `${cfg.bgLight} ${cfg.border} shadow-sm` : isUnlocked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
              )}

              <div className="flex items-center gap-3">
                {/* Icon */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                    ${isActive ? `bg-gradient-to-br ${cfg.gradient}` : isUnlocked ? 'bg-green-100' : 'bg-gray-100'}`}
                >
                  {isLocked ? <Lock className="h-5 w-5 text-gray-300" /> : <span>{cfg.icon}</span>}
                </motion.div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`font-extrabold text-sm ${isActive ? cfg.textColor : isUnlocked ? 'text-green-700' : 'text-gray-500'}`}>
                      {cfg.label} Tier
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-500 text-white rounded-full">Current</span>
                    )}
                    {isUnlocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Unlocked
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{cfg.minLabel}–{cfg.maxLabel} spend · {cfg.days}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-extrabold ${isActive ? cfg.textColor : isUnlocked ? 'text-green-600' : 'text-gray-300'}`}>
                    {cfg.rate}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold">cashback</p>
                </div>
              </div>

              {isLocked && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">
                      Unlock by spending <span className="text-gray-900 font-extrabold">{formatCurrency(spendToUnlock)}</span> more
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Potential cashback: <span className={`font-bold ${cfg.textColor}`}>{formatCurrency(potentialCashback)}</span>
                    </p>
                  </div>
                  <Link href="/products"
                    className={`flex-shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-gradient-to-r ${cfg.gradient} text-white`}
                  >
                    Unlock
                  </Link>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────
function Benefits() {
  const items = [
    { icon: <Wallet className="h-5 w-5" />, title: 'Use Wallet at Checkout', desc: 'Apply your balance to any KG order', color: 'bg-green-100 text-green-700' },
    { icon: <CreditCard className="h-5 w-5" />, title: 'Up to 50% Per Order', desc: 'Pay up to half your basket with wallet', color: 'bg-blue-100 text-blue-700' },
    { icon: <Gift className="h-5 w-5" />, title: 'Earn Cashback', desc: 'Rewards credited at every cycle end', color: 'bg-yellow-100 text-yellow-700' },
    { icon: <Star className="h-5 w-5" />, title: 'Exclusive Rewards', desc: 'Unlock higher rates as you spend more', color: 'bg-amber-100 text-amber-700' },
    { icon: <ShieldCheck className="h-5 w-5" />, title: 'Secure Wallet', desc: 'Protected and encrypted transactions', color: 'bg-emerald-100 text-emerald-700' },
    { icon: <Zap className="h-5 w-5" />, title: 'Fast Checkout', desc: 'One-tap wallet payment at checkout', color: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
    >
      <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500" />
        Wallet Benefits
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.07 }}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-gray-100 p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-200 cursor-default"
          >
            <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
              {item.icon}
            </div>
            <p className="text-xs font-bold text-gray-900 leading-tight">{item.title}</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-tight">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
function TxIcon({ type }: { type: WalletTransaction['type'] }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    cashback_credit:  { icon: <Sparkles className="h-3.5 w-3.5" />, bg: 'bg-yellow-100', color: 'text-yellow-600' },
    cashback_expiry:  { icon: <Clock className="h-3.5 w-3.5" />, bg: 'bg-orange-100', color: 'text-orange-500' },
    wallet_payment:   { icon: <ArrowDownLeft className="h-3.5 w-3.5" />, bg: 'bg-red-50', color: 'text-red-400' },
    refund_credit:    { icon: <ArrowUpRight className="h-3.5 w-3.5" />, bg: 'bg-green-100', color: 'text-green-600' },
    promotion_credit: { icon: <Gift className="h-3.5 w-3.5" />, bg: 'bg-green-100', color: 'text-green-600' },
    referral_credit:  { icon: <Star className="h-3.5 w-3.5" />, bg: 'bg-green-100', color: 'text-green-600' },
    manual_credit:    { icon: <ArrowUpRight className="h-3.5 w-3.5" />, bg: 'bg-green-100', color: 'text-green-600' },
    manual_debit:     { icon: <ArrowDownLeft className="h-3.5 w-3.5" />, bg: 'bg-red-50', color: 'text-red-400' },
  };
  const cfg = map[type] ?? { icon: <ArrowUpRight className="h-3.5 w-3.5" />, bg: 'bg-gray-100', color: 'text-gray-500' };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

function txAmountColor(type: WalletTransaction['type']) {
  if (type === 'cashback_credit') return 'text-yellow-600';
  if (type === 'cashback_expiry') return 'text-orange-500';
  const credits = ['refund_credit', 'promotion_credit', 'referral_credit', 'manual_credit'];
  return credits.includes(type) ? 'text-green-600' : 'text-red-500';
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isCredit = tx.amount > 0;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0"
    >
      <TxIcon type={tx.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{txTypeLabel(tx.type)}</p>
        {tx.description && <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">
            {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {tx.expires_at && !tx.expired_at && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
              exp {new Date(tx.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${txAmountColor(tx.type)}`}>
          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">bal {formatCurrency(tx.balance_after)}</p>
      </div>
    </motion.div>
  );
}

function EmptyTransactions() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShoppingBag className="h-8 w-8 text-gray-300" />
      </div>
      <p className="font-bold text-gray-700 mb-1">No transactions yet</p>
      <p className="text-sm text-gray-500 mb-5">Start shopping and unlock cashback rewards</p>
      <Link href="/products"
        className="inline-flex items-center gap-2 bg-[#0F6A38] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
      >
        <ShoppingBag className="h-4 w-4" /> Shop Now
      </Link>
    </motion.div>
  );
}

// ── Bottom CTA Banner ─────────────────────────────────────────────────────────
function CtaBanner({ tier, cashback, spend, settings }: { tier: TierKey; cashback: number; spend: number; settings: WalletSettings }) {
  const cfg = TIER_CONFIG[tier];
  const isGold = tier === 'gold';
  const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : null;
  const spendNeeded = tier === 'bronze' ? settings.silver_min - spend : tier === 'silver' ? settings.gold_min - spend : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="relative rounded-3xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B5D3B] via-[#0d7348] to-[#064e31]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-yellow-400/10 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 sm:p-8">
        <p className="text-emerald-300/70 text-xs font-bold uppercase tracking-widest mb-2">KG Rewards</p>
        <h2 className="text-white text-2xl font-extrabold mb-1">Shop More, Earn More</h2>
        <p className="text-emerald-300/80 text-sm mb-5">
          {nextTier
            ? `Just ${formatCurrency(Math.max(0, spendNeeded))} more to unlock ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} tier`
            : "You're at Gold — keep earning 15% on every order!"}
        </p>

        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { label: 'Current Tier', value: cfg.label, icon: cfg.icon },
            { label: 'Cashback Rate', value: cfg.rate, icon: '✨' },
            ...(cashback > 0 ? [{ label: 'Est. Reward', value: formatCurrency(cashback), icon: '🎁' }] : []),
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/20">
              <p className="text-emerald-300/70 text-[10px] font-semibold uppercase tracking-wide">{stat.label}</p>
              <p className="text-white font-bold text-sm flex items-center gap-1">
                <span>{stat.icon}</span> {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-white text-[#0B5D3B] font-extrabold text-sm px-6 py-3 rounded-xl hover:bg-green-50 transition-colors shadow-lg"
          >
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </Link>
          {!isGold && (
            <Link href="/products"
              className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-bold text-sm px-5 py-3 rounded-xl hover:border-white/60 transition-colors"
            >
              <Flame className="h-4 w-4 text-orange-300" /> View Offers
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Sticky motivation card ────────────────────────────────────────────────────
function StickyMotivationCard({ tier, spend, settings }: { tier: TierKey; spend: number; settings: WalletSettings }) {
  const [visible, setVisible] = useState(false);
  const cfg = TIER_CONFIG[tier];
  const isGold = tier === 'gold';
  const nextTierKey = tier === 'bronze' ? 'silver' : 'gold';
  const nextCfg = TIER_CONFIG[nextTierKey];
  const spendNeeded = tier === 'bronze' ? settings.silver_min - spend : settings.gold_min - spend;

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (isGold) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B5D3B] to-[#0d7348]" />
            <div className="relative z-10 flex items-center gap-3 px-4 py-3">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-2xl flex-shrink-0"
              >
                🎁
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-extrabold text-sm leading-tight">
                  {formatCurrency(Math.max(0, spendNeeded))} away from {nextCfg.label}
                </p>
                <p className="text-emerald-300 text-xs font-semibold">{nextCfg.rate} Cashback Waiting</p>
              </div>
              <Link href="/products"
                className="flex-shrink-0 bg-white text-[#0B5D3B] font-extrabold text-xs px-4 py-2 rounded-xl hover:bg-green-50 transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-36 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-40 w-full rounded-3xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading, profile } = useAuth();
  const { wallet, activeCycle, settings, loading: walletLoading } = useWallet();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [cashbackLogs, setCashbackLogs] = useState<WalletCashbackLog[]>([]);
  const [txSearch, setTxSearch] = useState('');

  useEffect(() => {
    if (authLoading || profile === undefined) return;
    if (!user) router.replace('/account');
  }, [authLoading, user, profile, router]);

  const loadTx = useCallback(async (page: number) => {
    if (!user) return;
    setTxLoading(true);
    try {
      const result = await fetchTransactions(user.id, page, PAGE_SIZE);
      setTransactions(result.transactions);
      setTxTotal(result.total);
    } finally {
      setTxLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || walletLoading) return;
    loadTx(0);
    fetchCashbackLogs(user.id).then(setCashbackLogs);
  }, [user, walletLoading, loadTx]);

  useEffect(() => { loadTx(txPage); }, [txPage, loadTx]);

  if (authLoading || profile === undefined || walletLoading) return <LoadingSkeleton />;
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balance = parseFloat(wallet?.balance?.toString() ?? '0');
  const spend = parseFloat(activeCycle?.spend?.toString() ?? '0');
  const tier = (settings ? getTier(spend, settings) : 'bronze') as TierKey;
  const cashback = settings ? getEstimatedCashback(spend, settings) : 0;
  const totalPages = Math.ceil(txTotal / PAGE_SIZE);

  const filteredTx = txSearch.trim()
    ? transactions.filter(tx =>
        txTypeLabel(tx.type).toLowerCase().includes(txSearch.toLowerCase()) ||
        (tx.description ?? '').toLowerCase().includes(txSearch.toLowerCase())
      )
    : transactions;

  const fallbackSettings: WalletSettings = settings ?? {
    bronze_rate: 0.02, silver_rate: 0.10, gold_rate: 0.15,
    bronze_days: 30, silver_days: 60, gold_days: 90,
    bronze_min: 0, bronze_max: 250,
    silver_min: 251, silver_max: 499,
    gold_min: 500, max_wallet_usage_percent: 0.50,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/account" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">KG Wallet</h1>
            <p className="text-[11px] text-gray-500">Loyalty rewards &amp; cashback</p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${TIER_CONFIG[tier].gradient} text-white shadow-sm`}>
              {TIER_CONFIG[tier].icon} {TIER_CONFIG[tier].label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Rotating messages */}
        <RotatingMessages />

        {/* Hero balance card */}
        <HeroCard balance={balance} tier={tier} activeCycle={activeCycle} spend={spend} settings={fallbackSettings} />

        {/* Reward thermometer */}
        <RewardThermometer tier={tier} spend={spend} settings={fallbackSettings} />

        {/* Reward upgrade card — main CTA */}
        <RewardUpgradeCard spend={spend} settings={fallbackSettings} tier={tier} />

        {/* Missing reward urgency banner */}
        <MissingRewardBanner spend={spend} settings={fallbackSettings} tier={tier} />

        {/* Live reward calculator */}
        <LiveRewardCalculator spend={spend} settings={fallbackSettings} tier={tier} />

        {/* Enhanced cashback scenarios */}
        <EnhancedCashbackPreview spend={spend} settings={fallbackSettings} tier={tier} />

        {/* Gamified reward journey */}
        <RewardJourneyCards tier={tier} spend={spend} settings={fallbackSettings} />

        {/* Benefits */}
        <Benefits />

        {/* Cashback history */}
        <AnimatePresence>
          {cashbackLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Cashback History
              </h2>
              <div>
                {cashbackLogs.map((log, i) => (
                  <motion.div key={log.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                    className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {TIER_LABELS[log.tier] ?? log.tier} — {(getCashbackRate(log.tier, fallbackSettings) * 100).toFixed(0)}% cashback
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.cycle_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                          {new Date(log.cycle_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">+{formatCurrency(log.cashback_amount)}</p>
                      <p className="text-[10px] text-gray-400">
                        {log.expired_at
                          ? <span className="text-red-400">Expired</span>
                          : `exp ${new Date(log.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction history */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Transaction History</h2>
            {txTotal > 0 && (
              <span className="ml-auto text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">{txTotal}</span>
            )}
          </div>

          {txTotal > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions…"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
          )}

          {txLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : filteredTx.length === 0 ? (
            <EmptyTransactions />
          ) : (
            <>
              <div>{filteredTx.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setTxPage(p => Math.max(0, p - 1))}
                    disabled={txPage === 0}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 disabled:text-gray-300 hover:text-gray-900 transition-colors px-3 py-2 rounded-xl hover:bg-gray-100 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <span className="text-xs text-gray-500 font-semibold">{txPage + 1} / {totalPages}</span>
                  <button
                    onClick={() => setTxPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={txPage >= totalPages - 1}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 disabled:text-gray-300 hover:text-gray-900 transition-colors px-3 py-2 rounded-xl hover:bg-gray-100 disabled:hover:bg-transparent"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Bottom CTA */}
        <CtaBanner tier={tier} cashback={cashback} spend={spend} settings={fallbackSettings} />
      </div>

      {/* Sticky motivation card */}
      {settings && <StickyMotivationCard tier={tier} spend={spend} settings={fallbackSettings} />}
    </div>
  );
}
