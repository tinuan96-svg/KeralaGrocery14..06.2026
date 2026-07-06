'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartCount } from '@/hooks/useCartOptimized';
import { useEffect, useRef, useState } from 'react';

export default function FloatingCartButton() {
  const cartCount = useCartCount();
  const prevCount = useRef(cartCount);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBounce(false);
      // Force re-trigger by cycling off then on
      const t1 = requestAnimationFrame(() => {
        setBounce(true);
        const t2 = setTimeout(() => setBounce(false), 650);
        return () => clearTimeout(t2);
      });
      return () => cancelAnimationFrame(t1);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  return (
    <Link
      href="/cart"
      aria-label={cartCount > 0 ? `View cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}` : 'View cart'}
      className={[
        'lg:hidden fixed-gpu',
        'w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full',
        'bg-[#0B5D3B] text-white',
        'flex items-center justify-center',
        'ka-glow',
        'active:scale-90 transition-transform duration-150',
        bounce ? 'animate-cart-bounce' : '',
      ].join(' ')}
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 16px)',
        right: 'calc(16px + env(safe-area-inset-right, 0px))',
        zIndex: 1100,
      }}
    >
      <ShoppingCart className="h-[22px] w-[22px]" />

      {/* Live quantity badge */}
      {cartCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] rounded-full bg-[#FF7A00] border-[2.5px] border-white flex items-center justify-center text-[10px] font-black text-white px-1 leading-none"
        >
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Link>
  );
}
