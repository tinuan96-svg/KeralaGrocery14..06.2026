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
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(25px) saturate(200%)',
        WebkitBackdropFilter: 'blur(25px) saturate(200%)',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.08)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[var(--nav-height,60px)] w-full max-w-screen-xl mx-auto px-2">

        <NavItem href="/" label="Home" active={isActive('/')} icon={<Home />} onClick={handleNavClick} />
        <NavItem href="/brands" label="Brands" active={isActive('/brands')} icon={<Store />} onClick={handleNavClick} />

        {/* Wallet — elevated center tab */}
        <Link
          href="/account/wallet"
          onClick={handleNavClick}
          className="flex flex-col items-center justify-center relative select-none active:scale-[0.88] transition-transform duration-200 px-2"
          aria-label="Wallet"
        >
          <div
            className={[
              'relative flex items-center justify-center w-14 h-10 rounded-2xl transition-all duration-300 mb-1',
              isWalletActive
                ? 'bg-[#0B5D3B] shadow-[0_8px_20px_rgba(11,93,59,0.3)] scale-110'
                : 'bg-[#0B5D3B]/5 border border-[#0B5D3B]/10',
            ].join(' ')}
          >
            <Wallet className={[
              'h-5 w-5 transition-all duration-300',
              isWalletActive ? 'text-white' : 'text-[#0B5D3B]',
            ].join(' ')} />
            {hasCashback && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-amber-500 shadow-sm animate-pulse" />
            )}
          </div>
          <span className={[
            'text-[10px] font-bold tracking-tight transition-colors duration-300 uppercase',
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
      className="flex flex-1 flex-col items-center justify-center gap-1.5 relative select-none active:scale-[0.90] transition-transform duration-200 min-w-0"
      aria-label={label}
    >
      <div className={`transition-all duration-300 ${
        active ? 'text-[#0B5D3B] scale-110' : 'text-gray-400 opacity-80'
      } [&>svg]:h-5 [&>svg]:w-5`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 uppercase ${
        active ? 'text-[#0B5D3B] opacity-100' : 'text-gray-400 opacity-60'
      }`}>
        {label}
      </span>
      {active && (
        <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#0B5D3B]" />
      )}
    </Link>
  );
}
