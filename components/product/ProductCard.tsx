'use client';

import Link from 'next/link';
import { Heart, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { ProductWithDetails } from '@/lib/types/database';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { memo } from 'react';
import { getProductSrcSet } from '@/lib/utils/image';

interface ProductCardProps {
  product: ProductWithDetails;
  priority?: boolean;
  showCashback?: boolean;
}

function ProductCardComponent({ product, priority = false }: ProductCardProps) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const stock = Number(product.stock || 0);
  const price = Number(product.price || 0);
  const discount = product.discount_percentage || 0;
  const originalPrice = product.original_price || price;
  const { webp: webpSrc, jpeg: jpegSrc } = getProductSrcSet(product);
  const displayImage = webpSrc ?? jpegSrc ?? '/placeholder.webp';

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
    addToCart(cartItem);
  };
  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock === 0) return;
    addToCart(cartItem);
  };
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 1) removeFromCart(product.id);
    else if (qty > 1) addToCart(cartItem, -1);
  };
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(cartItem);
  };

  return (
    <div className="group card-kg flex flex-col h-full overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 rounded-2xl border border-transparent hover:border-[#d1ead9]">

      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block flex-shrink-0">
        <div className="relative w-full bg-white overflow-hidden rounded-t-[inherit]" style={{ aspectRatio: '4 / 3' }}>
          {/* Subtle radial highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_#edfaf3_0%,_#fff_70%)] pointer-events-none" />

          <picture className="absolute inset-0 flex items-center justify-center z-10">
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            {jpegSrc && <source srcSet={jpegSrc} type="image/jpeg" />}
            <img
              src={displayImage}
              alt={`${displayName} - Kerala Grocery`}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : 'auto'}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.webp'; }}
              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.07]"
            />
          </picture>

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
      <div className="flex flex-col flex-1 px-2.5 pt-1.5 pb-2.5">

        {/* Category */}
        <div className="h-[16px] flex items-center overflow-hidden mb-1">
          {product.category?.name && (
            <span className="inline-flex text-[9px] font-bold text-[#0B5D3B] bg-[#f4faf6] border border-[#d1ead9] rounded-full px-1.5 py-px leading-none truncate max-w-full">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/products/${product.slug}`} className="mb-1 block">
          <h3 className="text-[12px] font-semibold leading-[1.3] text-gray-800 hover:text-[#0B5D3B] transition-colors line-clamp-2 overflow-hidden">
            {displayName}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-[14px] font-extrabold text-[#0B5D3B] leading-none">
            £{price.toFixed(2)}
          </span>
          {discount > 0 && (
            <span className="text-[10px] text-gray-400 line-through leading-none">
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
              className="w-full flex items-center justify-center gap-1.5 btn-brand disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none text-[12px] h-8 rounded-xl font-bold"
            >
              {stock === 0 ? (
                'Out of Stock'
              ) : (
                <><ShoppingCart className="h-3 w-3" /> Add to Cart</>
              )}
            </button>
          ) : (
            <div
              className="flex items-center justify-between bg-[#f4faf6] rounded-xl border-2 border-[#0B5D3B] h-8 px-1"
              role="group"
              aria-label="Quantity controls"
            >
              <button
                onClick={handleDecrease}
                aria-label="Decrease quantity"
                className="w-6 h-6 rounded-lg bg-white border border-[#d1ead9] flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all active:scale-90"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="font-extrabold text-[#0B5D3B] text-[13px]" aria-label={`Quantity: ${qty}`}>
                {qty}
              </span>
              <button
                onClick={handleIncrease}
                aria-label="Increase quantity"
                className="w-6 h-6 rounded-lg bg-[#0B5D3B] flex items-center justify-center hover:bg-[#0d6b44] transition-all active:scale-90 text-white"
              >
                <Plus className="h-2.5 w-2.5" />
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
