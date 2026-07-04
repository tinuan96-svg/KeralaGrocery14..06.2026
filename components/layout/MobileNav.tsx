'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chrome as Home, Store, Wallet, Grid2x2, User } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/lib/context/AuthContext';

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();

  const balance = parseFloat(wallet?.balance?.toString() ?? '0');
  const hasCashback = user && !walletLoading && balance > 0;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const isWalletActive =
    pathname.startsWith('/wallet') || pathname.startsWith('/account/wallet');

  return (
    <nav
      className="kg-mobile-nav lg:hidden fixed-gpu"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid #d1ead9',
        boxShadow: '0 -4px 32px rgba(11,93,59,0.09)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-[var(--nav-height,60px)] max-w-2xl mx-auto">

        <NavItem href="/" label="Home" active={isActive('/')} icon={<Home />} />
        <NavItem href="/brands" label="Brands" active={isActive('/brands')} icon={<Store />} />

        {/* Wallet — center featured tab */}
        <Link
          href="/account/wallet"
          style={{ touchAction: 'manipulation' }}
          className="flex flex-col items-center justify-center relative select-none active:scale-[0.92] transition-transform duration-100"
          aria-label="Wallet"
        >
          {/* Elevated pill */}
          <div className={[
            'relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-200 mb-[2px]',
            isWalletActive
              ? 'bg-[#0B5D3B] shadow-brand'
              : 'bg-[#f4faf6] border border-[#d1ead9]',
          ].join(' ')}>
            <Wallet className={[
              'h-[18px] w-[18px] transition-colors duration-200',
              isWalletActive ? 'text-white' : 'text-[#0B5D3B]',
            ].join(' ')} />
            {hasCashback && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#FF7A00] shadow-sm" />
            )}
          </div>
          <span className={[
            'text-[10px] font-bold transition-colors duration-200',
            isWalletActive ? 'text-[#0B5D3B]' : 'text-gray-400',
          ].join(' ')}>
            Wallet
          </span>
          {isWalletActive && (
            <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#0B5D3B]" />
          )}
        </Link>

        <NavItem href="/categories" label="Categories" active={isActive('/categories')} icon={<Grid2x2 />} />
        <NavItem
          href="/account"
          label="Account"
          active={isActive('/account') && !isWalletActive}
          icon={<User />}
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
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ touchAction: 'manipulation' }}
      className="flex flex-col items-center justify-center gap-[2px] relative select-none active:scale-[0.92] transition-transform duration-100"
      aria-label={label}
    >
      <div className={[
        'relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200',
        active ? 'bg-[#f4faf6]' : '',
      ].join(' ')}>
        <span className={`transition-colors duration-200 [&>svg]:h-[18px] [&>svg]:w-[18px] ${
          active ? 'text-[#0B5D3B]' : 'text-gray-400'
        }`}>
          {icon}
        </span>
      </div>
      <span className={`text-[10px] font-bold leading-none transition-colors duration-200 ${
        active ? 'text-[#0B5D3B]' : 'text-gray-400'
      }`}>
        {label}
      </span>
      {active && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0B5D3B]" />
      )}
    </Link>
  );
}
