'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Tag, Scale, Package } from 'lucide-react';
import { type CatalogProduct, stockStatus } from '@/lib/services/catalogService';

interface Props {
  product: CatalogProduct;
}

const STOCK_CONFIG = {
  in_stock:    { label: 'In stock',     dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  low_stock:   { label: 'Low stock',    dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  out_of_stock:{ label: 'Out of stock', dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50'     },
};

export default function CatalogProductCard({ product }: Props) {
  const [added, setAdded] = useState(false);
  const status = stockStatus(product.stock);
  const cfg = STOCK_CONFIG[status];
  const unavailable = status === 'out_of_stock';

  const handleAdd = () => {
    if (unavailable) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Image placeholder / category color band */}
      <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Package className="w-14 h-14 text-gray-200" />
        {product.product_type && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-100">
            {product.product_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Name + brand */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-[#0B5D3B] transition-colors">
            {product.name ?? '—'}
          </h3>
          {product.brand && (
            <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          {product.weight != null && (
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3" />
              {product.weight}
            </span>
          )}
          {product.product_type && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {product.product_type}
            </span>
          )}
        </div>

        {/* Stock badge */}
        <div className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-lg font-bold text-gray-900">
            {product.price != null
              ? `£${Number(product.price).toFixed(2)}`
              : <span className="text-sm font-normal text-gray-400">Price TBC</span>
            }
          </span>

          <button
            onClick={handleAdd}
            disabled={unavailable}
            aria-label={unavailable ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              unavailable
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white scale-95'
                : 'bg-[#0B5D3B] text-white hover:bg-[#094d30] active:scale-95'
            }`}
          >
            {added ? (
              <><Check className="w-3.5 h-3.5" /> Added</>
            ) : (
              <><ShoppingCart className="w-3.5 h-3.5" /> Add</>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
