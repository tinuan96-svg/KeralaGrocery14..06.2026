'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Circle as XCircle, CircleAlert as AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/account'); return; }
    const order = searchParams.get('order');
    if (order) setOrderNumber(order);
  }, [authLoading, user, searchParams]);

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">Payment Failed</h1>

          {orderNumber && (
            <p className="text-gray-600 mb-2">
              Order #{orderNumber}
            </p>
          )}

          <p className="text-gray-600 mb-8">
            Your payment could not be processed. This could be due to:
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <ul className="list-disc list-inside space-y-1">
                  <li>Insufficient funds</li>
                  <li>Incorrect card details</li>
                  <li>Payment declined by your bank</li>
                  <li>Network connection issue</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Your order has been created but payment is still pending. You can try paying again or choose a different payment method.
          </p>

          <div className="space-y-3">
            <Link href="/checkout">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Try Again
              </Button>
            </Link>

            <Link href="/cart">
              <Button variant="outline" className="w-full">
                Return to Cart
              </Button>
            </Link>

            {orderNumber && (
              <Link href="/orders">
                <Button variant="ghost" className="w-full">
                  View My Orders
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 pt-6 border-t text-sm text-gray-500">
            <p>Need help? Contact our support team</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}
