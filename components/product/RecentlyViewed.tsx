'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { blurDataURL } from '@/lib/utils/image';

export interface RecentlyViewedItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
}

const STORAGE_KEY = 'kerala-recently-viewed';
const MAX_ITEMS = 8;

export function trackProductView(product: RecentlyViewedItem) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];
    const filtered = items.filter((i) => i.id !== product.id);
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
  }
}

export default function RecentlyViewed({ currentProductId }: { currentProductId: string }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const all: RecentlyViewedItem[] = JSON.parse(stored);
        setItems(all.filter((i) => i.id !== currentProductId).slice(0, 6));
      }
    } catch {
    }
  }, [currentProductId]);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">Recently Viewed</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="flex-shrink-0 w-28 group"
          >
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="relative aspect-square bg-[#F8F6F2]">
                <Image
                  src={item.image_url?.startsWith('http') ? item.image_url : '/placeholder.webp'}
                  alt={item.name}
                  fill
                  sizes="112px"
                  className="object-contain p-2 group-hover:scale-105 transition-transform"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">
                  {item.name}
                </p>
                <p className="text-xs font-bold text-[#0B5D3B] mt-1">
                  £{Number(item.price).toFixed(2)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
