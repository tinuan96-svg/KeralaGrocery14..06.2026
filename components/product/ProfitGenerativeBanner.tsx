'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Plus, ShoppingCart, Sparkles } from 'lucide-react';
import { getHighMarginProducts } from '@/lib/services/recommendationService';
import type { RpcProduct } from '@/lib/services/rpcApiClient';
import { useCart } from '@/lib/context/CartContext';
import { useToast } from '@/hooks/use-toast';

export default function ProfitGenerativeBanner() {
  const [products, setProducts] = useState<RpcProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    getHighMarginProducts(4).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const handleQuickAdd = (p: RpcProduct) => {
    addToCart({
      id: p.id,
      name: p.display_title,
      price: p.price,
      image_url: p.image_url ?? undefined,
      slug: p.slug ?? p.id,
    });
    toast({
      title: 'Added to cart',
      description: `${p.display_title} has been added.`,
    });
  };

  if (loading || products.length === 0) return null;

  return (
    <section className="my-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-green-800 shadow-xl shadow-emerald-900/10">
      <div className="px-6 py-8 md:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Premium Selection
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              Handpicked <span className="text-emerald-200 text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-white">Top Values</span>
            </h2>
            <p className="text-emerald-50/70 text-sm max-w-lg font-medium">
              Authentic Kerala favorites with exceptional quality and value, selected for our community.
            </p>
          </div>

          <Link
            href="/products?sort=popular"
            className="flex-shrink-0 bg-white text-emerald-800 px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-50 transition-all shadow-lg active:scale-95"
          >
            Shop All Popular
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="group bg-white/95 backdrop-blur-sm rounded-[28px] p-3 flex flex-col h-full border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300">
              <Link href={`/products/${p.slug ?? p.id}`} className="block relative aspect-square overflow-hidden rounded-[20px] bg-gray-50 mb-3">
                <Image
                  src={p.image_url || '/placeholder.webp'}
                  alt={p.display_title}
                  fill
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                  unoptimized
                />
              </Link>

              <div className="flex-1 flex flex-col px-1">
                <Link href={`/products/${p.slug ?? p.id}`}>
                  <h3 className="text-[12px] font-bold text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {p.display_title}
                  </h3>
                </Link>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-700 leading-none">
                    £{p.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleQuickAdd(p)}
                    className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md active:scale-90"
                    aria-label="Add to cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
