'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { ProductWithDetails } from '@/lib/types/database';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { memo } from 'react';
import { getProductImageSrc } from '@/lib/utils/image';
import { useProductPrice } from '@/hooks/useProductPrice';
import { haptics } from '@/lib/utils/haptics';

interface ProductCardProps {
  product: ProductWithDetails;
  priority?: boolean;
  showCashback?: boolean;
}

function ProductCardComponent({ product, priority = false }: ProductCardProps) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

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
    if (stock === 0) return;
    haptics.impact('medium'); // (Suggestion 2)
    addToCart(cartItem);
  };
  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock === 0) return;
    haptics.impact('light'); // (Suggestion 2)
    addToCart(cartItem);
  };
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.impact('light'); // (Suggestion 2)
    if (qty === 1) removeFromCart(product.id);
    else if (qty > 1) addToCart(cartItem, -1);
  };
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.impact('medium'); // (Suggestion 2)
    toggleWishlist(cartItem);
  };

  return (
    <div className="group card-kg flex flex-col h-full overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 rounded-2xl border border-transparent hover:border-[#d1ead9]">

      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block flex-shrink-0">
        <div className="relative w-full overflow-hidden rounded-t-[inherit]" style={{ aspectRatio: '1 / 1' }}>
          {/* Subtle radial highlight — removed bg-white so transparent images can shine */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_#edfaf3_0%,_#fff_70%)] opacity-40 pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Image
              src={displayImage}
              alt={`${displayName} - Kerala Grocery`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              priority={priority}
              className="object-contain transition-transform duration-500 scale-[0.98] group-hover:scale-[1.05]"
              loading={priority ? undefined : 'lazy'}
            />
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-1.5 left-1.5 badge-deal z-20 leading-none">
              -{discount}%
            </span>
          )}

          {/* Status badges */}
          {!discount && product.is_bestseller && (
            <span className="absolute top-1.5 left-1.5 bg-[#0B5D3B] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow z-20 leading-none">
              Hot
            </span>
          )}
          {!discount && !product.is_bestseller && product.is_new_arrival && (
            <span className="absolute top-1.5 left-1.5 bg-sky-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow z-20 leading-none">
              New
            </span>
          )}

          {/* Low stock */}
          {stock > 0 && stock <= 5 && (
            <span className="absolute bottom-1.5 left-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full text-center shadow z-20 block">
              Only {stock} left!
            </span>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center active:scale-90 transition-all z-20 border border-[#d1ead9] hover:border-red-200"
          >
            <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>

          {/* Out of stock overlay */}
          {stock === 0 && (
            <div className="absolute inset-0 bg-white/85 flex items-center justify-center z-20 backdrop-blur-[2px]">
              <span className="text-gray-600 font-semibold text-xs bg-white border border-[#d1ead9] px-3 py-1.5 rounded-full shadow-sm">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 px-2 pt-1.5 pb-2">

        {/* Category */}
        <div className="h-[14px] flex items-center overflow-hidden mb-1">
          {product.category?.name && (
            <span className="inline-flex text-[8px] font-black uppercase tracking-tight text-[#0B5D3B] bg-[#f4faf6] border border-[#d1ead9] rounded-full px-1.5 py-0 leading-none truncate max-w-full">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/products/${product.slug}`} className="mb-1 block">
          <h3 className="text-[11px] font-bold leading-[1.3] text-gray-800 hover:text-[#0B5D3B] transition-colors line-clamp-2 h-[28px] overflow-hidden">
            {displayName}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline h-6 mb-1.5">
          <span className="text-xs font-bold text-gray-900 mr-0.5 mt-0.5">£</span>
          <span className="text-[17px] font-black text-gray-900 leading-none">
            {Math.floor(price)}
          </span>
          <span className="text-[10px] font-black text-gray-900 leading-none align-top ml-0.5">
            {(price % 1).toFixed(2).substring(2)}
          </span>
          {discount > 0 && (
            <span className="text-[10px] text-gray-400 line-through leading-none ml-2">
              £{originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Cart */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              disabled={stock === 0}
              onClick={handleAdd}
              aria-label={`Add ${product.name} to cart`}
              className="w-full flex items-center justify-center gap-1 bg-[#0B5D3B] hover:bg-[#0d6b44] disabled:bg-gray-100 disabled:text-gray-400 text-white font-black text-[10px] h-7 rounded-lg transition-all active:scale-95 shadow-sm"
            >
              {stock === 0 ? (
                'Out of Stock'
              ) : (
                <>ADD</>
              )}
            </button>
          ) : (
            <div
              className="flex items-center justify-between bg-[#f4faf6] rounded-lg border border-[#0B5D3B] h-7 px-1"
              role="group"
            >
              <button
                onClick={handleDecrease}
                className="w-5 h-5 rounded-md bg-white border border-[#d1ead9] flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all active:scale-90"
              >
                <Minus className="h-2 w-2" />
              </button>
              <span className="font-black text-[#0B5D3B] text-[11px]">{qty}</span>
              <button
                onClick={handleIncrease}
                className="w-5 h-5 rounded-md bg-[#0B5D3B] flex items-center justify-center hover:bg-[#0d6b44] transition-all active:scale-90 text-white"
              >
                <Plus className="h-2 w-2" />
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
  prev.product.image_url === next.product.image_url &&
  prev.product.image_main === next.product.image_main &&
  prev.priority === next.priority &&
  prev.showCashback === next.showCashback
);

ProductCard.displayName = 'ProductCard';
export default ProductCard;
