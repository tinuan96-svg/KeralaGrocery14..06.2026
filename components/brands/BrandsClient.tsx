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
    <div className={`${dim} rounded-2xl overflow-hidden border border-gray-100 bg-white flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
          }}
        />
      ) : null}
      <div
        className={`w-full h-full ${imageUrl ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]`}
      >
        <span className={`${textSize} font-black text-[#0B5D3B] select-none`}>{initials}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BrandsClient({ brands }: { brands: BrandEntry[] }) {
  const [query, setQuery] = useState('');
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const popular = useMemo(
    () => [...brands].sort((a, b) => b.productCount - a.productCount).slice(0, 12),
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
    const el = letterRefs.current[letter];
    if (el) {
      const offset = 140; // sticky header height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7]">

      {/* ── Header + Search ───────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B5D3B] flex items-center justify-center shadow-lg shadow-[#0B5D3B]/20">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 leading-none tracking-tight">Our Brands</h1>
                <p className="text-[12px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{brands.length} Trusted Partners</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-4 w-4 text-gray-400 group-focus-within:text-[#0B5D3B] transition-colors" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search premium Kerala brands…"
                className="w-full h-12 pl-11 pr-11 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#0B5D3B] transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <X className="h-3 w-3 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Floating A-Z Index (Desktop Only) ── */}
        {!isSearching && (
          <div className="hidden lg:block bg-gray-50/50 border-t border-gray-100 py-2">
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-1.5">
              {allLetters.map((l) => {
                const has = Boolean(grouped[l]);
                return (
                  <button
                    key={l}
                    onClick={() => has && scrollToLetter(l)}
                    disabled={!has}
                    className={`
                      w-8 h-8 rounded-xl text-[12px] font-black transition-all
                      ${has
                        ? 'bg-white text-gray-700 hover:bg-[#0B5D3B] hover:text-white shadow-sm border border-gray-100'
                        : 'text-gray-300 opacity-50 cursor-not-allowed'}
                    `}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto pb-24">

        {/* ── Search results ────────────────────────────────────────── */}
        {isSearching ? (
          <div className="px-4 pt-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-gray-100 shadow-sm mt-4">
                <div className="w-20 h-20 rounded-[30px] bg-gray-50 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-200" />
                </div>
                <p className="text-gray-900 font-black text-lg">No brands found</p>
                <p className="text-gray-400 font-medium text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">
                  Showing {filtered.length} Brand{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {filtered.map((brand) => (
                    <BrandCard key={brand.name} brand={brand} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Popular Brands ──────────────────────────────────── */}
            {popular.length > 0 && (
              <div className="pt-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-black text-gray-900 leading-none tracking-tight">Popular Choices</h2>
                    <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Most loved by community</p>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory">
                  {popular.map((brand) => (
                    <Link
                      key={brand.name}
                      href={`/products?brand=${encodeURIComponent(brand.name)}`}
                      className="flex-shrink-0 snap-start group flex flex-col items-center gap-2.5 w-[100px] active:scale-95 transition-transform"
                    >
                      <div className="w-[88px] h-[88px] rounded-[32px] overflow-hidden border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center transition-all group-hover:shadow-xl group-hover:shadow-emerald-500/10 group-hover:-translate-y-1">
                        {brand.imageUrl ? (
                          <img
                            src={brand.imageUrl}
                            alt={brand.name}
                            loading="lazy"
                            className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]">
                            <span className="text-2xl font-black text-[#0B5D3B] select-none">
                              {brand.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full px-1">
                        <p className="text-[12px] font-bold text-gray-900 line-clamp-1 group-hover:text-[#0B5D3B] transition-colors">{brand.name}</p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          Authentic
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── A-Z Index Mobile ── */}
            <div className="lg:hidden px-4 mb-4">
               <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2">
                {allLetters.map((l) => {
                  const has = Boolean(grouped[l]);
                  return (
                    <button
                      key={l}
                      onClick={() => has && scrollToLetter(l)}
                      disabled={!has}
                      className={`
                        flex-shrink-0 w-9 h-9 rounded-xl text-[12px] font-black transition-all
                        ${has
                          ? 'bg-white text-gray-900 border border-gray-200 shadow-sm active:bg-[#0B5D3B] active:text-white'
                          : 'bg-gray-50 text-gray-300 cursor-default opacity-40'}
                      `}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Grouped brand list ────────────────────────────────── */}
            <div className="px-4 space-y-10 mt-4">
              {letters.map((letter) => (
                <div
                  key={letter}
                  ref={(el) => { letterRefs.current[letter] = el; }}
                  className="scroll-mt-32"
                >
                  {/* Letter header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-[20px] bg-white border-2 border-gray-100 flex items-center justify-center text-lg font-black text-[#0B5D3B] shadow-sm">
                      {letter}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>

                  {/* Brand Grid */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {grouped[letter].map((brand) => (
                      <BrandCard key={brand.name} brand={brand} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BrandCard({ brand }: { brand: BrandEntry }) {
  return (
    <Link
      href={`/products?brand=${encodeURIComponent(brand.name)}`}
      className="group flex items-center gap-4 p-3 bg-white rounded-[24px] border border-gray-100 hover:border-emerald-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300"
    >
      <BrandAvatar name={brand.name} imageUrl={brand.imageUrl} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-[15px] text-gray-900 leading-tight truncate group-hover:text-[#0B5D3B] transition-colors">
                  {brand.name}
                </p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Explore Brand
                </p>
              </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#0B5D3B] transition-colors" />
      </div>
    </Link>
  );
}
