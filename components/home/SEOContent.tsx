import { Package, Truck, ShieldCheck, Star, Award, Zap } from 'lucide-react';

export default function SEOContent() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
          Premium Kerala Groceries Online UK
        </h1>
        <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
          The UK&apos;s most trusted destination for authentic Kerala products. Bringing the true taste of Gods Own Country directly to your doorstep with fast, reliable delivery.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="group text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <Package className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Authentic &amp; Fresh</h2>
          <p className="text-gray-600 leading-relaxed">
            From <strong>Palakkadan Matta Rice</strong> to <strong>Organic Coconut Oil</strong>, we source directly from Kerala&apos;s finest producers to ensure 100% authenticity and freshness in every order.
          </p>
        </div>

        <div className="group text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <Truck className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Express UK Delivery</h2>
          <p className="text-gray-600 leading-relaxed">
            Next day and tracked delivery across London, Birmingham, Manchester, and the entire UK. <strong>Free delivery on orders over £45</strong>. Packaged with care to arrive perfectly.
          </p>
        </div>

        <div className="group text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
            <ShieldCheck className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">5-Star Quality</h2>
          <p className="text-gray-600 leading-relaxed">
            Operated by <strong>Tasty Kerala Ltd</strong>. We pride ourselves on exceptional customer service and premium quality control. Join thousands of happy Malayali families in the UK.
          </p>
        </div>
      </div>

      {/* Detailed SEO Text with rich keywords */}
      <div className="grid lg:grid-cols-2 gap-12 items-center bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-bold">
            <Star className="w-4 h-4 fill-green-700" /> Premium Selection
          </div>
          <h3 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
            The Ultimate Online Kerala Store in the United Kingdom
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Welcome to <strong>Kerala Groceries UK</strong>, your premier destination for high-quality Indian and South Indian essentials. We specialize in bringing rare and traditional ingredients from Kerala to your kitchen.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, text: 'Next Day Delivery' },
              { icon: Award, text: 'Direct Sourcing' },
              { icon: ShieldCheck, text: 'Secure Checkout' },
              { icon: Package, text: 'Eco-Friendly Packing' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-800 font-semibold">
                <item.icon className="w-5 h-5 text-green-600" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-gray-600 space-y-4">
          <p>
            Looking for <strong>Banana Chips</strong>, <strong>Jackfruit Chips</strong>, or <strong>Kerala Snacks</strong> online? Our curated selection includes the best of Kerala&apos;s munchies, prepared using traditional methods and pure coconut oil.
          </p>
          <p>
            We stock a massive range of <strong>Kerala Masalas</strong> and Spices from top brands like <em>Double Horse</em>, <em>Eastern</em>, <em>Nirapara</em>, and <em>Ajmi</em>. Whether it&apos;s Chicken Masala, Sambar Powder, or the perfect Fish Curry mix, we have it all.
          </p>
          <p>
            For those seeking healthy alternatives, explore our <strong>Cold Pressed Oils</strong>, <strong>Ayurvedic products</strong>, and variety of <strong>Matta Rice</strong> (Palakkadan Vadi Matta). We ensure every product meets our strict quality standards before it reaches your home.
          </p>
          <p className="font-medium text-gray-900 border-l-4 border-green-600 pl-4 italic">
            &quot;Bringing the authentic flavors of Kerala to every Malayali home in the UK is our passion. Quality is our promise.&quot; - Tasty Kerala Ltd Team.
          </p>
        </div>
      </div>
    </section>
  );
}
