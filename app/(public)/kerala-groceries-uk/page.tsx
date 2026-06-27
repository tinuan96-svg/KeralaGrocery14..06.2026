import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Truck, Shield, Star } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Kerala Groceries UK - Authentic Kerala Products Delivered Nationwide',
  description: 'Buy authentic Kerala groceries online in the UK. Fresh spices, rice, snacks, and traditional ingredients delivered to your door. Fast UK-wide delivery from Tasty Kerala Ltd.',
  keywords: ['kerala groceries uk', 'kerala food uk', 'kerala products online', 'buy kerala groceries', 'kerala store uk', 'kerala spices uk'],
};

async function getFeaturedProducts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('is_featured', true)
    .eq('is_active', true)
    .gt('stock', 0)
    .limit(8);

  return data as ProductWithDetails[] || [];
}

export default async function KeralaGroceriesUKPage() {
  const products = await getFeaturedProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-green-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Kerala Groceries Online in the UK
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Your trusted source for authentic Kerala products delivered across the United Kingdom. From traditional spices to fresh ingredients, we bring the taste of Kerala to your kitchen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Now
                </Button>
              </Link>
              <Link href="/categories">
                <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Authentic Kerala Products</h3>
              <p className="text-gray-600">
                Genuine Kerala spices, rice, snacks, and ingredients sourced from trusted suppliers. Quality you can trust.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">UK-Wide Delivery</h3>
              <p className="text-gray-600">
                Fast delivery across England, Scotland, Wales, and Northern Ireland. Free delivery on orders over £45.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted by Thousands</h3>
              <p className="text-gray-600">
                Serving the Kerala community across the UK with reliable service and quality products since day one.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="prose prose-lg max-w-none mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Our Kerala Groceries in the UK?</h2>

          <p className="text-gray-700 mb-6">
            Finding authentic <strong>Kerala groceries in the UK</strong> can be challenging. At Kerala Groceries UK, we understand the importance of traditional ingredients and authentic flavors. That's why we've created the UK's most comprehensive online Kerala grocery store, serving customers from London to Edinburgh, Manchester to Cardiff.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">What We Offer</h3>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start">
              <Star className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
              <span><strong>Kerala Spices:</strong> Authentic masalas, curry powders, and whole spices directly from Kerala</span>
            </li>
            <li className="flex items-start">
              <Star className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
              <span><strong>Rice Varieties:</strong> Premium Kerala rice including Matta rice, Jaya rice, and more</span>
            </li>
            <li className="flex items-start">
              <Star className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
              <span><strong>Traditional Snacks:</strong> Banana chips, murukku, mixture, and authentic Kerala snacks</span>
            </li>
            <li className="flex items-start">
              <Star className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
              <span><strong>Cooking Essentials:</strong> Coconut oil, curry leaves, tamarind, and all your cooking needs</span>
            </li>
            <li className="flex items-start">
              <Star className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
              <span><strong>Fresh Ingredients:</strong> Seasonal Kerala vegetables and specialty items when available</span>
            </li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Fast Delivery Across the UK</h3>
          <p className="text-gray-700 mb-6">
            We deliver to every corner of the United Kingdom. Whether you're in London, Birmingham, Manchester, Glasgow, or any other UK city, your Kerala groceries will arrive fresh and on time. We offer next-day delivery for orders placed before 6 PM, and free delivery on all orders over £45.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Shop Kerala Groceries Online with Confidence</h3>
          <p className="text-gray-700 mb-6">
            Operated by <strong>Tasty Kerala Ltd</strong>, we're committed to providing the Kerala community in the UK with authentic products at competitive prices. Our secure checkout ensures your payment information is always protected, and our customer service team is ready to help with any questions.
          </p>
        </div>

        {products.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Kerala Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center">
              <Link href="/products">
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  View All Products
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="bg-green-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Taste Home?</h2>
          <p className="text-xl mb-8 opacity-90">
            Order your Kerala groceries today and enjoy fast UK delivery
          </p>
          <Link href="/products">
            <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
              Start Shopping Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
