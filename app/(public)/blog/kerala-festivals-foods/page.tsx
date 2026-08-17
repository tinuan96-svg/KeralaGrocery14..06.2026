import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag, Flower2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kerala Festivals and Traditional Foods - A Complete Guide',
  description: 'Explore the rich connection between Kerala festivals and traditional foods. From Onam Sadhya to Vishu kanji, discover the dishes that make Kerala celebrations special.',
  keywords: ['kerala festivals', 'kerala festival foods', 'onam food', 'vishu food', 'kerala sadhya', 'kerala traditional food', 'kerala festival dishes'],
  alternates: { canonical: '/blog/kerala-festivals-foods' },
};

export default function KeralaFestivalsFoodsPage() {
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
              <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                Culture &amp; Food
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Kerala Festivals and Traditional Foods - A Complete Guide
            </h1>
            <p className="text-xl text-gray-600">
              Kerala&apos;s festivals are inseparable from its food. From the grand Onam Sadhya to the simple Vishu kanji, discover the traditional dishes that define Kerala&apos;s celebrations.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
              <span>Updated: August 7, 2026</span>
              <span>•</span>
              <span>8 min read</span>
            </div>
          </header>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 mb-8 rounded">
            <p className="text-gray-700 mb-0">
              <strong>Did you know?</strong> Kerala celebrates more than 30 festivals throughout the year, and nearly every one has a specific traditional food associated with it. Food is not just sustenance in Kerala - it&apos;s a way of celebrating life, community, and heritage.
            </p>
          </div>

          <p className="lead">
            In Kerala, food and festivals are deeply intertwined. Each celebration has its own special dishes, rituals, and traditions that have been passed down through generations. Whether you&apos;re celebrating in Kerala or recreating the experience in the UK, understanding these food traditions brings you closer to the heart of Kerala culture.
          </p>

          <h2>Onam - The Grand Kerala Festival</h2>
          <p>
            <strong>Onam</strong> is Kerala&apos;s most important festival, a 10-day harvest celebration that typically falls in August or September. The highlight of Onam is the <strong>Onam Sadhya</strong> - a grand vegetarian feast served on a banana leaf with 26+ dishes.
          </p>
          <p>
            The Onam Sadhya includes <Link href="/matta-rice" className="text-green-600 hover:underline">Matta rice</Link>, sambar, avial, thoran, olan, erissery, pickles, pappadum, banana chips, and payasam. The meal is served on a fresh banana leaf, with each dish placed in a specific position. <Link href="/onam-sadhya" className="text-green-600 hover:underline">Learn more about Onam Sadhya</Link>.
          </p>
          <p>
            Key Onam foods:
          </p>
          <ul>
            <li><strong>Ada Pradhaman:</strong> The signature Onam dessert - rice flakes in coconut milk and jaggery</li>
            <li><strong>Avial:</strong> Mixed vegetable curry with coconut, a Sadhya must-have</li>
            <li><strong>Sharkara Upperi:</strong> Jaggery-coated banana chips, exclusive to Onam</li>
            <li><strong>Parippu Curry:</strong> Moong dal with ghee, the first dish served</li>
          </ul>

          <h2>Vishu - Kerala New Year</h2>
          <p>
            <strong>Vishu</strong> marks the Malayalam New Year, usually in April. The day begins with the <em>Vishukkani</em> - an auspicious arrangement of rice, coconut, flowers, gold, and other items viewed first thing in the morning for good fortune.
          </p>
          <p>
            The Vishu feast, called <strong>Vishu Sadhya</strong>, is a grand meal similar to Onam Sadhya but with some unique dishes:
          </p>
          <ul>
            <li><strong>Vishu Kanji:</strong> A special rice porridge made with coconut milk</li>
            <li><strong>Vishu Katta:</strong> Rice flour and coconut milk dish, a Vishu specialty</li>
            <li><strong>Vegetable Thoran:</strong> Seasonal vegetables stir-fried with coconut</li>
            <li><strong>Mango Pickle:</strong> Fresh mango pickle, as Vishu falls during mango season</li>
          </ul>

          <h2>Thrissur Pooram</h2>
          <p>
            While <strong>Thrissur Pooram</strong> is primarily a temple festival known for its magnificent elephant procession and fireworks, it also features unique food traditions. The festival brings together communities for shared meals, with special emphasis on:
          </p>
          <ul>
            <li><strong>Payasam:</strong> Multiple varieties served to festival-goers</li>
            <li><strong>Unniyappam:</strong> Sweet rice and jaggery fritters, a temple prasadam</li>
            <li><strong>Banana Chips:</strong> Made fresh and distributed during the festival</li>
          </ul>

          <h2>Christmas - Kerala Christian Traditions</h2>
          <p>
            Kerala has a significant Christian population, and <strong>Christmas</strong> is celebrated with unique Kerala-style feasts. The traditional Christmas meal includes:
          </p>
          <ul>
            <li><strong>Appam with Stew:</strong> Lacy rice pancakes with coconut milk chicken or vegetable stew</li>
            <li><strong>Beef Fry (Erachi Ularthiyathu):</strong> Kerala-style spicy beef, a Christmas essential</li>
            <li><strong>Plum Cake:</strong> Kerala&apos;s famous Christmas fruit cake, rich with dried fruits and spices</li>
            <li><strong>Achappam:</strong> Rose cookies, a traditional Christmas snack</li>
            <li><strong>Mutton Stew:</strong> Mild, coconut milk-based mutton curry</li>
          </ul>

          <h2>Easter in Kerala</h2>
          <p>
            <strong>Easter</strong> in Kerala features its own special foods:
          </p>
          <ul>
            <li><strong>Easter Appam:</strong> Special sweet appam made with rice flour and jaggery</li>
            <li><strong>Chicken Curry:</strong> Kerala-style chicken curry for the Easter feast</li>
            <li><strong>Payasam:</strong> Sweet dessert to celebrate the occasion</li>
          </ul>

          <h2>Diwali in Kerala</h2>
          <p>
            While <strong>Diwali</strong> is more elaborately celebrated in North India, Kerala also observes it with special snacks and sweets:
          </p>
          <ul>
            <li><strong>Murukku:</strong> Spiral-shaped savory snack, a Diwali favorite. <Link href="/blog/kerala-snacks-uk" className="text-green-600 hover:underline">Learn about Kerala snacks</Link>.</li>
            <li><strong>Mixture:</strong> Spicy snack mix with sev, boondi, and nuts</li>
            <li><strong>Laddu and Halwa:</strong> Traditional Indian sweets</li>
          </ul>

          <h2>Eid in Kerala</h2>
          <p>
            Kerala&apos;s Muslim community celebrates <strong>Eid</strong> with distinctive Kerala-Mughlai fusion dishes:
          </p>
          <ul>
            <li><strong>Biriyani:</strong> Kerala-style Malabar biriyani with basmati rice and meat</li>
            <li><strong>Pathiri:</strong> Thin rice flour rotis served with meat curry</li>
            <li><strong>Chatti Pathiri:</strong> Layered rice pancake with sweet or savory filling</li>
            <li><strong>Sulaimani Tea:</strong> Spiced black tea, a post-meal tradition</li>
          </ul>

          <h2>Everyday Kerala Food Traditions</h2>
          <p>
            Beyond festivals, Kerala has daily food traditions worth celebrating:
          </p>
          <ul>
            <li><strong>Sadya on weekends:</strong> Many families prepare a mini-Sadhya for Sunday lunch. <Link href="/kerala-sadhya" className="text-green-600 hover:underline">Learn about Kerala Sadhya</Link>.</li>
            <li><strong>Tea time snacks:</strong> Banana chips and <Link href="/blog/kerala-snacks-uk" className="text-green-600 hover:underline">Kerala snacks</Link> with evening chai</li>
            <li><strong>Pathiri nights:</strong> In Malabar households, pathiri with meat curry is a dinner staple</li>
          </ul>

          <h2>Celebrating Kerala Festivals in the UK</h2>
          <p>
            You don&apos;t need to be in Kerala to celebrate these traditions. Kerala Groceries UK provides all the ingredients you need to recreate Kerala festival foods at home:
          </p>
          <ul>
            <li><strong>Onam Sadhya:</strong> Shop <Link href="/matta-rice" className="text-green-600 hover:underline">Matta rice</Link>, pickles, and curry powders for your feast</li>
            <li><strong>Vishu:</strong> Find rice, coconut products, and spices for Vishu kanji</li>
            <li><strong>Christmas:</strong> Buy appam flour, coconut milk, and spices for Kerala-style Christmas dinner</li>
            <li><strong>Everyday:</strong> Explore our full range of <Link href="/kerala-food" className="text-green-600 hover:underline">Kerala food products</Link></li>
          </ul>

          <div className="bg-green-50 border-2 border-green-600 rounded-xl p-8 my-8 not-prose">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Celebrate Kerala in the UK</h3>
            <p className="text-gray-700 mb-6">
              Shop authentic Kerala ingredients for every festival and tradition
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop All Products
                </Button>
              </Link>
              <Link href="/onam-sadhya">
                <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 w-full sm:w-auto">
                  <Flower2 className="mr-2 h-5 w-5" />
                  Onam Sadhya Guide
                </Button>
              </Link>
            </div>
          </div>

          <h3>Related Articles</h3>
          <ul>
            <li><Link href="/blog/top-10-kerala-foods-uk" className="text-green-600 hover:underline">Top 10 Kerala Foods You Can Buy in the UK</Link></li>
            <li><Link href="/blog/kerala-snacks-uk" className="text-green-600 hover:underline">Kerala Snacks UK - The Complete Guide</Link></li>
            <li><Link href="/blog/palakkadan-matta-rice" className="text-green-600 hover:underline">Palakkadan Matta Rice: The King of Kerala Rice</Link></li>
            <li><Link href="/kerala-sadhya" className="text-green-600 hover:underline">Kerala Sadhya - The Grand Vegetarian Feast</Link></li>
            <li><Link href="/onam-sadhya" className="text-green-600 hover:underline">Onam Sadhya - Traditional Kerala Feast Guide</Link></li>
          </ul>
        </article>
      </div>
    </div>
  );
}
