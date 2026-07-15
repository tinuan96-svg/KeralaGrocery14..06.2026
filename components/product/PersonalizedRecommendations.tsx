'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ChevronRight, Star } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  price: number;
  rating: number;
  review_count: number;
  discount_percentage: number;
}

export default function PersonalizedRecommendations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [type, setType] = useState<'personalized' | 'trending' | 'new_arrivals'>('trending');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/personalized-recommendations`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProducts(data.recommendations);
          setType(data.type);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  if (loading || products.length === 0) return null;

  const titles = {
    personalized: 'Recommended for You',
    trending: 'Trending Now',
    new_arrivals: 'New Arrivals for You'
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {titles[type]}
              </h2>
              <p className="text-sm text-gray-500 font-medium">Based on your preferences</p>
            </div>
          </div>
          <Link
            href="/products"
            className="text-sm font-bold text-[#0B5D3B] hover:underline flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group flex flex-col bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-green-200 transition-all duration-300"
            >
              <div className="relative aspect-square bg-white p-4">
                <Image
                  src={product.image_url || '/placeholder.webp'}
                  alt={product.name}
                  fill
                  className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                />
                {product.discount_percentage > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                    -{Math.round(product.discount_percentage)}%
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col gap-1.5">
                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-[#0B5D3B] transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-black text-gray-500">{product.rating}</span>
                  <span className="text-[10px] text-gray-400 font-bold">({product.review_count})</span>
                </div>
                <div className="mt-auto pt-2">
                  <p className="text-lg font-black text-green-700">£{product.price.toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
