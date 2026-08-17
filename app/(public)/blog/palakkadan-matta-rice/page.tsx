import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag, Wheat } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Palakkadan Matta Rice: The King of Kerala Rice - Complete Guide',
  description: 'Everything you need to know about Palakkadan Matta rice - the authentic Kerala red rice. Learn about its health benefits, how to cook it, and where to buy it in the UK.',
  keywords: ['palakkadan matta rice', 'matta rice', 'kerala red rice', 'rose matta rice', 'palakkadan matta', 'buy matta rice uk', 'kerala rice uk'],
  alternates: { canonical: '/blog/palakkadan-matta-rice' },
};

export default function PalakkadanMattaRicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>

        <article className="prose prose-lg max-w-none">
          <header className="mb-8">
            <div className="mb-4">
              <span className="inline-block bg-orange-100 text-orange-800 text-sm font-semibold px-3 py-1 rounded-full">
                Ingredient Guide
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Palakkadan Matta Rice: The King of Kerala Rice
            </h1>
            <p className="text-xl text-gray-600">
              Discover the history, health benefits, and cooking secrets of Palakkadan Matta rice - the authentic red rice that defines Kerala cuisine. Plus, where to buy it in the UK.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
              <span>Updated: August 7, 2026</span>
              <span>•</span>
              <span>7 min read</span>
            </div>
          </header>

          <div className="bg-orange-50 border-l-4 border-orange-600 p-6 mb-8 rounded">
            <p className="text-gray-700 mb-0">
              <strong>Did you know?</strong> Palakkadan Matta rice has a GI (Geographical Indication) tag, recognizing it as a unique agricultural product of the Palakkad region in Kerala.
            </p>
          </div>

          <p className="lead">
            If there&apos;s one ingredient that defines Kerala cuisine, it&apos;s <strong>Palakkadan Matta rice</strong>. This reddish-brown parboiled rice, with its earthy flavor and firm texture, is the foundation of every traditional Kerala meal - from everyday lunches to the grand Onam Sadhya. Here&apos;s everything you need to know about this remarkable rice variety.
          </p>

          <h2>What is Palakkadan Matta Rice?</h2>
          <p>
            <strong>Palakkadan Matta rice</strong> is a specific variety of parboiled red rice grown in the Palakkad district of Kerala. The name &quot;Matta&quot; refers to the rice&apos;s distinctive reddish-brown color, which comes from the retained bran layer. Unlike white rice, which is polished to remove the bran, Matta rice keeps its outer layer, preserving its natural color, nutrients, and flavor.
          </p>
          <p>
            The parboiling process is key to Matta rice&apos;s character. The rice paddy is partially boiled with the husk before milling. This drives nutrients from the bran into the grain, making the rice more nutritious and giving it a firm, separate-grain texture when cooked. The result is a rice that&apos;s filling, flavorful, and significantly healthier than regular white rice.
          </p>

          <h2>The History of Matta Rice</h2>
          <p>
            Matta rice has been cultivated in Kerala for centuries, particularly in the Palakkad region, which is known as the &quot;granary of Kerala.&quot; The region&apos;s unique climate, soil, and water from the Western Ghats create the perfect conditions for growing this distinctive rice variety.
          </p>
          <p>
            Historically, Matta rice was the everyday rice of Kerala households. It was only with the introduction of cheaper, faster-cooking white rice that Matta rice became more of a specialty item. Today, it&apos;s prized for its health benefits and authentic Kerala flavor, and is the mandatory rice for a traditional <Link href="/kerala-sadhya" className="text-green-600 hover:underline">Kerala Sadhya</Link>.
          </p>

          <h2>Health Benefits of Palakkadan Matta Rice</h2>
          <p>
            Matta rice is significantly healthier than white rice. Here&apos;s why:
          </p>

          <h3>Rich in Fiber</h3>
          <p>
            The retained bran layer provides 3-4 times more dietary fiber than white rice. Fiber supports digestion, promotes gut health, and helps you feel full longer.
          </p>

          <h3>Lower Glycemic Index</h3>
          <p>
            Matta rice has a glycemic index (GI) of approximately 52-55, compared to 70+ for white rice. This means it causes a slower, steadier rise in blood sugar, making it a better choice for people with diabetes or those watching their blood sugar levels.
          </p>

          <h3>High in Magnesium</h3>
          <p>
            A single serving of Matta rice provides a significant portion of your daily magnesium needs. Magnesium is essential for bone health, muscle function, nerve function, and regulating blood pressure.
          </p>

          <h3>Source of B Vitamins</h3>
          <p>
            The parboiling process preserves B vitamins, particularly thiamine (B1) and pyridoxine (B6), which are largely lost in the polishing of white rice. These vitamins support energy metabolism and nervous system health.
          </p>

          <h3>Antioxidant Properties</h3>
          <p>
            The red pigmentation in Matta rice comes from anthocyanins - the same antioxidants found in blueberries and red cabbage. These compounds help protect cells from oxidative damage.
          </p>

          <h2>Matta Rice vs Other Rice Varieties</h2>
          <p>
            How does Palakkadan Matta rice compare to other common rice varieties?
          </p>
          <ul>
            <li><strong>vs White Rice:</strong> Matta rice has more fiber, lower GI, and higher nutrient content. It takes longer to cook but is significantly healthier.</li>
            <li><strong>vs Basmati Rice:</strong> Basmati is long-grain and fragrant, ideal for biryanis. Matta is short-grain, earthy, and better for Kerala curries. <Link href="/products?category=rice-grains" className="text-green-600 hover:underline">Compare rice varieties</Link>.</li>
            <li><strong>vs Brown Rice:</strong> Both retain the bran, but Matta rice is parboiled, giving it a different texture and slightly higher nutrient availability.</li>
            <li><strong>vs Jaya Rice:</strong> Jaya is a white Kerala rice used for everyday meals. Matta is healthier and more traditional.</li>
          </ul>

          <h2>How to Cook Matta Rice Perfectly</h2>
          <p>
            Cooking Matta rice requires more water and time than white rice. Here&apos;s the method for perfect results every time:
          </p>

          <h3>Stovetop Method</h3>
          <ol>
            <li><strong>Rinse:</strong> Wash 1 cup of Matta rice 2-3 times until water runs mostly clear.</li>
            <li><strong>Soak:</strong> Soak in water for 30 minutes (optional but recommended for softer texture).</li>
            <li><strong>Boil:</strong> Add 3 cups of fresh water (3:1 ratio). Bring to a rolling boil.</li>
            <li><strong>Simmer:</strong> Reduce heat to low, cover tightly, and simmer for 20-25 minutes.</li>
            <li><strong>Rest:</strong> Remove from heat and let rest, covered, for 5 minutes.</li>
            <li><strong>Fluff:</strong> Fluff gently with a fork before serving.</li>
          </ol>

          <h3>Pressure Cooker Method (Traditional Kerala Style)</h3>
          <ol>
            <li>Rinse and soak 1 cup Matta rice for 30 minutes.</li>
            <li>Add 4 cups of water (4:1 ratio for pressure cooker).</li>
            <li>Cook on medium heat for 3-4 whistles.</li>
            <li>Let pressure release naturally before opening.</li>
          </ol>

          <h2>Best Dishes to Make with Matta Rice</h2>
          <ul>
            <li><strong><Link href="/kerala-sadhya" className="text-green-600 hover:underline">Kerala Sadhya</Link>:</strong> The traditional use - served with sambar, avial, thorans, and pickles.</li>
            <li><strong>Kerala Fish Curry:</strong> Matta rice absorbs the tangy, spicy gravy beautifully.</li>
            <li><strong>Beef Fry &amp; Rice:</strong> A Kerala Christian classic - the firm rice complements the spicy beef.</li>
            <li><strong>Curd Rice:</strong> Mixed with yogurt and tempered with mustard seeds and curry leaves.</li>
            <li><strong>Kanji (Rice Porridge):</strong> Comforting rice gruel, easy to digest and perfect for rainy days.</li>
          </ul>

          <h2>Where to Buy Palakkadan Matta Rice in the UK</h2>
          <p>
            Finding authentic Palakkadan Matta rice in the UK used to mean searching through specialty shops. Now you can <Link href="/matta-rice" className="text-green-600 hover:underline">buy Matta rice online</Link> from Kerala Groceries UK with fast delivery across the country. We stock:
          </p>
          <ul>
            <li><strong>Matta Rice (5kg):</strong> The classic whole grain for everyday Kerala meals. <Link href="/matta-rice" className="text-green-600 hover:underline">Shop now</Link>.</li>
            <li><strong>Matta Rice Flakes (Aval):</strong> Flattened Matta rice for snacks and payasam.</li>
            <li><strong>Cooked Matta Rice:</strong> Ready-to-eat for convenience.</li>
          </ul>

          <h2>Storage Tips</h2>
          <ul>
            <li>Store in an airtight container in a cool, dry place</li>
            <li>Keeps for up to 12 months when stored properly</li>
            <li>For longer storage, keep in the refrigerator</li>
            <li>Always check for any signs of moisture or pests before cooking</li>
          </ul>

          <div className="bg-orange-50 border-2 border-orange-600 rounded-xl p-8 my-8 not-prose">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Cook Authentic Kerala Meals?</h3>
            <p className="text-gray-700 mb-6">
              Order Palakkadan Matta rice and bring the authentic taste of Kerala to your kitchen
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/matta-rice">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
                  <Wheat className="mr-2 h-5 w-5" />
                  Shop Matta Rice
                </Button>
              </Link>
              <Link href="/products?category=rice-grains">
                <Button size="lg" variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50 w-full sm:w-auto">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  All Rice &amp; Grains
                </Button>
              </Link>
            </div>
          </div>

          <h3>Related Articles</h3>
          <ul>
            <li><Link href="/blog/top-10-kerala-foods-uk" className="text-green-600 hover:underline">Top 10 Kerala Foods You Can Buy in the UK</Link></li>
            <li><Link href="/blog/kerala-snacks-uk" className="text-green-600 hover:underline">Kerala Snacks UK - The Complete Guide</Link></li>
            <li><Link href="/onam-sadhya" className="text-green-600 hover:underline">Onam Sadhya - Traditional Kerala Feast Guide</Link></li>
            <li><Link href="/kerala-sadhya" className="text-green-600 hover:underline">Kerala Sadhya - The Grand Vegetarian Feast</Link></li>
          </ul>
        </article>
      </div>
    </div>
  );
}
