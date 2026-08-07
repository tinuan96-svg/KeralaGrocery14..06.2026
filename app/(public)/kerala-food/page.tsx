import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Utensils, Truck, Shield, ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kerala Food - Buy Authentic Kerala Food & Ingredients Online in the UK',
  description: 'Your complete guide to Kerala food in the UK. Shop authentic Kerala rice, spices, snacks, pickles, curry powders, and cooking essentials with fast UK-wide delivery.',
  keywords: ['kerala food', 'kerala food uk', 'authentic kerala food', 'kerala cuisine uk', 'buy kerala food online', 'kerala dishes', 'south indian food uk'],
  alternates: { canonical: '/kerala-food' },
};

async function getKeralaFoodProducts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('is_active', true)
    .gt('stock', 0)
    .eq('is_featured', true)
    .limit(8);
  return (data as ProductWithDetails[]) || [];
}

export default async function KeralaFoodPage() {
  const products = await getKeralaFoodProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-green-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Utensils className="w-4 h-4" />
              Authentic Kerala Cuisine
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Kerala Food - The Complete UK Guide
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Discover the rich flavors of Kerala cuisine. From Matta rice and coconut oil to banana chips and curry powders, buy authentic Kerala food online with fast delivery across the UK.
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shop Kerala Food
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Utensils className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Authentic Cuisine</h3>
              <p className="text-sm text-gray-600">Traditional Kerala ingredients and products</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">UK-Wide Delivery</h3>
              <p className="text-sm text-gray-600">Free delivery on orders over £45</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Quality Assured</h3>
              <p className="text-sm text-gray-600">Sourced from trusted Kerala suppliers</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <ShoppingBag className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">200+ Products</h3>
              <p className="text-sm text-gray-600">The widest range of Kerala food in the UK</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What Makes Kerala Food Special?</h2>
          <p className="text-gray-700 mb-6">
            <strong>Kerala food</strong> is one of India&apos;s most distinctive and beloved regional cuisines. Located on the southwestern coast of India, Kerala&apos;s cuisine is shaped by its tropical climate, abundant coconut palms, spice plantations, and centuries of trade with Arab, Portuguese, Dutch, and British merchants. The result is a culinary tradition that is rich, diverse, and deeply aromatic.
          </p>
          <p className="text-gray-700 mb-6">
            Coconut in all its forms - oil, milk, grated, and cream - is the backbone of Kerala cooking. The state&apos;s spice heritage, particularly black pepper, cardamom, and cloves, gives Kerala food its signature warmth and depth. Whether it&apos;s a simple fish curry or an elaborate <Link href="/kerala-sadhya" className="text-green-600 hover:underline">Sadhya feast</Link>, Kerala cuisine celebrates fresh ingredients and bold flavors.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Essential Kerala Food Categories</h2>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Rice - The Foundation</h3>
          <p className="text-gray-700 mb-6">
            Rice is the staple of every Kerala meal. <Link href="/matta-rice" className="text-green-600 hover:underline">Matta rice</Link> (red rice) is the traditional choice for Kerala meals, prized for its nutty flavor and health benefits. Basmati rice is used for biryanis, while Jaya rice and Idly rice serve specific cooking purposes. <Link href="/products?category=rice-grains" className="text-green-600 hover:underline">Shop Kerala rice</Link>.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Spices &amp; Curry Powders</h3>
          <p className="text-gray-700 mb-6">
            Kerala is the spice garden of India. Authentic Kerala curry powders, garam masala, and spice blends are essential for creating the region&apos;s distinctive flavors. From fish curry masala to meat masala, having the right spice blend makes all the difference. <Link href="/buy-kerala-spices-uk" className="text-green-600 hover:underline">Buy Kerala spices online</Link>.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Snacks &amp; Namkeens</h3>
          <p className="text-gray-700 mb-6">
            Kerala snacks are legendary - crispy banana chips, murukku, mixture, and ribbon pakoda are perfect with tea or as a quick bite. These traditional snacks are fried in coconut oil for authentic flavor. <Link href="/blog/kerala-snacks-uk" className="text-green-600 hover:underline">Discover Kerala snacks</Link> or <Link href="/products?category=snacks-namkeens" className="text-green-600 hover:underline">shop snacks now</Link>.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pickles &amp; Chutneys</h3>
          <p className="text-gray-700 mb-6">
            Kerala pickles (achar) add a fiery, tangy kick to any meal. From mango and lime to fish and gooseberry pickles, these condiments are an essential part of Kerala food culture. <Link href="/products?category=pickles-chutneys" className="text-green-600 hover:underline">Browse Kerala pickles</Link>.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Ready-to-Eat Meals</h3>
          <p className="text-gray-700 mb-6">
            For busy days, Kerala ready-to-eat meals bring authentic flavors to your table in minutes. From curries to <Link href="/onam-sadhya" className="text-green-600 hover:underline">Sadhya essentials</Link>, these convenient options don&apos;t compromise on taste. <Link href="/products?category=ready-to-eat" className="text-green-600 hover:underline">Shop ready-to-eat meals</Link>.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Popular Kerala Dishes You Can Make at Home</h2>
          <ul className="space-y-3 mb-6">
            <li><strong>Kerala Fish Curry (Meen Curry):</strong> Fish simmered in a tangy, spicy coconut gravy with tamarind and curry leaves.</li>
            <li><strong>Beef Fry (Erachi Ularthiyathu):</strong> Spicy, dry beef curry with coconut slivers - a Kerala Christian specialty.</li>
            <li><strong>Avial:</strong> Mixed vegetables in a coconut-yogurt sauce, essential for <Link href="/kerala-sadhya" className="text-green-600 hover:underline">Sadhya</Link>.</li>
            <li><strong>Appam with Stew:</strong> Lacy rice pancakes served with a mild coconut milk vegetable or meat stew.</li>
            <li><strong>Puttu with Kadala Curry:</strong> Steamed rice cylinders with spicy black chickpea curry - a classic Kerala breakfast.</li>
            <li><strong>Payasam:</strong> Sweet Kerala dessert made with rice, lentils, or vermicelli in coconut milk and jaggery.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Kerala Food Culture &amp; Festivals</h2>
          <p className="text-gray-700 mb-6">
            Food is at the heart of Kerala&apos;s culture and festivals. <Link href="/onam-sadhya" className="text-green-600 hover:underline">Onam Sadhya</Link> is the most famous culinary celebration, a 26-dish feast served on banana leaves. Vishu, Kerala New Year, features its own special foods. Even everyday meals in Kerala are an expression of the region&apos;s agricultural abundance and cultural diversity.
          </p>
          <p className="text-gray-700 mb-6">
            Learn more about <Link href="/blog/kerala-festivals-foods" className="text-green-600 hover:underline">Kerala festivals and traditional foods</Link> on our blog.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Buy Kerala Food Online in the UK</h2>
          <p className="text-gray-700 mb-6">
            Kerala Groceries UK is your one-stop shop for authentic Kerala food. With over 200 products ranging from <Link href="/matta-rice" className="text-green-600 hover:underline">Matta rice</Link> and <Link href="/buy-kerala-spices-uk" className="text-green-600 hover:underline">spices</Link> to snacks, pickles, and ready-to-eat meals, we bring the taste of Kerala to your kitchen anywhere in the UK. Order online and enjoy fast, reliable delivery to your door.
          </p>
        </article>
      </div>

      {products.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Featured Kerala Food Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="bg-green-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Bring the Taste of Kerala Home</h2>
          <p className="text-xl mb-8 opacity-90">
            Shop authentic Kerala food with fast UK-wide delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
                Shop All Kerala Food
              </Button>
            </Link>
            <Link href="/kerala-groceries-uk">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                About Our Store
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
