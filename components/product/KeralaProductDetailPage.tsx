'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Star, Truck, Shield, RefreshCw, BadgeCheck, Clock, Leaf, ChevronRight, Zap, Sparkles, CircleAlert as AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ProductGallery from '@/components/product/ProductGallery';
import ProductActions from '@/components/product/ProductActions';
import StickyCartBar from '@/components/product/StickyCartBar';
import MobileStickyBar from '@/components/product/MobileStickyBar';
import ProductAccordions from '@/components/product/ProductAccordions';
import ProfitGenerativeBanner from '@/components/product/ProfitGenerativeBanner';
import KeralaProductCard from '@/components/product/KeralaProductCard';
import RecentlyViewedTracker from '@/components/product/RecentlyViewedTracker';
import RecentlyViewed from '@/components/product/RecentlyViewed';
import DeliveryUrgencyTimer from '@/components/product/DeliveryUrgencyTimer';
import FrequentlyBoughtTogether from '@/components/product/FrequentlyBoughtTogether';
import ReviewSection from '@/components/product/ReviewSection';
import { getProductDetail, getProducts } from '@/lib/services/rpcApiClient';
import { getPersonalizedRecommendations } from '@/lib/services/recommendationService';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import type { RpcProduct, ProductVariantOption } from '@/lib/services/rpcApiClient';
import type { ProductWithDetails } from '@/lib/types/database';
import { useProductSync } from '@/hooks/useProductSync';

const TRUST_BADGES = [
  { icon: Truck,      label: 'Free UK Delivery', sub: 'On all orders'       },
  { icon: BadgeCheck, label: '100% Authentic',   sub: 'Direct from Kerala'  },
  { icon: Shield,     label: 'Secure Payment',   sub: 'SSL protected'       },
  { icon: RefreshCw,  label: 'Easy Returns',     sub: '30-day guarantee'    },
];

function addBusinessDays(date: Date, days: number): Date {
  let count = 0;
  const result = new Date(date);
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return result;
}

function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function toProductWithDetails(p: RpcProduct): ProductWithDetails {
  return {
    id: p.id,
    name: p.display_title,
    slug: p.slug ?? p.id,
    description: p.description,
    price: p.price,
    original_price: p.original_price,
    image_url: p.image_url,
    category_id: null,
    brand_id: null,
    created_at: p.created_at ?? '',
    stock: p.stock,
    is_active: true,
    discount_percentage: p.discount_pct,
    category: p.category ? { id: '', name: p.category, slug: '' } : undefined,
    brand: p.brand ? { id: '', name: p.brand, slug: '', logo_url: null, description: null, created_at: '', updated_at: '' } : undefined,
    rating: 4.5,
  };
}

interface Props {
  slug: string;
}

export default function KeralaProductDetailPage({ slug }: Props) {
  useProductSync();
  const { user } = useAuth();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<RpcProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantOption | null>(null);
  const [related, setRelated] = useState<RpcProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  const today = new Date();
  const deliveryFrom = formatDeliveryDate(addBusinessDays(today, 2));
  const deliveryTo   = formatDeliveryDate(addBusinessDays(today, 5));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);

    getProductDetail(slug).then(async ({ product: p, error }) => {
      if (cancelled) return;

      if (!p) {
        // Diagnostics for debugging "product not found"
        const supabase = getSupabase();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        let diagQuery = supabase
          .from('products')
          .select('id, slug, centralhub_product_id, approval_status, visibility_status');

        if (isUuid) {
          diagQuery = diagQuery.or(`id.eq.${slug},slug.eq.${slug}`);
        } else {
          diagQuery = diagQuery.eq('slug', slug);
        }

        const { data: diag } = await diagQuery.maybeSingle();

        console.warn('[ProductDetail] not found:', {
          requestedSlug: slug,
          matchedProduct: diag ?? null,
          fetchError: error,
        });
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setProduct(p);
      if (p.variants && p.variants.length > 0) {
        setSelectedVariant(p.variants[0]);
      }
      setIsLoading(false);
      fetchRelated(p, cancelled);

      // Load gallery images
      const supabase = getSupabase();
      supabase
        .from('product_gallery_images')
        .select('image_url, enhanced_image_url, position')
        .eq('product_id', p.id)
        .order('position')
        .then(({ data }) => {
          if (cancelled || !data?.length) return;
          const urls = data.map((r: { image_url: string; enhanced_image_url: string | null }) =>
            r.enhanced_image_url ?? r.image_url
          ).filter(Boolean);
          if (!cancelled) setGalleryUrls(urls);
        });
    });

    async function fetchRelated(p: RpcProduct, isCancelled: boolean) {
      const rel = await getPersonalizedRecommendations(
        user?.id ?? null,
        p.category,
        12
      );
      if (!isCancelled) {
        setRelated(rel.filter((r) => r.id !== p.id).slice(0, 6));
      }
    }

    return () => { cancelled = true; };
  }, [slug, user?.id]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-5 gap-8 items-start animate-pulse">
          <div className="lg:col-span-2 aspect-square bg-gray-100 rounded-2xl" />
          <div className="lg:col-span-3 space-y-4">
            <div className="h-4 bg-gray-100 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-12 bg-gray-100 rounded w-40" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <h1 className="text-xl font-bold text-gray-700">Product not found</h1>
        <p className="text-sm text-gray-400">This product may have been removed or the link is invalid.</p>
        <Link href="/products" className="text-green-600 font-medium hover:underline text-sm">
          Browse all products
        </Link>
      </div>
    );
  }

  const productWD = toProductWithDetails(product);

  // Use selected variant data if available
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const inStock = currentStock > 0;

  const original = product.original_price ?? currentPrice;
  const discount = product.discount_pct;
  const savings  = (original - currentPrice).toFixed(2);

  const stockStatus = inStock
    ? currentStock <= 5
      ? { text: `Only ${currentStock} left!`, color: 'text-amber-700 bg-amber-50 border border-amber-200', dot: 'bg-amber-500' }
      : { text: 'In Stock',                    color: 'text-green-700 bg-green-50 border border-green-200', dot: 'bg-green-500' }
    : { text: 'Out of Stock',                  color: 'text-red-700 bg-red-50 border border-red-200',       dot: 'bg-red-500' };

  // Update productWD for child components
  productWD.price = currentPrice;
  productWD.stock = currentStock;

  const resolvedImg = product.image_url?.startsWith('http') ? product.image_url : '/placeholder.webp';
  const galleryImages = galleryUrls.length > 0 ? galleryUrls : [resolvedImg];

  const unitLabel = [product.unit, product.weight_qnty ?? product.weight].filter(Boolean).join(' ');

  const breadcrumbs = [
    { name: 'Products', href: '/products' },
    ...(product.category ? [{ name: product.category, href: `/products?category=${encodeURIComponent(product.category)}` }] : []),
    { name: product.display_title, href: '#' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <RecentlyViewedTracker
        product={{
          id: product.id,
          name: product.display_title,
          slug: product.slug ?? product.id,
          price: currentPrice,
          image_url: product.image_url ?? null,
        }}
      />

      <StickyCartBar product={productWD} triggerRef={actionsRef} />
      <MobileStickyBar product={productWD} triggerRef={actionsRef} />

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              {item.href === '#' ? (
                <span className="text-gray-700 font-medium line-clamp-1 max-w-[200px]">{item.name}</span>
              ) : (
                <Link href={item.href} className="hover:text-green-600 transition-colors">{item.name}</Link>
              )}
            </span>
          ))}
        </nav>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Gallery */}
          <div className="lg:col-span-2">
            <ProductGallery
              images={galleryImages}
              productName={product.display_title}
              discountPercentage={discount}
              stock={product.stock}
            />
          </div>

          {/* Info */}
          <div className="lg:col-span-3 space-y-5">
            {product.brand && (
              <Link
                href={`/products?brand=${encodeURIComponent(product.brand)}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B5D3B] bg-green-50 border border-green-100 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
              >
                <Leaf className="w-3 h-3" />
                {product.brand}
              </Link>
            )}

            <div>
              {product.category && (
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                  {product.category}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {product.display_title}
              </h1>
              {unitLabel && (
                <p className="text-sm text-gray-400 mt-1">{unitLabel}</p>
              )}
            </div>

            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size / Weight</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const isCurrent = selectedVariant?.id === v.id;
                    const label = v.variant_name;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`inline-flex flex-col items-center px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-[#0B5D3B] border-[#0B5D3B] text-white'
                            : v.stock > 0
                            ? 'border-gray-200 text-gray-700 hover:border-[#0B5D3B] hover:text-[#0B5D3B] bg-white'
                            : 'border-gray-100 text-gray-300 bg-gray-50'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`text-xs font-normal mt-0.5 ${isCurrent ? 'text-green-200' : 'text-gray-400'}`}>
                          £{v.price.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="bg-[#f0fdf4] border border-emerald-100 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-[#0B5D3B] tracking-tighter">£{currentPrice.toFixed(2)}</span>
                  {discount > 0 && (
                    <span className="text-xl text-gray-400 line-through font-bold opacity-60">£{original.toFixed(2)}</span>
                  )}
                </div>
                {discount > 0 && (
                  <div className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-lg shadow-red-500/20 animate-bounce-subtle">
                    {discount}% OFF
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <Star className="w-4 h-4 fill-yellow-400/30 text-yellow-400/30" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">4.5 Rating</span>
                <Separator orientation="vertical" className="h-3 bg-gray-200 mx-1" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Verified Quality</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-white/60 w-fit px-3 py-1 rounded-lg border border-emerald-100/50">
                  <Zap className="w-3.5 h-3.5 fill-emerald-700" />
                  Save £{savings} on this item
                </div>
              )}
            </div>

            {/* Stock + delivery */}
            <div className="flex flex-wrap items-center gap-3">
              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${stockStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${stockStatus.dot}`} />
                {stockStatus.text}
              </div>
              {inStock && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#0B5D3B]" />
                  <span>
                    Delivery: <span className="font-semibold text-gray-900">{deliveryFrom} – {deliveryTo}</span>
                  </span>
                </div>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                {product.short_description}
              </p>
            )}

            <DeliveryUrgencyTimer />

            <div ref={actionsRef}>
              <ProductActions product={productWD} />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-[#0B5D3B]" />
                  </div>
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether mainProduct={product} />

        {/* Accordions */}
        <div className="mt-10">
          <ProductAccordions
            description={product.description}
            categoryName={product.category ?? undefined}
          />
        </div>

        {/* High-margin profit generative spotlight */}
        <ProfitGenerativeBanner />

        {/* Customer Reviews */}
        <ReviewSection productId={product.id} productName={product.display_title} />

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-12 pt-10 border-t border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              {user ? (
                <>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Recommended For You
                </>
              ) : 'You May Also Like'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {related.map((r) => (
                <KeralaProductCard key={r.id} product={r} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-gray-100">
          <RecentlyViewed currentProductId={product.id} />
        </div>
      </div>
    </div>
  );
}
