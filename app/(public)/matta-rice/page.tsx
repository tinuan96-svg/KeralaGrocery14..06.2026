import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductCard from '@/components/product/ProductCard';
import type { ProductWithDetails } from '@/lib/types/database';
import { Wheat, Truck, Shield, Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Matta Rice - Buy Authentic Kerala Red Rice Online in the UK | Kerala Groceries',
  description: 'Buy authentic Kerala Matta rice (Palakkadan red rice) online in the UK. Rich in fiber, nutrients, and authentic earthy flavor. UK-wide delivery, quality guaranteed.',
  keywords: ['matta rice', 'kerala matta rice uk', 'palakkadan matta rice', 'red rice uk', 'buy matta rice online', 'kerala red rice', 'rose matta rice'],
  alternates: { canonical: '/matta-rice' },
};

async function getMattaRiceProducts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('is_active', true)
    .gt('stock', 0)
    .ilike('name', '%matta%')
    .order('name')
    .limit(8);
  return (data as ProductWithDetails[]) || [];
}

export default async function MattaRicePage() {
  const products = await getMattaRiceProducts();

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-orange-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Wheat className="w-4 h-4" />
              Kerala Rice Specialist
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Matta Rice - Authentic Kerala Red Rice
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Buy genuine Kerala Matta rice online in the UK. Also known as Palakkadan Matta or red rice, this nutrient-rich parboiled rice is the heart of authentic Kerala cuisine. Delivered fresh across the UK.
            </p>
            <Link href="/products?category=rice-grains">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8">
                <Wheat className="mr-2 h-5 w-5" />
                Shop Matta Rice
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Leaf className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">100% Authentic</h3>
              <p className="text-sm text-gray-600">Genuine Palakkadan Matta rice from Kerala</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Nutrient-Rich</h3>
              <p className="text-sm text-gray-600">High in fiber, magnesium, and vitamins</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Wheat className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Multiple Varieties</h3>
              <p className="text-sm text-gray-600">Matta rice, rice flakes, and cooked matta rice</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Fast UK Delivery</h3>
              <p className="text-sm text-gray-600">Free delivery on orders over £45</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What is Matta Rice?</h2>
          <p className="text-gray-700 mb-6">
            <strong>Matta rice</strong>, also known as <strong>Palakkadan Matta rice</strong> or <strong>Kerala red rice</strong>, is a parboiled rice variety native to the Palakkad region of Kerala. Unlike white rice, Matta rice retains its reddish-brown bran layer, giving it a distinctive earthy flavor, firm texture, and rich nutritional profile. It has been a staple of Kerala cuisine for centuries and is the preferred rice for traditional Kerala meals, including the Onam Sadhya.
          </p>
          <p className="text-gray-700 mb-6">
            Matta rice is sometimes called <strong>Rose Matta rice</strong> or <strong>Palakkadan Matta</strong>. The parboiling process drives nutrients from the bran into the grain, making it significantly healthier than regular white rice. It has a lower glycemic index, more fiber, and higher levels of magnesium, potassium, and B vitamins.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Health Benefits of Matta Rice</h2>
          <ul className="space-y-3 mb-6">
            <li><strong>Rich in fiber:</strong> The retained bran layer provides significantly more dietary fiber than white rice, supporting digestion and gut health.</li>
            <li><strong>Lower glycemic index:</strong> Matta rice causes a slower rise in blood sugar compared to white rice, making it a better choice for diabetics and those watching their blood sugar.</li>
            <li><strong>High in magnesium:</strong> Essential for bone health, muscle function, and regulating blood pressure.</li>
            <li><strong>Source of B vitamins:</strong> Particularly B1 (thiamine) and B6, which support energy metabolism and nervous system health.</li>
            <li><strong>Antioxidant properties:</strong> The red pigmentation comes from anthocyanins, the same antioxidants found in berries.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">How to Cook Matta Rice</h2>
          <p className="text-gray-700 mb-6">
            Matta rice requires more water and cooking time than white rice due to its firm texture and retained bran. Here&apos;s how to cook it perfectly:
          </p>
          <ol className="space-y-2 mb-6">
            <li><strong>Rinse:</strong> Wash the rice 2-3 times until the water runs mostly clear.</li>
            <li><strong>Soak:</strong> Soak the rice for 30 minutes to reduce cooking time and improve texture.</li>
            <li><strong>Ratio:</strong> Use 3 cups of water per 1 cup of Matta rice (more than the 2:1 ratio for white rice).</li>
            <li><strong>Cook:</strong> Bring to a boil, then simmer covered for 20-25 minutes until the water is absorbed and the grains are tender but firm.</li>
            <li><strong>Rest:</strong> Let it rest for 5 minutes before fluffing with a fork.</li>
          </ol>
          <p className="text-gray-700 mb-6">
            For a more traditional approach, cook Matta rice in a pressure cooker with 4 cups of water per cup of rice for 3-4 whistles. This produces the soft, fluffy texture preferred for Kerala meals.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Best Dishes to Make with Matta Rice</h2>
          <ul className="space-y-3 mb-6">
            <li><strong>Kerala Sadhya:</strong> The classic use - served with sambar, avial, thorans, and pickles on a banana leaf. <Link href="/onam-sadhya" className="text-orange-600 hover:underline">Learn about Onam Sadhya</Link>.</li>
            <li><strong>Fish Curry Rice:</strong> Matta rice absorbs Kerala fish curry beautifully, balancing the spicy, tangy flavors.</li>
            <li><strong>Beef Fry &amp; Rice:</strong> A Kerala favorite - the firm texture of Matta rice pairs perfectly with spicy beef fry.</li>
            <li><strong>Curd Rice:</strong> Mixed with yogurt and tempered with mustard seeds and curry leaves for a cooling meal.</li>
            <li><strong>Kanji (Rice Porridge)</strong> A comforting, easily digestible porridge made by cooking Matta rice with extra water until soft.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Matta Rice vs White Rice vs Basmati</h2>
          <div className="not-prose mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 px-4 font-semibold">Feature</th>
                  <th className="py-3 px-4 font-semibold">Matta Rice</th>
                  <th className="py-3 px-4 font-semibold">White Rice</th>
                  <th className="py-3 px-4 font-semibold">Basmati Rice</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4">Color</td>
                  <td className="py-3 px-4">Reddish-brown</td>
                  <td className="py-3 px-4">White</td>
                  <td className="py-3 px-4">White (long grain)</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4">Texture</td>
                  <td className="py-3 px-4">Firm, nutty</td>
                  <td className="py-3 px-4">Soft</td>
                  <td className="py-3 px-4">Fluffy, separate</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4">Fiber</td>
                  <td className="py-3 px-4">High</td>
                  <td className="py-3 px-4">Low</td>
                  <td className="py-3 px-4">Low</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4">Glycemic Index</td>
                  <td className="py-3 px-4">Low (52-55)</td>
                  <td className="py-3 px-4">High (70+)</td>
                  <td className="py-3 px-4">Medium (58-62)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Best For</td>
                  <td className="py-3 px-4">Kerala curries, Sadhya</td>
                  <td className="py-3 px-4">General use</td>
                  <td className="py-3 px-4">Biryani, pulao</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Buy Matta Rice in the UK</h2>
          <p className="text-gray-700 mb-6">
            Finding authentic <strong>Palakkadan Matta rice in the UK</strong> used to be difficult. Kerala Groceries UK makes it easy - order online and have genuine Kerala Matta rice delivered to your door anywhere in the UK. We stock whole Matta rice, Matta rice flakes (aval), and pre-cooked Matta rice for convenience.
          </p>
          <p className="text-gray-700 mb-6">
            Explore our full range of <Link href="/products?category=rice-grains" className="text-orange-600 hover:underline">Kerala rice and grains</Link> or learn more about <Link href="/blog/palakkadan-matta-rice" className="text-orange-600 hover:underline">Palakkadan Matta rice</Link> on our blog.
          </p>
        </article>
      </div>

      {products.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Shop Matta Rice Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-orange-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Order Authentic Matta Rice Today</h2>
          <p className="text-xl mb-8 opacity-90">
            Genuine Kerala red rice delivered fresh to your door across the UK
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products?category=rice-grains">
              <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-gray-100">
                Shop Rice &amp; Grains
              </Button>
            </Link>
            <Link href="/onam-sadhya">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Explore Onam Sadhya
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
