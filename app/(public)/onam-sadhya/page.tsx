import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Flower2, Utensils, Truck, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Onam Sadhya - Traditional Kerala Feast Delivered in the UK | Kerala Groceries',
  description: 'Celebrate Onam with an authentic Sadhya feast at home. Buy all the essential ingredients for a traditional Kerala Onam Sadhya with UK-wide delivery. Rice, curries, pickles, and payasam.',
  keywords: ['onam sadhya', 'onam sadhya uk', 'kerala sadhya', 'onam feast', 'traditional kerala sadhya', 'onam food', 'sadhya ingredients uk'],
  alternates: { canonical: '/onam-sadhya' },
};

async function getSadhyaProducts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('is_active', true)
    .gt('stock', 0)
    .or('name.ilike.%rice%,name.ilike.%pickle%,name.ilike.%curry%,name.ilike.%payasam%,name.ilike.%banana chip%,name.ilike.%papad%')
    .order('name')
    .limit(8);
  return (data as ProductWithDetails[]) || [];
}

export default async function OnamSadhyaPage() {
  const products = await getSadhyaProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-amber-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Flower2 className="w-4 h-4" />
              Kerala Festival Special
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Onam Sadhya - The Traditional Kerala Feast
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Bring the grandeur of Onam to your home in the UK. Shop authentic ingredients for a complete Sadhya feast - from Matta rice to avial, sambar, pickles, and payasam. Delivered fresh across the UK.
            </p>
            <Link href="/products?category=rice-grains">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
                <Utensils className="mr-2 h-5 w-5" />
                Shop Sadhya Essentials
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Flower2 className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Authentic Ingredients</h3>
              <p className="text-sm text-gray-600">Everything you need for a traditional 26-dish Sadhya</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">UK-Wide Delivery</h3>
              <p className="text-sm text-gray-600">Fresh ingredients delivered to your door, free over £45</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Quality Guaranteed</h3>
              <p className="text-sm text-gray-600">Sourced from trusted Kerala suppliers for authentic taste</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What is Onam Sadhya?</h2>
          <p className="text-gray-700 mb-6">
            <strong>Onam Sadhya</strong> is the grand vegetarian feast served on Thiruvonam, the main day of the Onam festival in Kerala. Served on a fresh banana leaf, a traditional Sadhya features up to 26 distinct dishes, each with its own unique flavor, texture, and significance. It is the centerpiece of Onam celebrations and a celebration of Kerala&apos;s rich culinary heritage.
          </p>
          <p className="text-gray-700 mb-6">
            The word <em>Sadhya</em> means &quot;banquet&quot; in Malayalam. A complete Onam Sadhya includes rice as the base, surrounded by an array of curries, stir-fries, pickles, pappadums, banana chips, and a sweet payasam to finish. Every dish is carefully placed on the banana leaf in a specific order, creating a balanced meal that covers all six rasas (tastes) of Ayurveda.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Essential Dishes in an Onam Sadhya</h2>
          <p className="text-gray-700 mb-6">
            A traditional Onam Sadhya includes the following key dishes. You can find all the ingredients for these at Kerala Groceries UK:
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Base</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Kerala Matta Rice</strong> - The reddish-brown parboiled rice that forms the foundation of the Sadhya. Its earthy flavor and firm texture hold up perfectly against the rich curries. <Link href="/matta-rice" className="text-amber-600 hover:underline">Buy Matta Rice online</Link>.</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Curries</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Sambar</strong> - A lentil-based vegetable stew with tamarind and spices</li>
            <li><strong>Parippu</strong> - Moong dal with ghee and turmeric, the first curry served</li>
            <li><strong>Avial</strong> - A mixed vegetable dish with coconut and yogurt</li>
            <li><strong>Olan</strong> - Ash gourd and cowpeas cooked in coconut milk</li>
            <li><strong>Erissery</strong> - Pumpkin and lentils with grated coconut</li>
            <li><strong>Kootu Curry</strong> - Chickpeas and raw banana with coconut</li>
            <li><strong>Pulisseri</strong> - A tangy yogurt-based curry with coconut</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Accompaniments</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Pickle (Achar)</strong> - Mango, lime, or gooseberry pickles add a spicy-tangy kick. <Link href="/products?category=pickles-chutneys" className="text-amber-600 hover:underline">Browse Kerala pickles</Link>.</li>
            <li><strong>Pappadum</strong> - Crispy lentil wafers that add crunch to every bite</li>
            <li><strong>Banana Chips</strong> - Kerala&apos;s signature snack, fried in coconut oil. <Link href="/products?category=snacks-namkeens" className="text-amber-600 hover:underline">Shop banana chips</Link>.</li>
            <li><strong>Sharkara Upperi</strong> - Jaggery-coated banana chips, a Sadhya special</li>
            <li><strong>Thoran</strong> - Dry vegetable stir-fry with grated coconut</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Dessert</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Payasam</strong> - The sweet finale. Ada pradhaman (rice flakes), parippu payasam (lentil), or semiya payasam (vermicelli) cooked in coconut milk and jaggery. <Link href="/products?category=sweets" className="text-amber-600 hover:underline">Explore Kerala sweets</Link>.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">How to Serve Onam Sadhya</h2>
          <p className="text-gray-700 mb-6">
            A traditional Sadhya is served on a fresh banana leaf, with the narrow end pointing to the left. The meal is eaten seated on the floor, and each dish is placed in a specific position on the leaf. Rice is served in the center, with curries arranged around it. The meal begins with parippu and ghee, progresses through the curries and accompaniments, and concludes with payasam.
          </p>
          <p className="text-gray-700 mb-6">
            You don&apos;t need a banana leaf to enjoy a Sadhya at home. Simply prepare the dishes and serve them in small bowls alongside a plate of <Link href="/matta-rice" className="text-amber-600 hover:underline">Kerala Matta rice</Link>. The key is variety - the more dishes, the more authentic the experience.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Onam Sadhya Tips for UK Homes</h2>
          <ul className="space-y-3 mb-6">
            <li><strong>Start early:</strong> Many Sadhya dishes can be prepared a day in advance and reheated, which actually improves the flavors.</li>
            <li><strong>Use coconut oil:</strong> Authentic Kerala flavor comes from coconut oil. Use it for tempering and frying. <Link href="/products?category=oils-ghee" className="text-amber-600 hover:underline">Buy coconut oil</Link>.</li>
            <li><strong>Get fresh curry leaves:</strong> No Kerala dish is complete without them. <Link href="/blog/where-to-buy-curry-leaves-uk" className="text-amber-600 hover:underline">Find curry leaves in the UK</Link>.</li>
            <li><strong>Prep the payasam last:</strong> Serve it warm for the best taste and texture.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Celebrate Onam in the UK</h2>
          <p className="text-gray-700 mb-6">
            Onam typically falls in August or September, during the Malayalam month of Chingam. Whether you&apos;re hosting a large gathering or enjoying an intimate family meal, Kerala Groceries UK has everything you need to create an authentic Onam Sadhya. All ingredients are sourced from trusted Kerala suppliers and delivered fresh to your door anywhere in the UK.
          </p>
          <p className="text-gray-700 mb-6">
            Learn more about <Link href="/kerala-sadhya" className="text-amber-600 hover:underline">Kerala Sadhya</Link> and explore our <Link href="/blog/top-10-kerala-foods-uk" className="text-amber-600 hover:underline">top 10 Kerala foods guide</Link> for more inspiration.
          </p>
        </article>
      </div>

      {products.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Sadhya Essentials - Shop Now</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Onam Sadhya?</h2>
          <p className="text-xl mb-8 opacity-90">
            Order your Sadhya ingredients today and celebrate Onam the authentic way
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-gray-100">
                Shop All Products
              </Button>
            </Link>
            <Link href="/kerala-sadhya">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Learn About Kerala Sadhya
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
