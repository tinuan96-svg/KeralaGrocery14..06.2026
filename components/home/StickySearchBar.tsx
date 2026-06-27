'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// Watches a sentinel element by ID; slides in below the sticky header once
// the hero scrolls out of view.
export default function StickySearchBar({ sentinelId }: { sentinelId: string }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const el = document.getElementById(sentinelId);
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
      setQuery('');
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-md transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ top: '3.5rem' }} /* sits just below the h-14 header */
    >
      <div className="max-w-2xl mx-auto px-3 py-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search Kerala groceries — rice, spices, pickles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0B5D3B] hover:bg-green-700 text-white font-bold text-sm px-5 py-2.5 rounded-2xl flex-shrink-0 transition-colors active:scale-95"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
}
