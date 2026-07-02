import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ShieldCheck, Truck, Star, RotateCcw, Leaf, Award } from 'lucide-react';
import { usePlatform } from '@/hooks/useNative';

const SHOP_LINKS = [
  ['/products', 'All Products'],
  ['/categories', 'Categories'],
  ['/brands', 'Brands'],
  ['/products?filter=deals', 'Deals & Offers'],
  ['/products?sort=new', 'New Arrivals'],
];

const HELP_LINKS = [
  ['/delivery-policy', 'Delivery Policy'],
  ['/refund-policy', 'Refund & Returns'],
  ['/contact', 'Contact Us'],
  ['/about-us', 'About Us'],
  ['/blog', 'Blog & Guides'],
];

const LEGAL_LINKS = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms & Conditions'],
  ['/delivery-policy', 'Delivery Policy'],
  ['/refund-policy', 'Refund Policy'],
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: 'Secure Payments' },
  { icon: Truck,       text: 'Fast UK Delivery' },
  { icon: Award,       text: '4.9★ Rated' },
  { icon: Leaf,        text: '100% Authentic' },
  { icon: RotateCcw,   text: 'Easy Returns' },
];

export default function Footer() {
  const platform = usePlatform();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="bg-[#071f12] text-gray-300">

      {/* Trust strip */}
      <div className="border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-4">
            {TRUST_ITEMS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs font-semibold text-white/60">
                <div className="w-6 h-6 rounded-lg bg-[#0B5D3B]/40 border border-[#6FDB2F]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3 w-3 text-[#6FDB2F]" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0B5D3B] flex items-center justify-center flex-shrink-0">
                <Image
                  src="/logo_KG_Trans.png"
                  alt="Kerala Grocery UK"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-white font-extrabold text-sm leading-tight">Kerala Grocery UK</p>
                <p className="text-[#6FDB2F] text-[10px] font-semibold tracking-wide uppercase">Authentic Kerala Taste</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Trusted source for authentic Kerala groceries. Quality products, fresh weekly stock, fast UK delivery.
            </p>
            <div className="space-y-2 text-xs text-gray-400 mb-4">
              <a href="mailto:admin@keralagrocery.com" className="flex items-center gap-2 hover:text-white transition-colors group">
                <Mail className="h-3.5 w-3.5 text-[#6FDB2F] flex-shrink-0" />
                admin@keralagrocery.com
              </a>
              <a href="tel:07769867549" className="flex items-center gap-2 hover:text-white transition-colors group">
                <Phone className="h-3.5 w-3.5 text-[#6FDB2F] flex-shrink-0" />
                07769 867 549
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#6FDB2F] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">21 Weald Bridge Nursery, Essex, CM16 6AX</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { href: 'https://www.facebook.com/keralagroceryk', Icon: Facebook, label: 'Facebook' },
                { href: 'https://www.instagram.com/keralagroceryk', Icon: Instagram, label: 'Instagram' },
                { href: 'https://twitter.com/keralagroceryuk', Icon: Twitter, label: 'Twitter' },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-xl bg-white/8 hover:bg-[#0B5D3B] border border-white/10 hover:border-[#6FDB2F]/40 flex items-center justify-center transition-all duration-200"
                >
                  <Icon className="h-3.5 w-3.5 text-white/70" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-xs text-gray-400 hover:text-white hover:translate-x-0.5 transition-all duration-150 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Help</h4>
            <ul className="space-y-2.5">
              {HELP_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-xs text-gray-400 hover:text-white hover:translate-x-0.5 transition-all duration-150 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* App + payment */}
          <div>
            {mounted && platform === 'android' && (
              <div className="kg-google-play-section">
                <h4 className="text-white font-bold text-sm mb-4">Get The App</h4>
                <p className="text-xs text-gray-400 mb-3">Shop on the go with our Android app.</p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-[#0B5D3B]/60 border border-white/15 hover:border-[#6FDB2F]/30 rounded-2xl px-4 py-2.5 transition-all duration-200 mb-5 group"
                >
                  <span className="text-xl leading-none">🤖</span>
                  <div>
                    <p className="text-[9px] text-gray-400 leading-none mb-0.5">Get it on</p>
                    <p className="text-sm font-bold text-white leading-tight">Play Store</p>
                  </div>
                </a>
              </div>
            )}

            <h4 className="text-white font-bold text-xs mb-2">We Accept</h4>
            <div className="flex flex-wrap gap-1.5">
              {['VISA', 'Mastercard', 'Maestro', 'KG Wallet'].map((method) => (
                <span
                  key={method}
                  className="text-[10px] font-semibold text-gray-400 bg-white/8 border border-white/12 px-2 py-1 rounded-lg"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-600">
            &copy; 2026 Tasty Kerala Ltd. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            {LEGAL_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
