'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { useCart, type CartItem } from '@/lib/context/CartContext';
import { getProductSrcSet } from '@/lib/utils/image';
import type { BannerProduct, BannerConfig } from '@/hooks/useProductBanners';

interface Props {
  config: BannerConfig;
  products: BannerProduct[];
}

function formatPrice(p: number) {
  return `£${p.toFixed(2)}`;
}

function toSrcSet(url: string | null): { webp: string | null; jpeg: string } {
  const src = url && url.startsWith('http') ? url : '/placeholder.webp';
  if (src === '/placeholder.webp') {
    return { webp: null, jpeg: src };
  }
  if (src.includes('/render/image/')) {
    try {
      const u = new URL(src);
      u.searchParams.set('format', 'jpeg');
      return { webp: src, jpeg: u.toString() };
    } catch { /* fall through */ }
  }

  // If it's already a webp, we use it for both. Modern browsers that support <picture> support webp.
  if (src.toLowerCase().endsWith('.webp') || src.toLowerCase().includes('.webp?')) {
    return { webp: src, jpeg: src };
  }

  // Fallback for others
  return { webp: null, jpeg: src };
}

function ProductCard({
  product,
  featured = false,
  config,
}: {
  product: BannerProduct;
  featured?: boolean;
  config: BannerConfig;
}) {
  const { addToCart, getQuantity, removeFromCart } = useCart();

  const cartProduct: Omit<CartItem, 'quantity'> = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    image_url: product.image_url ?? undefined,
  };

  const qty = getQuantity(product.id);
  const hasDiscount =
    product.discount > 0 &&
    product.original_price &&
    product.original_price > product.price;

  const { webp, jpeg } = toSrcSet(product.image_url);

  if (featured) {
    return (
      <div className={`snap-start flex-shrink-0 w-[180px] sm:w-[200px]`}>
        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${config.accentColor} p-0.5 h-full`}>
          <div className="bg-white rounded-[14px] h-full p-3 flex flex-col">
            <Link href={`/products/${product.slug}`} className="block group">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                <picture className="absolute inset-0">
                  {webp && <source srcSet={webp} type="image/webp" />}
                  <source srcSet={jpeg} type="image/jpeg" />
                  <img
                    src={jpeg}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain transition-transform duration-500 scale-[1.18] group-hover:scale-[1.28]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/placeholder.webp';
                    }}
                  />
                </picture>
                {hasDiscount && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    -{product.discount}%
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
              {product.brd_name && (
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.brd_name}</p>
              )}
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                {hasDiscount && (
                  <span className="text-[10px] text-gray-400 line-through block">
                    {formatPrice(product.original_price!)}
                  </span>
                )}
              </div>
              {qty > 0 ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-base font-bold hover:bg-green-700 transition-colors leading-none"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold w-4 text-center">{qty}</span>
                  <button
                    onClick={() => addToCart(cartProduct)}
                    className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(cartProduct)}
                  disabled={product.stock === 0}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  ADD
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="snap-start flex-shrink-0 w-[140px] sm:w-[155px] group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 group-hover:border-green-200 transition-colors">
          <picture className="absolute inset-0">
            {webp && <source srcSet={webp} type="image/webp" />}
            <source srcSet={jpeg} type="image/jpeg" />
            <img
              src={jpeg}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain transition-transform duration-500 scale-[1.18] group-hover:scale-[1.28]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/placeholder.webp';
              }}
            />
          </picture>
          {hasDiscount && (
            <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              -{product.discount}%
            </span>
          )}
          {product.stock <= 3 && product.stock > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {product.stock} left
            </span>
          )}
        </div>
      </Link>

      <div className="mt-2 px-0.5">
        <Link href={`/products/${product.slug}`}>
          <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight hover:text-green-700 transition-colors min-h-[2.5rem]">
            {product.name}
          </p>
        </Link>
        {product.brd_name && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.brd_name}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <div>
            <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through ml-1">
                {formatPrice(product.original_price!)}
              </span>
            )}
          </div>
          {qty > 0 ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => removeFromCart(product.id)}
                className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-base font-bold hover:bg-green-700 transition-colors leading-none"
                aria-label="Decrease"
              >
                −
              </button>
              <span className="text-xs font-semibold w-4 text-center text-gray-900">{qty}</span>
              <button
                onClick={() => addToCart(cartProduct)}
                className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors"
                aria-label="Increase"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(cartProduct)}
              disabled={product.stock === 0}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-3 h-3" />
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductBannerSection({ config, products }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  return (
    <section className="py-4 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span className="text-lg leading-none">{config.icon}</span>
            {config.title}
            <span className={`text-xs font-normal ${config.tagColor} ml-1 hidden sm:inline`}>
              {config.subtitle}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="hidden sm:flex w-7 h-7 rounded-full border border-gray-200 items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="hidden sm:flex w-7 h-7 rounded-full border border-gray-200 items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              href={config.viewAllHref}
              className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-0.5"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* All products in a single scrollable row — first card is featured (larger) */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={i === 0}
              config={config}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
