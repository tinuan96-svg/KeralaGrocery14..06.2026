import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Chrome as Home, Search, ShoppingBag, CircleHelp as HelpCircle } from 'lucide-react';


export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-green-600 mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            The page you&apos;re looking for seems to have wandered off. Don&apos;t worry, we&apos;ll help you get back on track!
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href="/">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12">
              <Home className="mr-2 h-5 w-5" />
              Go to Homepage
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="w-full h-12 border-green-600 text-green-600 hover:bg-green-50">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Browse Products
            </Button>
          </Link>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Popular Links</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/categories" className="text-green-600 hover:underline">
              Categories
            </Link>
            <Link href="/brands" className="text-green-600 hover:underline">
              Brands
            </Link>
            <Link href="/contact" className="text-green-600 hover:underline">
              Contact Us
            </Link>
            <Link href="/delivery-policy" className="text-green-600 hover:underline">
              Delivery Info
            </Link>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Need help? <Link href="/contact" className="text-green-600 hover:underline">Contact our support team</Link>
        </p>
      </div>
    </div>
  );
}
