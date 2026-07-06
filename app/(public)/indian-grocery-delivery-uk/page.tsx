import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Truck, Clock, MapPin, Package } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Indian Grocery Delivery UK - Fast Nationwide Shipping | Kerala Groceries',
  description: 'Fast Indian grocery delivery across the UK. Order authentic Kerala and Indian products online with next-day delivery. Free shipping over £45 to all UK addresses.',
  keywords: ['indian grocery delivery uk', 'indian food delivery', 'online indian groceries', 'indian grocery home delivery', 'buy indian groceries online uk'],
};

export default function IndianGroceryDeliveryUKPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Indian Grocery Delivery Across the UK
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Fast, reliable delivery of authentic Indian and Kerala groceries to your doorstep. Next-day delivery available nationwide with free shipping on orders over £45.
            </p>
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8">
                <Truck className="mr-2 h-5 w-5" />
                Order Now
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Next Day Delivery</h3>
              <p className="text-sm text-gray-600">Order before 6 PM for next-day delivery</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Truck className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Free Over £45</h3>
              <p className="text-sm text-gray-600">Free delivery on all orders above £45</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <MapPin className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">UK-Wide Coverage</h3>
              <p className="text-sm text-gray-600">Delivery to all UK postcodes</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <Package className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Secure Packaging</h3>
              <p className="text-sm text-gray-600">Products arrive fresh and intact</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">How Our Indian Grocery Delivery Works</h2>

          <div className="grid md:grid-cols-3 gap-8 not-prose mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-green-600">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Browse & Select</h3>
              <p className="text-gray-600">
                Choose from our extensive range of authentic Indian and Kerala groceries online. Add items to your cart with just a click.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-green-600">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Checkout</h3>
              <p className="text-gray-600">
                Complete your order with our secure payment system. Your personal and payment information is always protected.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-green-600">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Fast Delivery</h3>
              <p className="text-gray-600">
                Receive your groceries at your doorstep. Track your order and enjoy fresh products delivered with care.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Indian Grocery Delivery Coverage</h2>
          <p className="text-gray-700 mb-6">
            We deliver <strong>Indian groceries across the entire United Kingdom</strong>. Our delivery network covers major cities and towns including:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-8 not-prose">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">England</h4>
              <p className="text-sm text-gray-700">London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Newcastle, Sheffield, Nottingham, and all other cities and towns</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">Scotland</h4>
              <p className="text-sm text-gray-700">Edinburgh, Glasgow, Aberdeen, Dundee, Inverness, and throughout Scotland</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">Wales</h4>
              <p className="text-sm text-gray-700">Cardiff, Swansea, Newport, Wrexham, and all Welsh regions</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">Northern Ireland</h4>
              <p className="text-sm text-gray-700">Belfast, Derry, Lisburn, Newry, and across Northern Ireland</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Our Delivery Service?</h2>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Speed and Reliability</h3>
          <p className="text-gray-700 mb-6">
            We understand that when you&apos;re cooking traditional Indian or Kerala dishes, you need your ingredients quickly. That&apos;s why we offer <strong>next-day delivery</strong> for orders placed before 6 PM. Our logistics partners ensure your groceries arrive on time, every time.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Fresh Products, Carefully Packed</h3>
          <p className="text-gray-700 mb-6">
            Every order is carefully packed to ensure your products arrive fresh and undamaged. We use protective packaging for fragile items and temperature-controlled shipping when necessary. Your satisfaction is our priority.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Affordable Delivery Rates</h3>
          <p className="text-gray-700 mb-6">
            Enjoy <strong>free delivery on all orders over £45</strong>. For smaller orders, we offer competitive delivery rates that make it affordable to stock up on your favorite Indian groceries. No hidden fees, transparent pricing.
          </p>

          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Track Your Order</h3>
          <p className="text-gray-700 mb-6">
            Once your order is dispatched, you'll receive tracking information so you can monitor your delivery in real-time. Know exactly when to expect your groceries.
          </p>
        </div>

        <div className="bg-green-50 border-2 border-green-600 rounded-xl p-8 mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Ready to Order?</h2>
          <p className="text-center text-gray-700 mb-6">
            Browse our full range of authentic Indian and Kerala groceries and enjoy fast UK delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Shop All Products
              </Button>
            </Link>
            <Link href="/categories">
              <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                Browse by Category
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
