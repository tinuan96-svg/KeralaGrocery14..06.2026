import type { Metadata } from 'next';
import Link from 'next/link';
import { Tag, Percent, ShoppingBag, Truck, Star } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FAQSchema } from '@/components/seo/StructuredData';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Special Offers & Deals | Kerala Groceries UK',
  description:
    'Browse the latest special offers and deals on authentic Kerala groceries in the UK. Save on spices, rice, snacks, pickles, and more. Fast delivery across the UK.',
  keywords: [
    'Kerala grocery deals UK',
    'Indian grocery offers UK',
    'Kerala food discounts UK',
    'cheap Indian groceries UK',
    'Kerala spices deals UK',
    'South Indian grocery offers UK',
    'online Indian grocery sale UK',
    'Kerala grocery discount codes',
  ],
  alternates: {
    canonical: 'https://keralagrocery.com/offers',
  },
  openGraph: {
    title: 'Special Offers & Deals | Kerala Groceries UK',
    description:
      'Save on authentic Kerala groceries. Current deals and discounts on spices, rice, snacks, and more. Fast UK delivery.',
    url: 'https://keralagrocery.com/offers',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

const faqItems = [
  {
    question: 'How often are new offers added on Kerala Groceries UK?',
    answer:
      'We update our special offers regularly — typically weekly. Sign up for our newsletter or check this page frequently to catch the latest deals.',
  },
  {
    question: 'Do you offer free delivery on special offer items?',
    answer:
      'Yes, we offer free delivery on qualifying orders across the UK. Check individual product pages for delivery information.',
  },
  {
    question: 'Can I use discount codes on sale items?',
    answer:
      'Promotional credits and cashback from your KG Wallet can be applied to any order, including sale items. External discount codes may have individual terms.',
  },
  {
    question: 'Are the discounted products authentic Kerala brands?',
    answer:
      'Absolutely. Every discounted product on Kerala Groceries UK is a genuine, quality-verified product from trusted Kerala and South Indian brands.',
  },
];

export default async function OffersPage() {
  const supabase = createServerSupabaseClient();

  // Fetch products with a discount (original_price > price)
  const { data: dealProducts } = await supabase
    .from('products')
    .select('id, name, slug, price, original_price, image_url, image_main')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('approval_status', 'approved')
    .eq('visibility_status', true)
    .eq('is_deal', true)
    .limit(24);

  const offers = (dealProducts ?? []).filter((p) =>
    p.original_price && p.price && Number(p.price) < Number(p.original_price)
  );

  return (
    <>
      <FAQSchema items={faqItems} />

      <main className="min-h-screen bg-gray-50">

        {/* Hero */}
        <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-green-700/50 text-green-200 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
              <Percent className="h-4 w-4" />
              Current deals
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Special Offers on Kerala Groceries
            </h1>
            <p className="text-green-100 text-lg max-w-2xl mx-auto mb-8">
              Save on authentic Kerala and Indian groceries. From spices and masalas to snacks
              and beverages — all delivered fast across the UK.
            </p>
            <Link
              href="/products?filter=deals"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop All Deals
            </Link>
          </div>
        </section>

        {/* Trust strip */}
        <div className="bg-white border-b border-gray-100 py-4 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-green-600" /> Free UK Delivery on qualifying orders</span>
            <span className="flex items-center gap-1.5"><Tag className="h-4 w-4 text-orange-500" /> Updated weekly</span>
            <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-500" /> Authentic Kerala brands</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Offer products */}
          {offers.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Current Discounts ({offers.length} products)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
                {offers.map((p) => {
                  const salePrice = Number(p.price);
                  const origPrice = Number(p.original_price);
                  const savePct = Math.round(((origPrice - salePrice) / origPrice) * 100);
                  const imgSrc = (p.image_main as string | null)?.startsWith('http') ? p.image_main : p.image_url;
                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:border-green-300 transition-all group"
                    >
                      <div className="relative mb-3">
                        <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgSrc || '/placeholder.webp'}
                            alt={p.name}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                          />
                        </div>
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          -{savePct}%
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700">
                        {p.name}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-bold text-green-700">£{salePrice.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 line-through">£{origPrice.toFixed(2)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 mb-12">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Tag className="h-8 w-8 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">New offers coming soon</h2>
              <p className="text-gray-500 mb-6">
                Check back regularly — we update our deals every week.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                Browse All Products
              </Link>
            </div>
          )}

          {/* Category highlights */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-12">
            {[
              { label: 'Spices & Masalas', slug: 'whole-&-ground-spices' },
              { label: 'Rice & Grains', slug: 'rices' },
              { label: 'Snacks & Sweets', slug: 'snacks-sweets' },
              { label: 'Pickles', slug: 'pickles-&-preserves' },
              { label: 'Ready to Eat', slug: 'ready-to-eat' },
              { label: 'Tea & Beverages', slug: 'tea' },
              { label: 'Oils & Fats', slug: 'oils-fats' },
              { label: 'Flour & Grains', slug: 'flour-grains' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors text-center"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* FAQ section */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Internal link block for SEO */}
          <section className="mt-12 p-6 bg-green-50 border border-green-100 rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Explore More</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ['/products', 'All Products'],
                ['/best-sellers', 'Best Sellers'],
                ['/categories', 'All Categories'],
                ['/kerala-groceries-uk', 'Kerala Groceries UK'],
                ['/buy-kerala-spices-uk', 'Buy Kerala Spices'],
                ['/indian-grocery-delivery-uk', 'Indian Grocery Delivery UK'],
                ['/brands', 'All Brands'],
                ['/blog', 'Blog & Guides'],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-green-700 hover:border-green-500 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
