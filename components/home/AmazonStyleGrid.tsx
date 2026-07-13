'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchActiveGridCards } from '@/lib/services/homepageGridService';
import type { HomepageGridCard } from '@/lib/types/database';

const DEMO_CARDS: HomepageGridCard[] = [
  {
    id: 'demo-1',
    title: 'Top Offers',
    layout_type: 'grid_2x2',
    display_order: 1,
    is_active: true,
    items: [
      { image_url: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?auto=format&fit=crop&q=80&w=300', label: 'Kerala Rice', link: '/products?category=rice', badge: '15% off' },
      { image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ef058ec?auto=format&fit=crop&q=80&w=300', label: 'Fresh Spices', link: '/products?category=spices', badge: '37% off' },
      { image_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=300', label: 'Snacks', link: '/products?category=snacks', badge: '24% off' },
      { image_url: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?auto=format&fit=crop&q=80&w=300', label: 'Coconut Oil', link: '/products?category=oils', badge: '40% off' },
    ],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'demo-2',
    title: 'New Arrivals',
    layout_type: 'grid_2x2',
    display_order: 2,
    is_active: true,
    items: [
      { image_url: 'https://images.unsplash.com/photo-1563245332-692e73976108?auto=format&fit=crop&q=80&w=300', label: 'Jackfruit Chips', link: '/products' },
      { image_url: 'https://images.unsplash.com/photo-1589113103503-49ef83d91810?auto=format&fit=crop&q=80&w=300', label: 'Mango Pickle', link: '/products' },
      { image_url: 'https://images.unsplash.com/photo-1544333346-646736342531?auto=format&fit=crop&q=80&w=300', label: 'Chai Tea', link: '/products' },
      { image_url: 'https://images.unsplash.com/photo-1599307767316-776533da540d?auto=format&fit=crop&q=80&w=300', label: 'Rice Flour', link: '/products' },
    ],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'demo-3',
    title: 'Popular Categories',
    layout_type: 'grid_2x2',
    display_order: 3,
    is_active: true,
    items: [
      { image_url: 'https://images.unsplash.com/photo-1582408921715-18e7806365c1?auto=format&fit=crop&q=80&w=300', label: 'Sweets', link: '/categories' },
      { image_url: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&q=80&w=300', label: 'Ready to Eat', link: '/categories' },
      { image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=300', label: 'Frozen Food', link: '/categories' },
      { image_url: 'https://images.unsplash.com/photo-1567113463300-102550d235e5?auto=format&fit=crop&q=80&w=300', label: 'Beverages', link: '/categories' },
    ],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'demo-4',
    title: '30% Off Home Storage',
    layout_type: 'single',
    display_order: 4,
    is_active: true,
    items: [
      { image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800', label: null, link: '/products' },
    ],
    created_at: '',
    updated_at: '',
  }
];

export default function AmazonStyleGrid() {
  const [cards, setCards] = useState<HomepageGridCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveGridCards().then(data => {
      if (data.length > 0) {
        setCards(data);
      } else {
        setCards(DEMO_CARDS);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 h-[420px] animate-pulse rounded-sm shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.id} className="bg-white p-4 flex flex-col h-full shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-1">{card.title}</h2>

            <div className="flex-1">
              {card.layout_type === 'grid_2x2' ? (
                <div className="grid grid-cols-2 gap-3 h-full">
                  {card.items.slice(0, 4).map((item, idx) => (
                    <Link key={idx} href={item.link} className="flex flex-col group">
                      <div className="relative aspect-square overflow-hidden bg-gray-50 mb-1">
                        <Image
                          src={item.image_url}
                          alt={item.label || ''}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {item.badge && (
                          <div className="absolute bottom-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1 py-0.5 rounded-sm">
                            {item.badge}
                          </div>
                        )}
                      </div>
                      {item.label && (
                        <p className="text-[12px] text-gray-700 font-medium group-hover:text-blue-700 truncate">
                          {item.label}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href={card.items[0]?.link || '#'} className="block h-full relative group">
                  <div className="relative h-full min-h-[300px] w-full overflow-hidden">
                    <Image
                      src={card.items[0]?.image_url || '/placeholder.webp'}
                      alt={card.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  </div>
                </Link>
              )}
            </div>

            <div className="mt-4">
              <Link
                href={card.layout_type === 'grid_2x2' ? card.items[0]?.link || '#' : card.items[0]?.link || '#'}
                className="text-sm text-blue-600 hover:text-red-700 hover:underline transition-colors font-medium"
              >
                {card.layout_type === 'grid_2x2' ? 'See more' : 'Shop now'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
