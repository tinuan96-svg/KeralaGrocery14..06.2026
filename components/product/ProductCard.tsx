'use client';

import type { ProductWithDetails } from '@/lib/types/database';
import type { RpcProduct } from '@/lib/services/rpcApiClient';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { useWallet } from '@/hooks/useWallet';
import { memo, useState, useMemo } from 'react';
import { getProductThumbnailSrc } from '@/lib/utils/image';
import { useProductPrice } from '@/hooks/useProductPrice';
import { haptics } from '@/lib/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: ProductWithDetails | RpcProduct;
  priority?: boolean;
  showCashback?: boolean;
  layout?: 'grid' | 'horizontal';
}

function isRpcProduct(p: any): p is RpcProduct {
  return 'display_title' in p || 'discount_pct' in p;
}

function ProductCardComponent({ product, priority = false, showCashback = true, layout = 'grid' }: ProductCardProps) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings, activeCycle } = useWallet();
  const [isAdding, setIsAdding] = useState(false);

  // Normalize data between RpcProduct and ProductWithDetails
  const normalized = useMemo(() => {
    if (isRpcProduct(product)) {
      return {
        id: product.id,
        name: product.display_title,
        slug: product.slug ?? product.id,
        price: product.price,
        originalPrice: product.original_price ?? product.price,
        discount: product.discount_pct,
        stock: product.stock,
        isBackorder: product.stock_status === 'backorder',
        image: product.image_url,
        category: product.category,
        brand: product.brand,
        isBestseller: false,
        isNewArrival: false,
      };
    } else {
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price || 0),
        originalPrice: product.original_price || Number(product.price || 0),
        discount: product.discount_percentage || 0,
        stock: product.stock,
        isBackorder: product.stock_status === 'backorder',
        image: getProductThumbnailSrc(product),
        category: product.category?.name,
        brand: product.brand?.name,
        isBestseller: product.is_bestseller,
        isNewArrival: product.is_new_arrival,
      };
    }
  }, [product]);

  // Real-time price and stock sync
  const { price, stock } = useProductPrice(normalized.id, normalized.price, normalized.stock);

  // Cashback calculation
  const potentialCashback = useMemo(() => {
    const rate = activeCycle
      ? (activeCycle.tier === 'gold' ? settings?.gold_rate : activeCycle.tier === 'silver' ? settings?.silver_rate : settings?.bronze_rate)
      : (settings?.bronze_rate ?? 0.01);
    return (price * (rate || 0.01)).toFixed(2);
  }, [price, activeCycle, settings]);

  const qty = getQuantity(normalized.id);
  const inWishlist = isInWishlist(normalized.id);

  const cartItem = {
    id: normalized.id,
    name: normalized.name,
    price,
    image_url: normalized.image || undefined,
    slug: normalized.slug,
  };

  const handleAdd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (stock <= 0 && !normalized.isBackorder) return;
    haptics.impact('medium');
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 1000);
    addToCart(cartItem, 1, normalized.isBackorder ? 999 : stock);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!normalized.isBackorder && qty >= stock) return;
    haptics.impact('light');
    addToCart(cartItem, 1, normalized.isBackorder ? 999 : stock);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    haptics.impact('light');
    if (qty === 1) removeFromCart(normalized.id);
    else if (qty > 1) addToCart(cartItem, -1, stock);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    haptics.impact('medium');
    toggleWishlist(cartItem);
  };

  return (
    <div className={`group relative bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col h-full overflow-hidden`}>

      {/* Image Area */}
      <Link href={`/products/${normalized.slug}`} className="block flex-shrink-0">
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_40%,_#f0f9f4_0%,_#ffffff_70%)] opacity-30 pointer-events-none" />
          <FallbackImage
            src={normalized.image || '/placeholder.webp'}
            alt={normalized.name}
            fill
            priority={priority}
            className="object-contain p-2"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            loading={priority ? undefined : 'lazy'}
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {normalized.discount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm leading-none">
                -{normalized.discount}%
              </span>
            )}
            {!normalized.discount && normalized.isBestseller && (
              <span className="bg-[#0B5D3B] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm leading-none">
                HOT
              </span>
            )}
          </div>

          {/* Stock overlays */}
          {stock > 0 && stock <= 5 && (
            <span className="absolute bottom-2 left-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center z-10 block shadow-sm">
              Only {stock} left!
            </span>
          )}
          {stock <= 0 && !normalized.isBackorder && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-[2px]">
              <span className="text-gray-600 font-semibold text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow">
                Out of Stock
              </span>
            </div>
          )}
          {stock <= 0 && normalized.isBackorder && (
            <div className="absolute bottom-2 left-1.5 right-1.5 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center z-10 block shadow-sm">
              Backorder
            </div>
          )}

          {/* Success micro-animation */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B5D3B]/10 backdrop-blur-[1px]"
              >
                <div className="bg-white rounded-full p-3 shadow-xl">
                  <CheckCircle className="w-8 h-8 text-[#0B5D3B]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center active:scale-90 transition-all z-20 border border-gray-100 hover:border-red-200 hover:bg-white"
      >
        <Heart className={`h-4 w-4 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Info Area */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3">

        {/* Category Label */}
        <div className="h-[18px] flex items-center overflow-hidden mb-1">
          {normalized.category && (
            <span className="inline-flex text-[9px] font-black uppercase tracking-tight text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0 leading-none truncate max-w-full">
              {normalized.category}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/products/${normalized.slug}`} className="mb-2 block group-hover:text-green-700 transition-colors">
          <h3 className="text-[12px] font-bold leading-[1.3] text-gray-800 line-clamp-2 h-[32px] overflow-hidden">
            {normalized.name}
          </h3>
        </Link>

        {/* Price & Cashback */}
        <div className="flex items-center justify-between gap-1 mb-3 h-6">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-black text-gray-900 leading-none">
              £{price.toFixed(2)}
            </span>
            {normalized.discount > 0 && normalized.originalPrice > price && (
              <span className="text-[10px] text-gray-400 line-through leading-none">
                £{normalized.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {showCashback && (
            <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
              <Wallet className="w-2.5 h-2.5 fill-emerald-600" />
              +£{potentialCashback}
            </div>
          )}
        </div>

        {/* Cart Action */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              disabled={stock <= 0 && !normalized.isBackorder}
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 bg-[#0B5D3B] hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold rounded-xl text-[11px] h-9 transition-all active:scale-95 shadow-sm shadow-green-900/10"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {stock > 0 || normalized.isBackorder ? 'ADD TO CART' : 'Out of Stock'}
            </button>
          ) : (
            <div
              className="flex items-center justify-between bg-green-50 rounded-xl border-2 border-[#0B5D3B] h-9 px-1"
              role="group"
            >
              <button
                onClick={handleDecrease}
                className="w-7 h-7 rounded-lg bg-white border border-green-400 flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-all active:scale-90 shadow-sm"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-black text-[#0B5D3B] text-[14px] w-6 text-center tabular-nums">{qty}</span>
              <button
                onClick={handleIncrease}
                className="w-7 h-7 rounded-lg bg-[#0B5D3B] flex items-center justify-center hover:bg-green-700 transition-all active:scale-90 text-white shadow-sm"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardComponent, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.stock === next.product.stock &&
  ('image_url' in prev.product && 'image_url' in next.product ? prev.product.image_url === next.product.image_url : true) &&
  prev.priority === next.priority &&
  prev.showCashback === next.showCashback &&
  prev.layout === next.layout
);

ProductCard.displayName = 'ProductCard';
export default ProductCard;
