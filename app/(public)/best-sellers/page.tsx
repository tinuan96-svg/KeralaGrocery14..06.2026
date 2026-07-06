import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Star, ShoppingBag, Truck, Award } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FAQSchema } from '@/components/seo/StructuredData';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best Sellers | Kerala Groceries UK – Most Popular Kerala & Indian Groceries',
  description:
    'Shop the best-selling Kerala and Indian groceries in the UK. Discover the most popular authentic spices, rice, snacks, pickles, and more. Fast UK-wide delivery.',
  keywords: [
    'best selling Kerala groceries UK',
    'popular Indian groceries UK',
    'top Kerala spices UK',
    'most bought Indian food UK',
    'popular Kerala food online UK',
    'best Kerala rice UK',
    'top Indian snacks UK',
    'authentic Kerala products UK',
    'Kerala grocery bestsellers',
    'buy Indian groceries online UK',
  ],
  alternates: {
    canonical: 'https://keralagrocery.com/best-sellers',
  },
  openGraph: {
    title: 'Best Sellers | Kerala Groceries UK',
    description:
      "The UK's most popular authentic Kerala and Indian groceries. Top-rated spices, rice, snacks, and more. Fast delivery.",
    url: 'https://keralagrocery.com/best-sellers',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

const faqItems = [
  {
    question: 'What are the most popular Kerala groceries in the UK?',
    answer:
      'Our best-selling items typically include Kerala red rice, coconut oil, curry leaf powder, fish masala, tapioca chips, and a range of authentic pickles and chutneys from trusted Kerala brands.',
  },
  {
    question: 'How do I know these are authentic Kerala products?',
    answer:
      'Every product on Kerala Groceries UK is sourced from verified Kerala and South Indian suppliers. We stock well-known brands trusted by the Kerala community in the UK, such as Double Horse, Chakra, Nirapara, and more.',
  },
  {
    question: 'Is there free delivery on best-seller items?',
    answer:
      'Yes — we offer free delivery on qualifying orders across the UK. Check your basket at checkout for the current free delivery threshold.',
  },
  {
    question: 'Can I order Kerala groceries for next-day delivery in the UK?',
    answer:
      'We offer fast delivery across the UK, including next-day and 2-day delivery options. Delivery times and options are shown at checkout based on your postcode.',
  },
];

export default async function BestSellersPage() {
  const supabase = createServerSupabaseClient();

  const { data: featured } = await supabase
    .from('products')
    .select('id, name, slug, image_url, image_main, price, original_price')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('approval_status', 'approved')
    .eq('visibility_status', true)
    .order('sold_count', { ascending: false })
    .limit(24);

  const products = (featured ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name as string,
      slug: p.slug as string,
      image: ((p.image_main as string | null)?.startsWith('http') ? p.image_main : null) ?? (p.image_url as string | null),
      price: Number(p.price ?? 0),
    }))
    .filter((p) => p.price > 0);

  const categories = [
    { label: 'Spices & Masalas', slug: 'whole-&-ground-spices', icon: '🌶️' },
    { label: 'Rice & Grains', slug: 'rices', icon: '🍚' },
    { label: 'Snacks & Sweets', slug: 'snacks-sweets', icon: '🍪' },
    { label: 'Pickles & Preserves', slug: 'pickles-&-preserves', icon: '🫙' },
    { label: 'Ready to Eat', slug: 'ready-to-eat', icon: '🍽️' },
    { label: 'Tea & Beverages', slug: 'tea', icon: '🍵' },
    { label: 'Oils & Fats', slug: 'oils-fats', icon: '🫒' },
    { label: 'Flour & Grains', slug: 'flour-grains', icon: '🌾' },
  ];

  return (
    <>
      <FAQSchema items={faqItems} />

      <main className="min-h-screen bg-gray-50">

        {/* Hero */}
        <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-green-700/50 text-green-200 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
              <TrendingUp className="h-4 w-4" />
              Customer favourites
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Best-Selling Kerala Groceries in the UK
            </h1>
            <p className="text-green-100 text-lg max-w-2xl mx-auto mb-8">
              Discover the most popular authentic Kerala and South Indian products chosen by our
              UK customers. From aromatic spices to traditional snacks — all delivered fast
              across the UK.
            </p>
            <Link
              href="/products?sort=popular"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop Best Sellers
            </Link>
          </div>
        </section>

        {/* Trust strip */}
        <div className="bg-white border-b border-gray-100 py-4 px-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-green-600" /> Free UK Delivery on qualifying orders</span>
            <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-orange-500" /> 100% Authentic Kerala brands</span>
            <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-500" /> Customer-rated 4.8 / 5</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Why customers love us */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              {
                icon: Award,
                title: 'Authentic Brands',
                desc: 'Every product sourced from verified Kerala and South Indian suppliers trusted by the community.',
              },
              {
                icon: Truck,
                title: 'Fast UK Delivery',
                desc: 'Dispatched from UK stock — next-day and 2-day delivery options available across all UK postcodes.',
              },
              {
                icon: Star,
                title: 'Community Picks',
                desc: "Our best sellers are chosen by Kerala families across the UK — the products they buy again and again.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Product grid */}
          {products.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Most Popular Products
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
                {products.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:border-green-300 transition-all group"
                  >
                    <div className="relative mb-3">
                      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image || '/placeholder.webp'}
                          alt={p.name}
                          className="w-full h-full object-contain p-2"
                          loading={i < 8 ? 'eager' : 'lazy'}
                        />
                      </div>
                      {i < 3 && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          #{i + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700">
                      {p.name}
                    </p>
                    <p className="text-base font-bold text-green-700 mt-1">
                      £{p.price.toFixed(2)}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Browse by category */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop Best Sellers by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm font-medium text-gray-700 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors text-center"
              >
                <span className="block text-2xl mb-1">{cat.icon}</span>
                {cat.label}
              </Link>
            ))}
          </div>

          {/* SEO editorial content */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Why Kerala Groceries UK Is the UK&apos;s Favourite for Authentic Indian Groceries
            </h2>
            <div className="prose prose-sm prose-slate max-w-none text-gray-700 space-y-4">
              <p>
                Kerala Groceries UK is the dedicated online destination for the Kerala and South
                Indian community in the United Kingdom. We stock over 500 authentic products
                sourced from trusted Kerala suppliers — covering every staple from aromatic whole
                spices and ground masalas to traditional rice varieties, coconut-based products,
                pickles, chutneys, snacks, and a wide range of ready-to-eat meals.
              </p>
              <p>
                Our best-selling products reflect what the UK&apos;s Kerala community actually buys:
                <strong> Kerala red rice</strong>, <strong>coconut oil</strong>,{' '}
                <strong>fish curry masala</strong>, <strong>tapioca chips</strong>,{' '}
                <strong>mango pickle</strong>, and <strong>Kerala tea</strong> consistently rank
                among our top sellers. Every product is genuine — no substitutions, no
                generic alternatives.
              </p>
              <p>
                All orders are fulfilled from our UK-based stock, meaning fast delivery anywhere
                in England, Scotland, and Wales — with free delivery available on qualifying orders.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section>
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

          {/* Internal link grid */}
          <section className="mt-12 p-6 bg-green-50 border border-green-100 rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Explore More</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ['/products', 'All Products'],
                ['/offers', 'Special Offers'],
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
