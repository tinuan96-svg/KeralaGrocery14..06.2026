import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag, Truck, Star, Users, MapPin, Smartphone, Shield, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Kerala Groceries UK – Authentic Kerala Food Delivered Across the UK',
  description:
    'Learn about Kerala Groceries UK (KG), a UK-based ecommerce platform delivering authentic Kerala groceries nationwide. Operated by Tasty Kerala Ltd.',
  keywords: [
    'Kerala Groceries UK',
    'about Kerala Groceries',
    'Indian groceries UK',
    'authentic Kerala food UK',
    'Tasty Kerala Ltd',
    'Kerala food delivery UK',
  ],
  openGraph: {
    title: 'About Us | Kerala Groceries UK',
    description:
      'UK-based ecommerce platform delivering authentic Kerala groceries nationwide. Quality, authenticity, and fast delivery.',
    url: 'https://keralagrocery.com/about-us',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

const stats = [
  { label: 'Products Available', value: '500+' },
  { label: 'UK Postcodes Served', value: 'Nationwide' },
  { label: 'Brands Stocked', value: '50+' },
  { label: 'Customer Rating', value: '4.8 / 5' },
];

const values = [
  {
    icon: Award,
    title: 'Authenticity',
    description:
      'Every product is sourced directly from trusted Kerala and South Indian suppliers, ensuring the genuine taste of home in every order.',
  },
  {
    icon: Star,
    title: 'Quality First',
    description:
      'We vet every brand and product we list. If we wouldn\'t serve it at our own table, it doesn\'t make the shelf.',
  },
  {
    icon: Truck,
    title: 'Fast UK Delivery',
    description:
      'Orders are dispatched from our UK fulfilment centres for next-day and 2-day delivery across England, Scotland, and Wales.',
  },
  {
    icon: Shield,
    title: 'Secure & Trusted',
    description:
      'Payments are processed through PCI-compliant gateways. Your data is protected under UK GDPR.',
  },
];

export default function AboutUsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-700/50 text-green-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <MapPin className="h-4 w-4" />
            Based in the United Kingdom
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Bringing the Taste of Kerala<br className="hidden sm:block" /> to Every UK Home
          </h1>
          <p className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto mb-8">
            Kerala Groceries UK is the UK&apos;s dedicated destination for authentic Kerala and South Indian
            groceries — from aromatic spices and fresh rice varieties to traditional snacks and pickles.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop Now
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-white/20"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-green-700">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="prose prose-slate max-w-none text-gray-700 space-y-5 text-base leading-relaxed">
            <p>
              Kerala Groceries UK was founded with a single mission: to make it easy for the UK&apos;s
              Kerala and South Indian community to find the authentic products they grew up with —
              without compromise. Whether it&apos;s a specific brand of coconut oil, a particular variety
              of red rice, or the exact curry leaf pickle your grandmother made, we believe you
              shouldn&apos;t have to settle.
            </p>
            <p>
              Operated by <strong>Tasty Kerala Ltd</strong>, a company registered in the United Kingdom,
              we run a multi-store ecommerce model with centralised logistics. This means products from
              multiple verified suppliers are consolidated in our UK fulfilment network and dispatched
              to customers as a single, reliable order — no waiting on international shipping, no
              hidden import costs.
            </p>
            <p>
              Our catalogue spans over 500 products across categories including rice and grains, spices
              and masalas, flours and batters, pickles and chutneys, snacks, beverages, and personal
              care products traditionally used in Kerala households.
            </p>
            <p>
              We are committed to expanding our reach and improving the shopping experience. Our platform
              We are committed to expanding our reach and continuing to improve the shopping experience
              for the Kerala community across the United Kingdom.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">What We Stand For</h2>
          <p className="text-gray-500 mb-10">The principles that drive every decision we make.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:border-green-200 hover:bg-green-50/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Store Model */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Multi-Store Platform</h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="text-gray-700 space-y-4 text-base leading-relaxed">
              <p>
                Behind Kerala Groceries UK is a purpose-built multi-store commerce platform. Each
                supplier partner operates as an independent store within our ecosystem, with their own
                inventory and product listings — but customers always experience a single, unified
                storefront.
              </p>
              <p>
                Our centralised logistics layer handles stock aggregation, order routing, and dispatch,
                so customers receive one consolidated delivery regardless of how many suppliers
                contributed to their basket.
              </p>
              <p>
                This model allows us to onboard new regional suppliers — from London to Birmingham,
                Leicester to Glasgow — while maintaining consistent quality controls and delivery
                standards across the board.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Multiple Verified Suppliers</p>
                  <p className="text-xs text-gray-500">All vetted for quality and authenticity</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Single Unified Storefront</p>
                  <p className="text-xs text-gray-500">One basket, one checkout, one delivery</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Centralised UK Fulfilment</p>
                  <p className="text-xs text-gray-500">Fast dispatch from UK-based stock</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Mobile-Optimised Shopping</p>
                  <p className="text-xs text-gray-500">Shop easily on any device</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Shop?</h2>
          <p className="text-gray-500 mb-8">
            Browse our full range of authentic Kerala groceries and get them delivered straight to
            your door, anywhere in the UK.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Browse All Products
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-700 font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-10 px-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 space-y-1">
          <p><strong className="text-gray-700">Kerala Groceries UK</strong> is a trading name of <strong className="text-gray-700">Tasty Kerala Ltd</strong>, registered in England and Wales.</p>
          <p>
            Email:{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>
            {' '}· Phone:{' '}
            <a href="tel:07902205199" className="text-green-600 hover:underline">07902205199</a>
          </p>
        </div>
      </section>
    </main>
  );
}
