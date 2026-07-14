'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, User, Package, LogOut, Search, LogIn, X, ShieldCheck, Wallet, Phone, ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartCount } from '@/hooks/useCartOptimized';
import { useWishlistCount } from '@/hooks/useWishlistOptimized';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import LiveSearch from '@/components/home/LiveSearch';
import MiniCart from './MiniCart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { label: 'Products', href: '/products' },
  { label: 'Categories', href: '/categories' },
  { label: 'Brands', href: '/brands' },
  { label: 'Recipes', href: '/recipes' },
  { label: 'Deals', href: '/products?filter=deals' },
];

export default function Header() {
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="kg-web-header sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#d1ead9] shadow-[0_2px_16px_rgba(11,93,59,0.07)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >

      {/* ── Mobile search overlay ─────────────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="md:hidden absolute inset-x-0 top-0 z-10 bg-white flex items-center px-3 gap-2"
          style={{ height: 'calc(60px + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <LiveSearch
            className="flex-1"
            onSearch={() => setMobileSearchOpen(false)}
            placeholder="Search rice, spices..."
            inputClassName="border-[#0B5D3B]"
          />
          <button
            onClick={() => { setMobileSearchOpen(false); }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* ── Main header row ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex h-[60px] items-center justify-between gap-2 sm:gap-3">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group min-w-0" aria-label="Kerala Grocery UK Home">
            <div className="relative w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] flex-shrink-0">
              <Image
                src="/logo_KG_Trans.png"
                alt="Kerala Grocery"
                width={40}
                height={40}
                className="object-contain w-full h-full drop-shadow-sm"
                priority
              />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-extrabold text-[13px] sm:text-[15px] text-[#0a3d22] tracking-tight group-hover:text-[#0B5D3B] transition-colors truncate">
                Kerala Grocery
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#6FDB2F] tracking-wide uppercase">
                UK Delivery
              </span>
            </div>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-shrink-0" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop search ── */}
          <LiveSearch
            className="flex-1 max-w-[380px] hidden md:block"
            placeholder="Search Kerala groceries…"
          />

          {/* ── Action buttons ── */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">

            {/* Phone — desktop only */}
            <a
              href="tel:07902205199"
              title="Customer Care – Available 9AM–9PM"
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] transition-all group"
              aria-label="Call customer care"
            >
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#6FDB2F]" />
              <span className="text-[11px] font-semibold whitespace-nowrap">07902205199</span>
            </a>

            {/* Mobile search trigger */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f4faf6] transition-colors"
              aria-label="Open search"
            >
              <Search className="h-[18px] w-[18px] text-gray-600" />
            </button>

            {/* Wishlist — desktop */}
            <Link
              href="/account"
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-[#f4faf6] transition-colors relative"
              aria-label="Wishlist"
            >
              <Heart className={`h-5 w-5 transition-colors ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-white shadow-sm">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart — mobile (icon only) + desktop (full) */}
            <button
              onClick={() => setShowMiniCart(true)}
              className="flex lg:hidden w-9 h-9 items-center justify-center rounded-xl hover:bg-[#f4faf6] transition-colors relative"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingCart className="h-[18px] w-[18px] text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center text-[9px] font-black bg-[#0B5D3B] text-white rounded-full border-2 border-white shadow-sm">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <Link
              href="/cart"
              className="hidden lg:flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#0d6b44] text-white transition-all duration-200 shadow-brand-sm hover:shadow-brand relative active:scale-95"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 ? (
                <>
                  <span className="text-xs font-extrabold">{cartCount}</span>
                  <span className="hidden xl:inline text-xs font-semibold opacity-80">items</span>
                </>
              ) : (
                <span className="text-xs font-bold">Cart</span>
              )}
            </Link>

            {/* Auth — desktop */}
            {!loading && (
              <div className="hidden lg:block">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 h-10 px-3 rounded-xl hover:bg-[#f4faf6] transition-colors border border-[#d1ead9] hover:border-[#0B5D3B]/30"
                        aria-label="User menu"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#0B5D3B] flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-white" />
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl border border-[#d1ead9] shadow-lifted p-1">
                      <div className="px-3 py-2.5 border-b border-[#d1ead9] mb-1">
                        <p className="font-bold text-gray-900 text-sm truncate">{user.email}</p>
                        {user.app_metadata?.is_admin && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B5D3B] bg-[#f4faf6] border border-[#d1ead9] rounded-full px-2 py-0.5 mt-1">
                            <ShieldCheck className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="cursor-pointer rounded-xl font-medium text-gray-700 focus:text-[#0B5D3B] focus:bg-[#f4faf6]">
                          <User className="mr-2 h-4 w-4 text-gray-400" />My Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account/wallet" className="cursor-pointer rounded-xl font-medium text-gray-700 focus:text-[#0B5D3B] focus:bg-[#f4faf6]">
                          <Wallet className="mr-2 h-4 w-4 text-[#6FDB2F]" />Wallet
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders" className="cursor-pointer rounded-xl font-medium text-gray-700 focus:text-[#0B5D3B] focus:bg-[#f4faf6]">
                          <Package className="mr-2 h-4 w-4 text-gray-400" />My Orders
                        </Link>
                      </DropdownMenuItem>
                      {user.app_metadata?.is_admin && (
                        <>
                          <DropdownMenuSeparator className="bg-[#d1ead9]" />
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className="cursor-pointer text-[#0B5D3B] focus:text-[#0B5D3B] focus:bg-[#f4faf6] font-bold rounded-xl">
                              <ShieldCheck className="mr-2 h-4 w-4" />Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-[#d1ead9]" />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-xl font-medium">
                        <LogOut className="mr-2 h-4 w-4" />Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/account">
                    <button className="btn-brand text-white text-sm px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 h-10">
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Login</span>
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <MiniCart open={showMiniCart} onOpenChange={setShowMiniCart} />
    </header>
  );
}
