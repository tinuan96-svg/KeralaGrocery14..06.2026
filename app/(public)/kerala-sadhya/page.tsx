import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Utensils, Truck, Shield, Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kerala Sadhya - Traditional Vegetarian Feast Guide & Ingredients | Kerala Groceries',
  description: 'Discover the traditional Kerala Sadhya - a grand vegetarian feast of 26+ dishes served on a banana leaf. Buy authentic Sadhya ingredients online with UK-wide delivery.',
  keywords: ['kerala sadhya', 'sadhya feast', 'kerala vegetarian feast', 'banana leaf meal', 'sadhya dishes', 'kerala sadhya uk', 'traditional kerala food'],
  alternates: { canonical: '/kerala-sadhya' },
};

async function getSadhyaProducts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('is_active', true)
    .gt('stock', 0)
    .or('name.ilike.%rice%,name.ilike.%pickle%,name.ilike.%curry%,name.ilike.%papad%,name.ilike.%banana chip%')
    .order('name')
    .limit(8);
  return (data as ProductWithDetails[]) || [];
}

export default async function KeralaSadhyaPage() {
  const products = await getSadhyaProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-green-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Leaf className="w-4 h-4" />
              Kerala Tradition
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Kerala Sadhya - The Grand Vegetarian Feast
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Explore the rich tradition of Kerala Sadhya - a magnificent vegetarian feast of 26+ dishes served on a fresh banana leaf. Find every ingredient you need to create this authentic Kerala meal at home in the UK.
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                <Utensils className="mr-2 h-5 w-5" />
                Shop Sadhya Ingredients
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Utensils className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">26+ Dishes</h3>
              <p className="text-sm text-gray-600">A complete feast with curries, stir-fries, pickles, and dessert</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Delivered in the UK</h3>
              <p className="text-sm text-gray-600">All ingredients delivered fresh to your door</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Authentic Taste</h3>
              <p className="text-sm text-gray-600">Traditional Kerala ingredients from trusted suppliers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What is a Kerala Sadhya?</h2>
          <p className="text-gray-700 mb-6">
            A <strong>Kerala Sadhya</strong> is a traditional vegetarian feast served on a fresh banana leaf. It is the centerpiece of Kerala&apos;s festival celebrations, particularly during <Link href="/onam-sadhya" className="text-green-600 hover:underline">Onam</Link>, Vishu, and weddings. A grand Sadhya can feature anywhere from 20 to 30 distinct dishes, each contributing a unique flavor, texture, and nutritional element to the meal.
          </p>
          <p className="text-gray-700 mb-6">
            The Sadhya is not just a meal - it is a cultural experience. Every element, from the order of dishes on the banana leaf to the sequence of serving, follows centuries of tradition. The meal embodies the Ayurvedic principle of including all six rasas (sweet, sour, salty, bitter, pungent, and astringent) in a single sitting for balanced nutrition.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Complete Sadhya Menu</h2>
          <p className="text-gray-700 mb-6">
            A traditional Kerala Sadhya includes the following dishes, arranged on the banana leaf from left to right:
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Starting from the Left</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Upperi (Banana Chips):</strong> Fried banana chips, sweet or salted. <Link href="/products?category=snacks-namkeens" className="text-green-600 hover:underline">Shop banana chips</Link>.</li>
            <li><strong>Sharkara Upperi:</strong> Jaggery-coated banana chips</li>
            <li><strong>Pappadum:</strong> Crispy lentil wafers</li>
            <li><strong>Pickle (Achar):</strong> Mango or lime pickle for a spicy kick. <Link href="/products?category=pickles-chutneys" className="text-green-600 hover:underline">Browse Kerala pickles</Link>.</li>
            <li><strong>Inji Curry:</strong> Ginger curry, a digestive aid</li>
            <li><strong>Lemon Curry:</strong> Tangy lemon-based curry</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Main Curries</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Parippu:</strong> Moong dal with ghee, the first curry served over rice</li>
            <li><strong>Sambar:</strong> The iconic lentil and vegetable stew with tamarind</li>
            <li><strong>Avial:</strong> Mixed vegetables with coconut and yogurt - a Sadhya must-have</li>
            <li><strong>Thoran:</strong> Dry stir-fry of cabbage, beans, or carrot with grated coconut</li>
            <li><strong>Olan:</strong> Ash gourd and cowpeas in coconut milk</li>
            <li><strong>Erissery:</strong> Pumpkin and lentils with coconut</li>
            <li><strong>Kootu Curry:</strong> Chickpeas and raw banana with coconut</li>
            <li><strong>Pulisseri:</strong> Tangy yogurt and coconut curry</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Rice</h3>
          <p className="text-gray-700 mb-6">
            The foundation of every Sadhya is <strong>Kerala Matta rice</strong> - the reddish-brown parboiled rice with its distinctive earthy flavor and firm texture. <Link href="/matta-rice" className="text-green-600 hover:underline">Buy authentic Matta rice online</Link> for your Sadhya.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">The Dessert (Pradhaman)</h3>
          <ul className="space-y-2 mb-6">
            <li><strong>Ada Pradhaman:</strong> Rice flakes cooked in coconut milk and jaggery - the king of payasams</li>
            <li><strong>Parippu Payasam:</strong> Lentil payasam with coconut and jaggery</li>
            <li><strong>Semiya Payasam:</strong> Vermicelli payasam with milk and nuts</li>
          </ul>
          <p className="text-gray-700 mb-6">
            <Link href="/products?category=sweets" className="text-green-600 hover:underline">Explore Kerala sweets and payasam ingredients</Link>.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Order of a Sadhya</h2>
          <p className="text-gray-700 mb-6">
            A Sadhya follows a specific sequence that aids digestion and enhances the dining experience:
          </p>
          <ol className="space-y-2 mb-6">
            <li>Rice is served first, with a dollop of ghee</li>
            <li>Parippu (dal) is poured over the rice and eaten first</li>
            <li>Sambar is served next, followed by the other curries</li>
            <li>Dry dishes like thoran and upperi are enjoyed alongside</li>
            <li>Pulisseri or moru (buttermilk) comes toward the end</li>
            <li>Payasam is served last, eaten warm as the sweet finale</li>
          </ol>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">When is Sadhya Served?</h2>
          <p className="text-gray-700 mb-6">
            Sadhya is traditionally served for lunch, the main meal of the day in Kerala. It is prepared for:
          </p>
          <ul className="space-y-2 mb-6">
            <li><strong>Onam:</strong> The most famous Sadhya, served on Thiruvonam day. <Link href="/onam-sadhya" className="text-green-600 hover:underline">Learn about Onam Sadhya</Link>.</li>
            <li><strong>Vishu:</strong> Kerala New Year, celebrated in April</li>
            <li><strong>Weddings:</strong> Kerala Hindu and Christian weddings feature a grand Sadhya</li>
            <li><strong>Temple Festivals:</strong> Many Kerala temples serve Sadhya as prasadam</li>
            <li><strong>Family Gatherings:</strong> Any special occasion calls for a Sadhya</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Creating a Sadhya at Home in the UK</h2>
          <p className="text-gray-700 mb-6">
            You don&apos;t need to be in Kerala to enjoy an authentic Sadhya. With the right ingredients from Kerala Groceries UK, you can create a traditional feast in your own kitchen. Start with <Link href="/matta-rice" className="text-green-600 hover:underline">Matta rice</Link>, add a few key curries like sambar and avial, include some pickles and banana chips, and finish with payasam. Even a simplified version with 8-10 dishes captures the essence of a Kerala Sadhya.
          </p>
          <p className="text-gray-700 mb-6">
            For more inspiration, read our <Link href="/blog/top-10-kerala-foods-uk" className="text-green-600 hover:underline">guide to the top 10 Kerala foods in the UK</Link> or explore our full range of <Link href="/kerala-food" className="text-green-600 hover:underline">Kerala food products</Link>.
          </p>
        </article>
      </div>

      {products.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Sadhya Essentials</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-green-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Create Your Kerala Sadhya at Home</h2>
          <p className="text-xl mb-8 opacity-90">
            Shop authentic Sadhya ingredients with UK-wide delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
                Shop All Products
              </Button>
            </Link>
            <Link href="/onam-sadhya">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Onam Sadhya Guide
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
