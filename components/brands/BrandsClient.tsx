'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, X, ChevronRight, TrendingUp, Tag } from 'lucide-react';

export interface BrandEntry {
  name: string;
  productCount: number;
  imageUrl: string | null;
}

// ── Brand avatar ──────────────────────────────────────────────────────────────
function BrandAvatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || name.charAt(0).toUpperCase();

  return (
    <div className={`${dim} rounded-2xl overflow-hidden border border-gray-100 bg-white flex-shrink-0`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="w-full h-full object-contain p-1.5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
          }}
        />
      ) : null}
      <div
        className={`w-full h-full ${imageUrl ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50`}
      >
        <span className={`${textSize} font-extrabold text-green-700 select-none`}>{initials}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BrandsClient({ brands }: { brands: BrandEntry[] }) {
  const [query, setQuery] = useState('');
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const popular = useMemo(
    () => [...brands].sort((a, b) => b.productCount - a.productCount).slice(0, 10),
    [brands]
  );

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return brands;
    const q = query.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, query, isSearching]);

  const grouped = useMemo(() => {
    const result: Record<string, BrandEntry[]> = {};
    for (const brand of filtered) {
      const letter = brand.name.charAt(0).toUpperCase();
      if (!result[letter]) result[letter] = [];
      result[letter].push(brand);
    }
    return result;
  }, [filtered]);

  const letters = Object.keys(grouped).sort();
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const scrollToLetter = (letter: string) => {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header + search ────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900 leading-none">Shop by Brand</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">{brands.length} brands available</p>
            </div>
            <span className="flex items-center gap-1 bg-green-50 border border-green-100 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Tag className="h-3 w-3" />
              {brands.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands…"
              className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]/30 focus:border-[#0B5D3B] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pb-6">

        {/* ── Search results ────────────────────────────────────────── */}
        {isSearching ? (
          <div className="px-4 pt-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Search className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold text-sm">No brands found</p>
                <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filtered.map((brand) => (
                    <BrandRow key={brand.name} brand={brand} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* ── Popular Brands ──────────────────────────────────── */}
            {popular.length > 0 && (
              <div className="pt-5 pb-2">
                <div className="flex items-center gap-2 px-4 mb-3">
                  <TrendingUp className="h-4 w-4 text-[#0B5D3B]" />
                  <h2 className="text-[14px] font-extrabold text-gray-900">Popular Brands</h2>
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    Top picks
                  </span>
                </div>

                <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1 snap-x snap-mandatory">
                  {popular.map((brand) => (
                    <Link
                      key={brand.name}
                      href={`/products?brand=${encodeURIComponent(brand.name)}`}
                      className="flex-shrink-0 snap-start flex flex-col items-center gap-1.5 w-[76px] active:opacity-70 transition-opacity"
                    >
                      <div className="w-[64px] h-[64px] rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm flex items-center justify-center">
                        {brand.imageUrl ? (
                          <img
                            src={brand.imageUrl}
                            alt={brand.name}
                            loading="lazy"
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
                            <span className="text-lg font-extrabold text-green-700 select-none">
                              {brand.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-800 text-center line-clamp-2 leading-tight w-full">
                        {brand.name}
                      </span>
                      <span className="text-[10px] text-gray-400 leading-none">
                        {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── A-Z Directory ────────────────────────────────────── */}
            <div className="mt-4">
              {/* Section header */}
              <div className="px-4 mb-2">
                <h2 className="text-[14px] font-extrabold text-gray-900">All Brands A–Z</h2>
              </div>

              {/* Quick letter index */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 pb-3">
                {allLetters.map((l) => {
                  const has = Boolean(grouped[l]);
                  return (
                    <button
                      key={l}
                      onClick={() => has && scrollToLetter(l)}
                      disabled={!has}
                      className={[
                        'flex-shrink-0 w-7 h-7 rounded-lg text-[11px] font-bold transition-colors',
                        has
                          ? 'bg-[#0B5D3B] text-white active:scale-90'
                          : 'bg-gray-100 text-gray-300 cursor-default',
                      ].join(' ')}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>

              {/* Grouped brand list */}
              <div className="px-4 space-y-4">
                {letters.map((letter) => (
                  <div
                    key={letter}
                    ref={(el) => { letterRefs.current[letter] = el; }}
                  >
                    {/* Letter header */}
                    <div className="flex items-center gap-2 mb-1.5 scroll-mt-[120px]">
                      <span className="w-7 h-7 rounded-lg bg-[#0B5D3B] flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0">
                        {letter}
                      </span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    {/* Brand rows */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                      {grouped[letter].map((brand) => (
                        <BrandRow key={brand.name} brand={brand} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Brand list row ────────────────────────────────────────────────────────────
function BrandRow({ brand }: { brand: BrandEntry }) {
  return (
    <Link
      href={`/products?brand=${encodeURIComponent(brand.name)}`}
      className="flex items-center gap-3 px-3.5 py-3 active:bg-green-50 transition-colors"
    >
      <BrandAvatar name={brand.name} imageUrl={brand.imageUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] text-gray-800 leading-snug truncate">
          {brand.name}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </Link>
  );
}
