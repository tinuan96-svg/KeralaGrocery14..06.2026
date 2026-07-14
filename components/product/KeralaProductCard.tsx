'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { Heart, Plus, Minus, ShoppingCart, Wallet } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { useWishlist } from '@/lib/context/WishlistContext';
import { useWallet } from '@/hooks/useWallet';
import type { RpcProduct } from '@/lib/services/rpcApiClient';

interface KeralaProductCardProps {
  product: RpcProduct;
  priority?: boolean;
}

function KeralaProductCardComponent({ product, priority = false }: KeralaProductCardProps) {
  const { addToCart, getQuantity, removeFromCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings, activeCycle } = useWallet();

  const slug = product.slug ?? product.product_code ?? product.id;
  const price = product.price;

  // Calculate potential cashback
  const rate = activeCycle
    ? (activeCycle.tier === 'gold' ? settings?.gold_rate : activeCycle.tier === 'silver' ? settings?.silver_rate : settings?.bronze_rate)
    : (settings?.bronze_rate ?? 0.01);
  const potentialCashback = (price * (rate || 0.01)).toFixed(2);
  const original = product.original_price ?? price;
  const stock = product.stock;
  const discount = product.discount_pct;
  const image = product.image_url || '/placeholder.webp';

  const qty = getQuantity(product.id);
  const inWishlist = isInWishlist(product.id);

  const cartItem = {
    id: product.id,
    name: product.display_title,
    price,
    image_url: product.image_url ?? undefined,
    slug,
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="group card-kg overflow-hidden flex flex-col h-full">

      {/* Image */}
      <Link href={`/products/${slug}`} className="block flex-shrink-0">
        <div className="relative w-full bg-white overflow-hidden rounded-t-[inherit]" style={{ aspectRatio: '1 / 1' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_#edfaf3_0%,_#fff_70%)] pointer-events-none" />
          <Image
            src={image}
            alt={product.display_title}
            fill
            priority={priority}
            className="object-contain transition-transform duration-500 scale-[0.9] group-hover:scale-[1.0] z-10"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />

          {discount > 0 && (
            <span className="absolute top-2 left-2 badge-deal z-20 leading-none">
              -{discount}%
            </span>
          )}
          {stock > 0 && stock <= 5 && (
            <span className="absolute bottom-2 left-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center shadow z-20 block">
              Only {stock} left!
            </span>
          )}

          <button
            onClick={handleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center active:scale-90 transition-all z-20 border border-[#d1ead9] hover:border-red-200"
          >
            <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>

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
      <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5">

        {/* Category */}
        <div className="h-5 flex items-center overflow-hidden mb-1">
          {product.category && (
            <span className="inline-flex text-[9px] font-bold text-[#0B5D3B] bg-[#f4faf6] border border-[#d1ead9] rounded-full px-2 py-0.5 leading-none truncate max-w-full">
              {product.category}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/products/${slug}`} className="mb-1.5 block">
          <h3 className="text-[12px] font-semibold leading-[1.35] text-gray-800 hover:text-[#0B5D3B] transition-colors line-clamp-2 h-[34px] overflow-hidden">
            {product.display_title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center justify-between h-6 mb-1.5">
          <div className="flex items-center">
            <span className="text-[13px] font-extrabold text-[#0B5D3B] leading-none">
              £{price.toFixed(2)}
            </span>
            {discount > 0 && (
              <span className="text-[10px] text-gray-400 line-through leading-none ml-1">
                £{original.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
            <Wallet className="w-2 h-2 fill-emerald-600" />
            +£{potentialCashback}
          </div>
        </div>

        {/* Cart */}
        <div className="mt-auto">
          {qty === 0 ? (
            <button
              disabled={stock === 0}
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 btn-brand disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none text-[11px] h-8 rounded-xl font-bold"
            >
              {stock === 0 ? (
                'Out of Stock'
              ) : (
                <><ShoppingCart className="h-3 w-3" /> Add to Cart</>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#f4faf6] rounded-xl border-2 border-[#0B5D3B] h-8 px-1">
              <button
                onClick={handleDecrease}
                className="w-6 h-6 rounded-lg bg-white border border-[#d1ead9] flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all active:scale-90"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-extrabold text-[#0B5D3B] text-[13px]">{qty}</span>
              <button
                onClick={handleIncrease}
                className="w-6 h-6 rounded-lg bg-[#0B5D3B] flex items-center justify-center hover:bg-[#0d6b44] transition-all active:scale-90 text-white"
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

const KeralaProductCard = memo(KeralaProductCardComponent, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.stock === next.product.stock &&
  prev.product.image_url === next.product.image_url &&
  prev.priority === next.priority
);

KeralaProductCard.displayName = 'KeralaProductCard';
export default KeralaProductCard;
