'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft, Loader as Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    st?: any;
  }
}

function TrustPaymentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order') || '';
  const amount = searchParams.get('amount') || '';
  const [jwt, setJwt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber || !amount) {
      setError('Missing order or amount');
      setLoading(false);
      return;
    }

    // Fetch JWT from edge function
    const fetchJwt = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/trustpayments-jwt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              amount: parseFloat(amount),
              orderNumber,
              customerEmail: searchParams.get('email') || '',
              customerName: searchParams.get('name') || '',
            }),
          }
        );

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to initialize payment');
        }
        setJwt(data.jwt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(msg);
        setLoading(false);
      }
    };

    fetchJwt();
  }, [orderNumber, amount]);

  useEffect(() => {
    if (!jwt) return;

    // Load st.js if not already loaded
    const existingScript = document.querySelector('script[src*="st.js"]');
    if (existingScript) {
      initPayment();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.eu.trustpayments.com/js/latest/st.js';
    script.async = true;
    script.onload = () => initPayment();
    script.onerror = () => {
      setError('Failed to load payment library');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [jwt]);

  const initPayment = () => {
    if (!window.st || !jwt) return;

    try {
      const st = window.st({
        jwt,
        successCallback: () => {
          // Payment submitted - redirect to success page
          router.push(`/payment-success?order=${orderNumber}`);
        },
        errorCallback: (errorObj: any) => {
          console.error('[TrustPayments] error:', errorObj);
          setError('Payment could not be processed. Please try again.');
          setLoading(false);
        },
        declineCallback: () => {
          setError('Your card was declined. Please try a different card.');
          setLoading(false);
        },
      });

      st.Components({
        styles: {
          'font-size': '14px',
          'color': '#333',
        },
      });

      st.mount();
      setLoading(false);
    } catch (err) {
      console.error('[TrustPayments] init error:', err);
      setError('Failed to initialize payment form');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/cart">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Return to Cart
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cart
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5 text-green-600" />
            Secured by Trust Payments
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-gray-900">Complete Your Payment</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order #{orderNumber} · £{parseFloat(amount).toFixed(2)}
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-green-600 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading secure payment form...</p>
            </div>
          )}

          <div id="st-notification-frame" className="mb-4" />
          <form id="st-form" action="/api/trustpayments/redirect" method="POST">
            <div id="st-card-number" className="mb-3" />
            <div id="st-expiry-date" className="mb-3" />
            <div id="st-security-code" className="mb-4" />
            <Button
              type="submit"
              className="w-full h-12 bg-[#0B5D3B] hover:bg-green-700 text-white font-bold rounded-xl text-sm"
              disabled={loading}
            >
              <Lock className="mr-2 h-4 w-4" />
              Pay £{parseFloat(amount).toFixed(2)} Securely
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your payment is processed securely by Trust Payments. We do not store your card details.
        </p>
      </div>
    </div>
  );
}

export default function TrustPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin mx-auto" />
      </div>
    }>
      <TrustPaymentsContent />
    </Suspense>
  );
}
