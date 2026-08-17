'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/context/CartContext';
import type { ProductWithDetails } from '@/lib/types/database';

interface MobileStickyBarProps {
  product: ProductWithDetails;
  triggerRef: React.RefObject<HTMLElement>;
}

export default function MobileStickyBar({ product, triggerRef }: MobileStickyBarProps) {
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
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -20px 0px' }
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-100 shadow-2xl px-4 py-3 safe-area-pb"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 text-sm">
              <p className="font-bold text-gray-900 truncate">{product.name}</p>
              <p className="text-[#0B5D3B] font-bold">£{Number(product.price).toFixed(2)}</p>
            </div>

            {currentQuantity === 0 ? (
              <button
                onClick={handleAdd}
                disabled={product.stock === 0}
                className="flex items-center gap-2 bg-[#0B5D3B] hover:bg-[#094d31] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            ) : (
              <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
                <button
                  onClick={handleDecrease}
                  className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="w-10 text-center font-bold text-gray-900">
                  {currentQuantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={currentQuantity >= product.stock}
                  className="w-11 h-11 flex items-center justify-center bg-[#0B5D3B] text-white hover:bg-[#094d31] disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
