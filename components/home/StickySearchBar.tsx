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
      className={`fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-md transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ top: '3.5rem' }} /* sits just below the h-14 header */
    >
      <div className="max-w-2xl mx-auto px-3 py-2">
        <LiveSearch
          placeholder="Search Kerala groceries — rice, spices, pickles…"
        />
      </div>
    </div>
  );
}
