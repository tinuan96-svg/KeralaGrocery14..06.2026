'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleCheck as CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const orderNumber = searchParams.get('order') || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/account'); return; }
    clearCart();
  }, [authLoading, user, router, clearCart]);

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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your order
          </p>
          {orderNumber && (
            <p className="text-lg font-semibold text-green-600 mb-6">
              Order #{orderNumber}
            </p>
          )}
          <p className="text-sm text-gray-600 mb-8">
            We&apos;ve received your payment and your order is being processed.
            You&apos;ll receive a confirmation shortly.
          </p>
          <div className="space-y-3">
            <Link href="/orders">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                View Order Details
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
