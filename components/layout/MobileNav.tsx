'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Wallet, Grid2x2, User } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/lib/context/AuthContext';
import { haptics } from '@/lib/utils/haptics';

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();

  const balance = parseFloat(wallet?.balance?.toString() ?? '0');
  const hasCashback = user && !walletLoading && balance > 0;

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleNavClick = () => {
    haptics.impact('light');
  };

  const isWalletActive = pathname?.startsWith('/account/wallet') || pathname?.startsWith('/wallet');
  const isProfileActive = (pathname?.startsWith('/account') || pathname?.startsWith('/profile')) && !isWalletActive;

  return (
    <nav
      className="kg-mobile-nav lg:hidden fixed-gpu"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.06)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[var(--nav-height,64px)] w-full max-w-screen-xl mx-auto px-2">

        <NavItem href="/" label="Home" active={isActive('/')} icon={<Home />} onClick={handleNavClick} />
        <NavItem href="/brands" label="Brands" active={isActive('/brands')} icon={<Store />} onClick={handleNavClick} />

        {/* Wallet — center featured tab */}
        <Link
          href="/account/wallet"
          onClick={handleNavClick}
          style={{ touchAction: 'manipulation' }}
          className="flex flex-col items-center justify-center relative select-none active:scale-[0.88] transition-transform duration-200"
          aria-label="Wallet"
        >
          {/* Elevated pill with dynamic glow */}
          <div
            style={{
              backgroundColor: isWalletActive ? '#0B5D3B' : 'rgba(11,93,59,0.05)',
              boxShadow: isWalletActive ? '0 8px 24px rgba(11,93,59,0.25)' : undefined
            }}
            className={[
              'relative flex items-center justify-center w-14 h-11 rounded-[22px] transition-all duration-300 mb-1',
              isWalletActive ? 'scale-110' : 'border border-white/50 shadow-sm',
            ].join(' ')}
          >
            <Wallet className={[
              'h-[22px] w-[24px] transition-all duration-300',
              isWalletActive ? 'text-white' : 'text-[#0B5D3B]',
            ].join(' ')} />
            {hasCashback && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-amber-500 shadow-sm animate-pulse" />
            )}
          </div>
          <span className={[
            'text-[10px] font-black tracking-tight transition-colors duration-300 uppercase',
            isWalletActive ? 'text-[#0B5D3B]' : 'text-gray-400',
          ].join(' ')}>
            Wallet
          </span>
        </Link>

        <NavItem href="/categories" label="Explore" active={isActive('/categories')} icon={<Grid2x2 />} onClick={handleNavClick} />
        <NavItem
          href="/account"
          label="Profile"
          active={isProfileActive}
          icon={<User />}
          onClick={handleNavClick}
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  active,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{ touchAction: 'manipulation' }}
      className="flex flex-1 flex-col items-center justify-center gap-1.5 relative select-none active:scale-[0.90] transition-transform duration-200 min-w-0"
      aria-label={label}
    >
      <div className={`transition-all duration-300 ${
        active ? 'text-[#0B5D3B] scale-110' : 'text-gray-400'
      } [&>svg]:h-[24px] [&>svg]:w-[24px]`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black tracking-tight transition-all duration-300 uppercase ${
        active ? 'text-[#0B5D3B] opacity-100' : 'text-gray-400 opacity-60'
      }`}>
        {label}
      </span>
      {active && (
        <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#0B5D3B]" />
      )}
    </Link>
  );
}
