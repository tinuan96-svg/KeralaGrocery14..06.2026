'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ChevronRight, Star } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { Separator } from '@/components/ui/separator';

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
    <section className="py-12 bg-transparent relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[18px] bg-white shadow-sm border border-amber-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">
                {titles[type]}
              </h2>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Based on your preferences</p>
            </div>
          </div>
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white border border-gray-100 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            Explore More <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group flex flex-col bg-white rounded-[28px] border border-gray-100 overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-[#0B5D3B]/20 transition-all duration-500"
            >
              <div className="relative aspect-square p-3">
                <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-gray-50/50">
                  <Image
                    src={product.image_url || '/placeholder.webp'}
                    alt={product.name}
                    fill
                    className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 45vw, 20vw"
                  />
                  {product.discount_percentage > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                      -{Math.round(product.discount_percentage)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 pt-1 flex-1 flex flex-col gap-2">
                <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#0B5D3B] transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-auto">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-gray-700">{product.rating}</span>
                  </div>
                  <Separator orientation="vertical" className="h-2 bg-gray-200" />
                  <p className="text-[15px] font-black text-[#0B5D3B]">£{product.price.toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
  );
}
