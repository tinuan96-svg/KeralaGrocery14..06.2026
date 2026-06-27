import { Package, Truck, ShieldCheck } from 'lucide-react';

export default function SEOContent() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Kerala Groceries Online UK
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Authentic Kerala products delivered across the United Kingdom
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-3">Fresh Indian &amp; Kerala Products</h2>
          <p className="text-gray-600">
            Authentic spices, rice, snacks, and traditional ingredients sourced directly from trusted suppliers. Quality guaranteed.
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold mb-3">Fast UK Delivery</h2>
          <p className="text-gray-600">
            Next day delivery available across the UK. Free delivery on orders over £45. Your Kerala groceries delivered fresh to your doorstep.
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <ShieldCheck className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold mb-3">Trusted Online Grocery Store</h2>
          <p className="text-gray-600">
            Operated by Tasty Kerala Ltd, serving the Kerala community across the UK with authentic products and reliable service since day one.
          </p>
        </div>
      </div>

      <div className="prose prose-slate max-w-4xl mx-auto bg-gray-50 p-8 rounded-lg">
        <h3 className="text-2xl font-semibold mb-4">Why Choose Kerala Groceries UK?</h3>
        <p className="mb-4">
          Welcome to <strong>Kerala Groceries UK</strong>, your one-stop online shop for authentic Kerala and Indian groceries delivered across the United Kingdom.
          We understand the importance of traditional ingredients and flavors, which is why we've curated an extensive selection of premium quality products
          that bring the authentic taste of Kerala to your kitchen.
        </p>
        <p className="mb-4">
          Our range includes <strong>authentic Kerala spices</strong>, premium rice varieties, traditional snacks, cooking essentials, and specialty ingredients
          that are hard to find in regular supermarkets. Whether you're looking for <strong>Kerala masala</strong>, <strong>coconut oil</strong>,
          <strong>appam flour</strong>, or <strong>traditional pickles</strong>, we stock everything you need to create delicious Kerala meals at home.
        </p>
        <p className="mb-4">
          As a trusted supplier to the Kerala community in the UK, we pride ourselves on offering <strong>fast delivery</strong>, competitive prices,
          and exceptional customer service. Orders placed before 6 PM qualify for next day delivery, ensuring your groceries arrive fresh and on time.
          Plus, enjoy <strong>free delivery on all orders over £45</strong>.
        </p>
        <p>
          Shopping with <strong>Tasty Kerala Ltd</strong> means you're choosing quality, authenticity, and convenience.
          Browse our extensive catalog today and experience the taste of home, delivered straight to your door anywhere in the UK.
        </p>
      </div>
    </section>
  );
}
