'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { getTier } from '@/lib/services/walletService';

// Hide chip when already on the wallet page or when user is not logged in
const HIDDEN_PATHS = ['/account/wallet', '/wallet'];

const TIER_STYLE: Record<string, { dot: string }> = {
  bronze: { dot: 'bg-amber-400' },
  silver: { dot: 'bg-slate-300' },
  gold:   { dot: 'bg-yellow-300' },
};

export default function WalletChip() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { wallet, activeCycle, settings, loading } = useWallet();

  // Only show for logged-in users on mobile, and not on the wallet page itself
  if (!user || HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const balance = parseFloat(wallet?.balance?.toString() ?? '0');
  const spend   = parseFloat(activeCycle?.spend?.toString() ?? '0');
  const tier    = settings ? getTier(spend, settings) : 'bronze';
  const dot     = TIER_STYLE[tier]?.dot ?? 'bg-green-400';
  const hasBalance = balance > 0;

  // Don't flash a chip while loading — skip render until data is ready
  if (loading) return null;

  return (
    <Link
      href="/account/wallet"
      aria-label="Open wallet"
      className={`
        lg:hidden fixed z-[999]
        bottom-[76px] left-3
        flex items-center gap-1.5
        bg-[#0B5D3B] text-white
        pl-2.5 pr-3 py-1.5
        rounded-full
        shadow-lg shadow-green-900/30
        active:scale-95 transition-transform duration-100
        select-none
      `}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Icon with tier dot */}
      <div className="relative flex-shrink-0">
        <Wallet className="h-4 w-4 text-white" />
        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0B5D3B] ${dot}`} />
      </div>

      {/* Balance or earn label */}
      <span className="text-[12px] font-extrabold leading-none">
        {hasBalance ? `£${balance.toFixed(2)}` : 'Earn Cashback'}
      </span>
    </Link>
  );
}
