'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { resolveProductImage } from '@/lib/utils/image';
import { roundUpToNearestTen } from '@/lib/utils/formatters';
import { useCart } from '@/lib/context/CartContext';
import { ShoppingCart, Plus, Minus, Loader as Loader2 } from 'lucide-react';

interface SectionProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  brand: string | null;
  stock: number;
  unit?: string | null;
  weight?: string | null;
}

interface CategoryProductSectionProps {
  title: string;
  emoji: string;
  categorySlugs: string[];
  viewAllHref: string;
  limit?: number;
}

export default function CategoryProductSection({
  title,
  emoji,
  categorySlugs,
  viewAllHref,
  limit = 8,
}: CategoryProductSectionProps) {
  const [products, setProducts] = useState<SectionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (hasLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasLoaded) {
          setHasLoaded(true);
          loadProducts();
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded]);

  async function loadProducts() {
    try {
      const supabase = getSupabase();

      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .in('slug', categorySlugs);

      if (!categories || categories.length === 0) {
        setLoading(false);
        return;
      }

      const categoryIds = categories.map((c: any) => c.id);

      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, image_main, image_url, brand, stock, unit, weight')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('approval_status', 'approved')
        .eq('visibility_status', 'visible')
        .not('centralhub_product_id', 'is', null)
        .gt('price', 0)
        .in('category_id', categoryIds)
        .order('sold_count', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error(`[CategoryProductSection] Error fetching ${title}:`, error);
        setLoading(false);
        return;
      }

      const mapped: SectionProduct[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name ?? '',
        slug: p.slug ?? '',
        price: roundUpToNearestTen(p.price ?? 0),
        image: resolveProductImage({
          image_main: p.image_main,
          image_url: p.image_url,
        }),
        brand: p.brand ?? null,
        stock: p.stock ?? 0,
        unit: p.unit ?? null,
        weight: p.weight ?? null,
      }));

      setProducts(mapped);
      setLoading(false);
    } catch (err) {
      console.error(`[CategoryProductSection] Unexpected error for ${title}:`, err);
      setLoading(false);
    }
  }

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(99, qty)) }));
  };

  const handleAddToCart = (product: SectionProduct) => {
    const qty = getQty(product.id);
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.image || '',
    }, qty);
  };

  if (loading) {
    return (
      <section ref={sectionRef} className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{emoji}</span>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900">{title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900">{title}</h2>
        </div>
        <Link href={viewAllHref} className="text-xs font-bold text-[#0B5D3B] hover:underline">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {products.map((product) => {
          const inStock = product.stock > 0;
          return (
            <div
              key={product.id}
              className="group bg-white border border-[#d1ead9] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/products/${product.slug}`} className="block">
                <div className="aspect-square bg-[#f4faf6] relative overflow-hidden">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                  {!inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded">Out of Stock</span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-2">
                {product.brand && (
                  <p className="text-[10px] text-gray-400 font-medium truncate">{product.brand}</p>
                )}
                <Link href={`/products/${product.slug}`}>
                  <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 hover:text-[#0B5D3B] transition-colors min-h-[2rem]">
                    {product.name}
                  </p>
                </Link>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-extrabold text-[#0B5D3B]">
                    £{product.price.toFixed(2)}
                  </span>
                </div>

                {inStock ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => setQty(product.id, getQty(product.id) - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg border border-[#d1ead9] hover:bg-[#f4faf6] transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3 text-gray-500" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{getQty(product.id)}</span>
                    <button
                      onClick={() => setQty(product.id, getQty(product.id) + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg border border-[#d1ead9] hover:bg-[#f4faf6] transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 h-6 flex items-center justify-center gap-1 bg-[#0B5D3B] hover:bg-[#0d6b44] text-white text-[10px] font-bold rounded-lg transition-colors active:scale-95"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="h-6 mt-1.5 flex items-center justify-center">
                    <span className="text-[10px] text-gray-400 font-medium">Out of stock</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
