import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Star, Shield, Truck } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';

export const metadata: Metadata = {
  title: 'Buy Kerala Spices UK - Authentic Indian Spices Online | Kerala Groceries',
  description: 'Buy authentic Kerala spices online in the UK. Fresh curry powders, masalas, whole spices, and traditional Kerala seasonings. Fast UK delivery, quality guaranteed.',
  keywords: ['buy kerala spices uk', 'kerala masala uk', 'authentic kerala spices', 'indian spices online', 'kerala curry powder', 'buy spices online uk'],
};

async function getSpiceProducts() {
  const supabase = createServerSupabaseClient();
  const { data: spiceCategory } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', '%spice%')
    .maybeSingle();

  if (!spiceCategory) {
    return [];
  }

  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('category_id', spiceCategory.id)
    .eq('is_active', true)
    .gt('stock', 0)
    .limit(8);

  return data as ProductWithDetails[] || [];
}

export default async function BuyKeralaSpicesUKPage() {
  const spiceProducts = await getSpiceProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-gradient-to-b from-orange-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Buy Authentic Kerala Spices in the UK
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Premium quality Kerala spices, masalas, and curry powders delivered fresh to your door. Experience the authentic taste of Kerala with our carefully selected spice range.
            </p>
            <Link href="/products?category=spices">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8">
                <Leaf className="mr-2 h-5 w-5" />
                Shop Kerala Spices
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Leaf className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">100% Authentic</h3>
              <p className="text-sm text-gray-600">Genuine Kerala spices from trusted sources</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Star className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-gray-600">Fresh, aromatic, and flavorful every time</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Quality Tested</h3>
              <p className="text-sm text-gray-600">Checked for purity and authenticity</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Fast UK Delivery</h3>
              <p className="text-sm text-gray-600">Fresh spices delivered quickly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="prose prose-lg max-w-none mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Buy Kerala Spices from Us?</h2>

          <p className="text-gray-700 mb-6">
            When you <strong>buy Kerala spices in the UK</strong> from Kerala Groceries, you're choosing authenticity and quality. Our spices are sourced directly from Kerala, ensuring you get the genuine flavors that make Kerala cuisine so special. Whether you're making a traditional fish curry, beef fry, or any Kerala dish, our spices will deliver authentic taste every time.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Our Kerala Spice Range</h3>

          <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
            <div className="bg-orange-50 p-6 rounded-lg">
              <h4 className="font-semibold text-lg mb-3">Curry Powders & Masalas</h4>
              <ul className="space-y-2 text-gray-700">
                <li>Kerala-style curry powder</li>
                <li>Garam masala</li>
                <li>Fish curry masala</li>
                <li>Chicken masala</li>
                <li>Meat masala</li>
              </ul>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h4 className="font-semibold text-lg mb-3">Whole Spices</h4>
              <ul className="space-y-2 text-gray-700">
                <li>Black pepper (Kali Mirch)</li>
                <li>Cardamom (Elaichi)</li>
                <li>Cinnamon sticks</li>
                <li>Cloves</li>
                <li>Fennel seeds</li>
              </ul>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h4 className="font-semibold text-lg mb-3">Ground Spices</h4>
              <ul className="space-y-2 text-gray-700">
                <li>Turmeric powder (Haldi)</li>
                <li>Red chili powder</li>
                <li>Coriander powder</li>
                <li>Cumin powder</li>
                <li>Kashmiri chili powder</li>
              </ul>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h4 className="font-semibold text-lg mb-3">Specialty Spices</h4>
              <ul className="space-y-2 text-gray-700">
                <li>Curry leaves (fresh when available)</li>
                <li>Mustard seeds</li>
                <li>Fenugreek seeds</li>
                <li>Star anise</li>
                <li>Bay leaves</li>
              </ul>
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Kerala Groceries Difference</h3>

          <h4 className="text-xl font-semibold text-gray-900 mb-3">Freshness Guaranteed</h4>
          <p className="text-gray-700 mb-6">
            We know that fresh spices make all the difference in your cooking. All our <strong>Kerala spices</strong> are regularly restocked to ensure maximum freshness and potency. When you order from us, you're getting spices at their peak flavor and aroma.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mb-3">Authentic Kerala Taste</h4>
          <p className="text-gray-700 mb-6">
            Our spice blends follow traditional Kerala recipes, giving you the authentic taste you remember from home. Each masala is carefully blended to provide the perfect balance of flavors that define Kerala cuisine.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mb-3">Competitive Prices</h4>
          <p className="text-gray-700 mb-6">
            We believe authentic Kerala spices should be accessible to everyone. That's why we offer competitive prices without compromising on quality. Plus, enjoy free delivery on orders over £45.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">How to Use Kerala Spices</h3>
          <p className="text-gray-700 mb-6">
            Kerala spices are versatile and essential for authentic South Indian cooking. Use our curry powders for traditional fish and meat curries, add whole spices to tempering (tadka), and use ground spices as the base for your masalas. Fresh curry leaves add that unmistakable Kerala flavor to any dish.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Storage Tips</h3>
          <p className="text-gray-700 mb-6">
            To maintain freshness, store your Kerala spices in airtight containers away from direct sunlight and heat. Whole spices last longer than ground spices. For maximum flavor, grind whole spices just before use when possible.
          </p>
        </div>

        {spiceProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Kerala Spices</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {spiceProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Start Cooking Authentic Kerala Dishes Today</h2>
            <p className="text-xl mb-8 opacity-90">
              Order your Kerala spices now and bring the taste of Kerala to your kitchen
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products?category=spices">
                <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-gray-100">
                  Browse All Spices
                </Button>
              </Link>
              <Link href="/products">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  View All Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
