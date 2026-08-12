'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { blurDataURL } from '@/lib/utils/image';
import type { ProductWithDetails } from '@/lib/types/database';

interface StickyCartBarProps {
  product: ProductWithDetails;
  triggerRef: React.RefObject<HTMLElement>;
}

export default function StickyCartBar({ product, triggerRef }: StickyCartBarProps) {
  const [visible, setVisible] = useState(false);
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = cart.find((item) => item.id === product.id);
  const currentQuantity = cartItem?.quantity || 0;

  const cartPayload = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url || product.enhanced_image_url || undefined,
    slug: product.slug,
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );

    const el = triggerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [triggerRef]);

  const handleAdd = () => addToCart(cartPayload);
  const handleIncrease = () => {
    if (currentQuantity < product.stock) updateQuantity(product.id, currentQuantity + 1);
  };
  const handleDecrease = () => {
    if (currentQuantity > 1) updateQuantity(product.id, currentQuantity - 1);
    else removeFromCart(product.id);
  };

  const rawImg = product.image_url?.startsWith('http') ? product.image_url : null;
  const displayImage = rawImg || (product.enhanced_image_url?.startsWith('http') ? product.enhanced_image_url : null) || '/placeholder.webp';
  const price = Number(product.price).toFixed(2);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-[#F8F6F2] border border-gray-100">
              <Image
                src={displayImage}
                alt={product.name}
                fill
                sizes="40px"
                className="object-contain p-1"
                placeholder="blur"
                blurDataURL={blurDataURL}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
              <p className="text-[#0B5D3B] font-bold text-sm">£{price}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {currentQuantity === 0 ? (
                <button
                  onClick={handleAdd}
                  disabled={product.stock === 0}
                  className="flex items-center gap-2 bg-[#0B5D3B] hover:bg-[#094d31] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              ) : (
                <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={handleDecrease}
                    className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-gray-900">
                    {currentQuantity}
                  </span>
                  <button
                    onClick={handleIncrease}
                    disabled={currentQuantity >= product.stock}
                    className="w-9 h-9 flex items-center justify-center bg-[#0B5D3B] text-white hover:bg-[#094d31] disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
