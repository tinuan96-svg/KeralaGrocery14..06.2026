'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/context/CartContext';
import { getFrequentlyBoughtTogether } from '@/lib/services/recommendationService';
import type { RpcProduct } from '@/lib/services/rpcApiClient';
import { blurDataURL } from '@/lib/utils/image';

interface Props {
  mainProduct: RpcProduct;
}

export default function FrequentlyBoughtTogether({ mainProduct }: Props) {
  const [bundle, setBundle] = useState<RpcProduct[]>([]);
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    getFrequentlyBoughtTogether(mainProduct.id, mainProduct.category, 2)
      .then(setBundle);
  }, [mainProduct.id, mainProduct.category]);

  if (bundle.length === 0) return null;

  const totalBundlePrice = mainProduct.price + bundle.reduce((sum, p) => sum + p.price, 0);

  const handleAddBundle = () => {
    // Add main product
    addToCart({
      id: mainProduct.id,
      name: mainProduct.display_title,
      price: mainProduct.price,
      image_url: mainProduct.image_url ?? undefined,
      slug: mainProduct.slug ?? mainProduct.id,
    });

    // Add bundle products
    bundle.forEach(p => {
      addToCart({
        id: p.id,
        name: p.display_title,
        price: p.price,
        image_url: p.image_url ?? undefined,
        slug: p.slug ?? p.id,
      });
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Frequently Bought Together</h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Main Product */}
          <div className="relative w-24 h-24 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
            <Image
              src={mainProduct.image_url || '/placeholder.webp'}
              alt={mainProduct.display_title}
              fill
              className="object-contain p-2"
              placeholder="blur"
              blurDataURL={blurDataURL}
            />
          </div>

          {bundle.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-gray-300" />
              <div className="relative w-24 h-24 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                <Image
                  src={p.image_url || '/placeholder.webp'}
                  alt={p.display_title}
                  fill
                  className="object-contain p-2"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          <div>
            <p className="text-sm text-gray-500 mb-1">Bundle Price</p>
            <p className="text-2xl font-black text-[#0B5D3B]">£{totalBundlePrice.toFixed(2)}</p>
          </div>

          <Button
            onClick={handleAddBundle}
            className={`w-full h-12 font-bold rounded-xl transition-all ${
              added ? 'bg-green-600' : 'bg-yellow-400 hover:bg-yellow-500 text-green-900'
            }`}
          >
            {added ? (
              <><Check className="mr-2 h-5 w-5" /> Added Bundle!</>
            ) : (
              <><ShoppingCart className="mr-2 h-5 w-5" /> Add Bundle to Cart</>
            )}
          </Button>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Items in this bundle:</p>
            <ul className="text-xs text-gray-600 list-disc list-inside">
              <li>{mainProduct.display_title}</li>
              {bundle.map(p => <li key={p.id}>{p.display_title}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
