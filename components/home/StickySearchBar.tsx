'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LiveSearch from '@/components/home/LiveSearch';

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
      className={`fixed left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-b border-emerald-50 shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ top: 'var(--header-height, 3.5rem)' }} /* sits just below the h-14 header */
    >
      <div className="max-w-2xl mx-auto px-4 py-3">
        <LiveSearch
          placeholder="Search Kerala groceries — rice, spices, pickles…"
          className="shadow-sm"
        />
      </div>
    </div>
  );
}
