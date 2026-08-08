'use client';

import Link from 'next/link';
import { FallbackImage } from '@/components/ui/FallbackImage';
import { Heart, Plus, Minus, ShoppingCart, CircleCheck as CheckCircle } from 'lucide-react';
import type { ProductWithDetails } from '@/lib/types/database';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { memo, useState } from 'react';
import { getProductImageSrc } from '@/lib/utils/image';
import { useProductPrice } from '@/hooks/useProductPrice';
import { haptics } from '@/lib/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: ProductWithDetails;
  priority?: boolean;
  showCashback?: boolean;
}

function ProductCardComponent({ product, priority = false }: ProductCardProps) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);

  // Real-time price and stock with SWR (Suggestion 1)
  const { price, stock } = useProductPrice(product.id, Number(product.price || 0), Number(product.stock || 0));

  const discount = product.discount_percentage || 0;
  const originalPrice = product.original_price || price;
  const displayImage = getProductImageSrc(product);

  const brandName = product.brand?.name ?? '';
  const displayName =
    brandName && !product.name.toLowerCase().includes(brandName.toLowerCase())
      ? `${product.name} ${brandName}`
      : product.name;

  const qty = getQuantity(product.id);
  const inWishlist = isInWishlist(product.id);

  const cartItem = {
    id: product.id,
    name: product.name,
    price,
    image_url: product.image_url || undefined,
    slug: product.slug,
  };

  const handleAdd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!product.backorder_enabled && stock <= 0) return;
    haptics.impact('medium'); // (Suggestion 2)
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 1000);
    addToCart(cartItem, 1, stock, product.backorder_enabled);
  };
  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.backorder_enabled && qty >= stock) return;
    haptics.impact('light'); // (Suggestion 2)
    addToCart(cartItem, 1, stock, product.backorder_enabled);
  };
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.impact('light'); // (Suggestion 2)
    if (qty === 1) removeFromCart(product.id);
    else if (qty > 1) addToCart(cartItem, -1, stock, product.backorder_enabled);
  };
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.impact('medium'); // (Suggestion 2)
    toggleWishlist(cartItem);
  };

  return (
    <div className="group relative bg-white rounded-[24px] border border-gray-100 hover:border-green-200 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-1.5 flex flex-col h-full overflow-hidden">

      {/* ── Image container with subtle depth ──────────────────────────── */}
      <Link href={`/products/${product.slug}`} className="block flex-shrink-0 p-2 sm:p-3">
        <div className="relative w-full rounded-[20px] overflow-hidden bg-gray-50/50" style={{ aspectRatio: '1 / 1' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
          <FallbackImage
            src={displayImage}
            alt={displayName}
            fill
            priority={priority}
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />

          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-10 shadow-lg shadow-red-500/20">
              {discount}% OFF
            </span>
          )}
          {stock > 0 && stock <= 5 && (
            <span className="absolute bottom-2 left-2 right-2 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-lg text-center z-10 block border border-white/20">
              Only {stock} left!
            </span>
          )}
          {!product.backorder_enabled && stock === 0 && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 backdrop-blur-[1px]">
              <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest bg-white/90 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Wishlist — elegant floating button */}
      <button
        onClick={handleWishlist}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center active:scale-90 transition-all z-20 border border-gray-100 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
      >
        <Heart className={`h-4 w-4 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
      </button>

      {/* ── Info — cleaned up typography ──────────────────────────────── */}
      <div className="flex flex-col flex-1 px-3.5 pb-4">

        {/* Category row */}
        <div className="h-[18px] flex items-center gap-1.5 overflow-hidden mb-1.5">
          {product.category?.name && (
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-green-700/70">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Name — bolder, clearer */}
        <Link href={`/products/${product.slug}`} className="mb-2 block">
          <h3 className="text-[13px] font-bold leading-[1.35] text-gray-900 group-hover:text-[#0B5D3B] transition-colors line-clamp-2 h-[35px] overflow-hidden">
            {displayName}
          </h3>
        </Link>

        {/* Price — high contrast */}
        <div className="flex items-baseline gap-1.5 h-6 mb-3">
          <span className="text-[16px] font-black text-[#0B5D3B] tracking-tight">
            £{price.toFixed(2)}
          </span>
          {discount > 0 && (
            <span className="text-[11px] text-gray-400 line-through decoration-gray-300">
              £{originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Cart button — "App-style" integrated feel */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              disabled={!product.backorder_enabled && stock === 0}
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 bg-[#0B5D3B] hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black rounded-xl text-[11px] h-9 transition-all active:scale-[0.97] shadow-lg shadow-green-900/10 hover:shadow-green-900/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{!product.backorder_enabled && stock === 0 ? 'Out of Stock' : 'ADD'}</span>
            </button>
          ) : (
            <div
              className="flex items-center justify-between bg-green-50 rounded-xl border-2 border-[#0B5D3B]/20 h-9 p-1 animate-scale-in"
              role="group"
            >
              <button
                onClick={handleDecrease}
                className="w-7 h-7 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:text-red-600 transition-all active:scale-90"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-black text-[#0B5D3B] text-[13px]">{qty}</span>
              <button
                onClick={handleIncrease}
                disabled={!product.backorder_enabled && qty >= stock}
                className="w-7 h-7 rounded-lg bg-[#0B5D3B] flex items-center justify-center hover:bg-green-700 transition-all active:scale-90 text-white disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  );
}

const ProductCard = memo(ProductCardComponent, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.stock === next.product.stock &&
  prev.product.image_url === next.product.image_url &&
  prev.product.image_main === next.product.image_main &&
  prev.priority === next.priority &&
  prev.showCashback === next.showCashback
);

ProductCard.displayName = 'ProductCard';
export default ProductCard;
