'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/config/departments';

export default function MegaMenu() {
  const [openDept, setOpenDept] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDept(slug);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDept(null), 200);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <nav
      className="hidden lg:flex items-center gap-1 relative z-50"
      onMouseLeave={handleLeave}
      aria-label="Category navigation"
    >
      <Link
        href="/products"
        className="px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
      >
        Shop All
      </Link>

      <div className="relative">
        <button
          onMouseEnter={() => handleEnter('categories')}
          onFocus={() => setOpenDept('categories')}
          className="flex items-center gap-1 px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
          aria-expanded={openDept === 'categories'}
          aria-haspopup="true"
        >
          Categories
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDept === 'categories' ? 'rotate-180' : ''}`} />
        </button>

        {openDept === 'categories' && (
          <div
            onMouseEnter={() => handleEnter('categories')}
            onMouseLeave={handleLeave}
            className="absolute top-full left-0 mt-1 w-[720px] bg-white border border-[#d1ead9] rounded-2xl shadow-[0_8px_30px_rgba(11,93,59,0.12)] p-5 grid grid-cols-3 gap-x-5 gap-y-3"
            role="menu"
          >
            {DEPARTMENTS.filter((d) => d.subcategories.length > 0).map((dept) => (
              <div key={dept.slug} className="group/dept">
                <Link
                  href={`/products?filter=${dept.categorySlugs[0] || dept.slug}`}
                  className="flex items-center gap-2 mb-1.5"
                >
                  <span className="text-base">{dept.emoji}</span>
                  <p className="text-[13px] font-bold text-gray-900 group-hover/dept:text-[#0B5D3B] transition-colors">
                    {dept.label}
                  </p>
                </Link>
                <div className="pl-7 space-y-0.5">
                  {dept.subcategories.slice(0, 6).map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/products?search=${encodeURIComponent(sub.label)}`}
                      className="block text-[11px] text-gray-500 hover:text-[#0B5D3B] hover:underline transition-colors leading-relaxed"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/products?filter=deals"
        className="px-3.5 py-2 text-[13px] font-semibold text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
      >
        Deals
      </Link>
      <Link
        href="/products?sort=new"
        className="px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
      >
        New Arrivals
      </Link>
      <Link
        href="/brands"
        className="px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#0B5D3B] hover:bg-[#f4faf6] rounded-xl transition-all duration-150"
      >
        Brands
      </Link>
    </nav>
  );
}
