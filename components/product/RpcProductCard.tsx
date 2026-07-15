'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import type { RpcProduct } from '@/lib/services/rpcApiClient';


interface Props {
  product: RpcProduct;
  priority?: boolean;
}

function RpcProductCardComponent({ product, priority = false }: Props) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const slug = product.slug ?? product.id;
  const qty = getQuantity(product.id);
  const inWishlist = isInWishlist(product.id);
  const imgSrc = product.image_url || '/placeholder.webp';

  const cartProduct = {
    id: product.id,
    name: product.display_title,
    price: product.price,
    image_url: product.image_url ?? undefined,
    slug,
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock || product.stock <= 0) return;
    addToCart(cartProduct, 1, product.stock);
  };
  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty >= product.stock) return;
    addToCart(cartProduct, 1, product.stock);
  };
  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 1) removeFromCart(product.id);
    else addToCart(cartProduct, -1, product.stock);
  };
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(cartProduct);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col h-full overflow-hidden">

      {/* ── Fixed-height image container ──────────────────────────── */}
      <Link href={`/products/${slug}`} className="block flex-shrink-0">
        <div className="relative w-full overflow-hidden p-3" style={{ aspectRatio: '1 / 1' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_40%,_#f0f9f4_0%,_#ffffff_70%)] opacity-30 pointer-events-none" />
          <Image
            src={imgSrc}
            alt={product.display_title}
            fill
            priority={priority}
            className="object-contain transition-transform duration-500 scale-100 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />

          {product.discount_pct > 0 && (
            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
              -{product.discount_pct}%
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="absolute bottom-2 left-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center z-10 block">
              Only {product.stock} left!
            </span>
          )}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-[2px]">
              <span className="text-gray-600 font-semibold text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Wishlist — positioned over image */}
      <button
        onClick={handleWishlist}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center active:scale-90 transition-transform z-20 border border-gray-100"
      >
        <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>

      {/* ── Info — fixed-height slots ──────────────────────────────── */}
      <div className="flex flex-col flex-1 px-2 pt-1.5 pb-2">

        {/* Category — h-5 always reserved */}
        <div className="h-[14px] flex items-center overflow-hidden mb-1">
          {product.category && (
            <span className="inline-flex text-[8px] font-black uppercase tracking-tight text-green-700 bg-green-50 border border-green-100 rounded-full px-1.5 py-0 leading-none truncate max-w-full">
              {product.category}
            </span>
          )}
        </div>

        {/* Name — h-[28px], 2 lines max */}
        <Link href={`/products/${slug}`} className="mb-1 block">
          <p className="text-[11px] font-bold leading-[1.3] text-gray-800 hover:text-green-700 transition-colors line-clamp-2 h-[28px] overflow-hidden">
            {product.display_title}
          </p>
        </Link>

        {/* Price — h-5 */}
        <div className="flex items-center h-5 mb-1.5">
          <span className="text-[13px] font-black text-gray-900 leading-none">
            £{product.price.toFixed(2)}
          </span>
          {product.discount_pct > 0 && product.original_price && (
            <span className="text-[9px] text-gray-400 line-through leading-none ml-1">
              £{product.original_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Cart button — mt-auto anchors to bottom */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              disabled={!product.in_stock}
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1 bg-[#0B5D3B] hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black rounded-lg text-[10px] h-7 transition-all active:scale-95 shadow-sm"
            >
              {product.in_stock ? 'ADD' : 'Out of Stock'}
            </button>
          ) : (
            <div
              className="flex items-center justify-between bg-green-50 rounded-lg border border-[#0B5D3B] h-7 px-1"
              role="group"
            >
              <button
                onClick={handleDecrease}
                className="w-5 h-5 rounded-md bg-white border border-green-400 flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-all active:scale-90"
              >
                <Minus className="h-2 w-2" />
              </button>
              <span className="font-black text-[#0B5D3B] text-[11px]">{qty}</span>
              <button
                onClick={handleIncrease}
                className="w-5 h-5 rounded-md bg-[#0B5D3B] flex items-center justify-center hover:bg-green-700 transition-all active:scale-90 text-white"
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

const RpcProductCard = memo(RpcProductCardComponent);
RpcProductCard.displayName = 'RpcProductCard';
export default RpcProductCard;
