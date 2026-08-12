'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/config/departments';

export default function MegaMenu() {
  const [openDept, setOpenDept] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const handleEnter = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDept(slug);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDept(null), 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <nav
      ref={navRef}
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
            className="absolute top-full left-0 mt-1 w-[680px] bg-white border border-[#d1ead9] rounded-2xl shadow-[0_8px_30px_rgba(11,93,59,0.12)] p-4 grid grid-cols-3 gap-x-4 gap-y-1"
            role="menu"
          >
            {DEPARTMENTS.map((dept) => (
              <div key={dept.slug} className="group/dept">
                <Link
                  href={`/products?filter=${dept.categorySlugs[0] || dept.slug}`}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#f4faf6] transition-colors"
                >
                  <span className="text-lg">{dept.emoji}</span>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 group-hover/dept:text-[#0B5D3B] transition-colors">
                      {dept.label}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">{dept.description}</p>
                  </div>
                </Link>
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
