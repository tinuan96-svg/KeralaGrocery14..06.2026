'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleCheck as CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const orderRef = searchParams.get('order') || '';
  const [displayNumber, setDisplayNumber] = useState(orderRef);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/account'); return; }
    clearCart();

    // Fetch confirmed order number if available
    if (orderRef) {
      getSupabase()
        .from('orders')
        .select('confirmed_order_number, order_number')
        .or(`order_number.eq.${orderRef},confirmed_order_number.eq.${orderRef}`)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.confirmed_order_number) setDisplayNumber(data.confirmed_order_number);
          else if (data?.order_number) setDisplayNumber(data.order_number);
        });
    }
  }, [authLoading, user, router, clearCart, orderRef]);

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
          {displayNumber && (
            <p className="text-lg font-semibold text-green-600 mb-6">
              Order #{displayNumber}
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
