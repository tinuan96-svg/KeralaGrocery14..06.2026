'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Circle as XCircle, RefreshCw, Chrome as Home, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

function OrderFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const orderNumber = searchParams.get('order');
  const reason = searchParams.get('reason') || 'Payment processing failed';

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/account');
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const handleRetryPayment = () => {
    if (orderNumber) {
      router.push(`/checkout?retry=${orderNumber}`);
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Payment Failed</h1>
          <p className="text-gray-600 text-lg">
            We couldn&apos;t process your payment
          </p>
          {orderNumber && (
            <p className="text-gray-500 mt-2">
              Order Number: <span className="font-bold">{orderNumber}</span>
            </p>
          )}
        </div>

        <Card className="p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">What happened?</h2>
          <p className="text-gray-700 mb-4">{reason}</p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Common reasons for payment failure:</h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• Insufficient funds in your account</li>
              <li>• Incorrect card details entered</li>
              <li>• Card expired or blocked</li>
              <li>• Payment gateway temporary issue</li>
              <li>• Network connectivity problem</li>
            </ul>
          </div>

          <h3 className="font-semibold mb-3">What can you do?</h3>
          <div className="space-y-2 text-gray-700">
            <p>1. Check your payment details and try again</p>
            <p>2. Use a different payment method</p>
            <p>3. Contact your bank if the issue persists</p>
            <p>4. Try again after some time</p>
          </div>
        </Card>

        <Card className="p-6 mb-8">
          <h2 className="font-bold text-lg mb-3">Need help?</h2>
          <p className="text-gray-700 mb-4">
            If you continue to experience issues, please contact our customer support team.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-semibold">Email:</span> support@keralagrocery.co.uk
            </p>
            <p>
              <span className="font-semibold">Phone:</span> +44 20 XXXX XXXX
            </p>
            <p>
              <span className="font-semibold">Hours:</span> Mon-Sat 9:00 AM - 6:00 PM
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
            onClick={handleRetryPayment}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Retry Payment
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/cart" className="block">
              <Button variant="outline" className="w-full">
                <ShoppingBag className="mr-2 h-4 w-4" />
                View Cart
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>

          <Link href="/products" className="block">
            <Button variant="ghost" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <OrderFailedContent />
    </Suspense>
  );
}
