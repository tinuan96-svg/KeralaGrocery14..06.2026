'use client';

import { useRef } from 'react';
import { ShoppingCart, Heart, Zap, Minus, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { useRouter } from 'next/navigation';
import type { ProductWithDetails } from '@/lib/types/database';

interface ProductActionsProps {
  product: ProductWithDetails;
  onAddToCart?: () => void;
}

export default function ProductActions({ product, onAddToCart }: ProductActionsProps) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const router = useRouter();
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const cartItem = cart.find((item) => item.id === product.id);
  const currentQuantity = cartItem?.quantity || 0;
  const inWishlist = isInWishlist(product.id);
  const isOutOfStock = product.stock === 0;

  const cartPayload = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url || product.enhanced_image_url || undefined,
    slug: product.slug,
  };

  const handleAddToCart = () => {
    addToCart(cartPayload);
    onAddToCart?.();
  };

  const handleIncrease = () => {
    if (currentQuantity < product.stock) {
      updateQuantity(product.id, currentQuantity + 1);
    }
  };

  const handleDecrease = () => {
    if (currentQuantity > 1) {
      updateQuantity(product.id, currentQuantity - 1);
    } else {
      removeFromCart(product.id);
    }
  };

  const handleBuyNow = () => {
    if (currentQuantity === 0) {
      addToCart(cartPayload);
    }
    router.push('/checkout');
  };

  const handleWishlist = () => {
    toggleWishlist(cartPayload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {currentQuantity === 0 ? (
            <motion.div
              key="add-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1"
            >
              <Button
                ref={addBtnRef}
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full h-13 bg-[#0B5D3B] hover:bg-[#094d31] text-white font-bold rounded-xl text-base py-4 gap-2 shadow-sm transition-all active:scale-95"
              >
                <ShoppingCart className="w-5 h-5" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="qty-control"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center gap-3"
            >
              <div className="flex items-center bg-[#F8F6F2] rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={handleDecrease}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="w-12 text-center font-bold text-lg text-gray-900">
                  {currentQuantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={currentQuantity >= product.stock}
                  className="w-12 h-12 flex items-center justify-center bg-[#0B5D3B] text-white hover:bg-[#094d31] disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[#0B5D3B] font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                <Check className="w-3.5 h-3.5" />
                In cart
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleWishlist}
          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all active:scale-95 ${
            inWishlist
              ? 'border-red-400 bg-red-50 text-red-500'
              : 'border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-400'
          }`}
        >
          <Heart className={`w-5 h-5 ${inWishlist ? 'fill-red-500' : ''}`} />
        </button>
      </div>

      {!isOutOfStock && (
        <Button
          onClick={handleBuyNow}
          variant="outline"
          className="w-full h-13 border-2 border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white font-bold rounded-xl text-base py-4 gap-2 transition-all active:scale-95"
        >
          <Zap className="w-5 h-5" />
          Buy Now
        </Button>
      )}
    </div>
  );
}
