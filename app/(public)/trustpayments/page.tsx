'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft, Loader as Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    SecureTrading?: any;
  }
}

const ST_SCRIPT_URL = 'https://cdn.eu.trustpayments.com/js/latest/st.js';
const INIT_TIMEOUT_MS = 30000; // Increased to 30s

function TrustPaymentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order') || '';
  const amount = searchParams.get('amount') || '';
  const [jwt, setJwt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initStartedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Step 1: Fetch JWT from edge function
  useEffect(() => {
    if (!orderNumber || !amount) {
      console.error('[TrustPayments] Missing order or amount in URL params');
      setError('Missing order or amount');
      setLoading(false);
      return;
    }

    const fetchJwt = async () => {
      console.log('[TrustPayments] Fetching JWT for order:', orderNumber);
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
          console.error('[TrustPayments] JWT edge function error:', data.error);
          throw new Error(data.error || 'Failed to initialize payment');
        }
        console.log('[TrustPayments] JWT received successfully');
        setJwt(data.jwt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to initialize payment';
        console.error('[TrustPayments] JWT fetch catch:', msg);
        setError('We couldn\'t initialize your payment session. Please try again or choose another payment method.');
        setLoading(false);
      }
    };

    fetchJwt();
  }, [orderNumber, amount]);

  // Step 2: Load st.js and initialize payment form
  useEffect(() => {
    if (!jwt || initStartedRef.current) return;
    initStartedRef.current = true;

    console.log('[TrustPayments] JWT available, proceeding to load st.js');

    // Set initialization timeout
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('[TrustPayments] Initialization timed out after', INIT_TIMEOUT_MS, 'ms. loading state is', loading);
        setError('The secure payment form is taking too long to load. Please refresh or try again.');
        setLoading(false);
      }
    }, INIT_TIMEOUT_MS);

    const initPayment = () => {
      console.log('[TrustPayments] Starting initPayment function...');
      if (!window.SecureTrading) {
        console.error('[TrustPayments] window.SecureTrading not found after script load');
        setError('We couldn\'t load the secure payment form components. Please refresh and try again.');
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      try {
        console.log('[TrustPayments] Configuring window.SecureTrading...');
        const st = window.SecureTrading({
          jwt,
          livestatus: 1,
          components: {
            startAnimation: {
              enabled: false,
            },
          },
          submitCallback: (response: any) => {
            console.log('[TrustPayments] Submit callback triggered:', response);
            if (response && response.errorcode && response.errorcode !== '0') {
              console.error('[TrustPayments] Submission error:', response.errormessage);
            }
          },
          errorCallback: (error: any) => {
            console.error('[TrustPayments] SDK errorCallback:', error);
          }
        });

        console.log('[TrustPayments] Initializing ST Components...');
        st.Components({
          callbacks: {
            onPaymentFormRendered: () => {
              console.log('[TrustPayments] onPaymentFormRendered fired!');
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setLoading(false);
            },
          },
        });
      } catch (err) {
        console.error('[TrustPayments] Initialization crash:', err);
        setError('A technical error occurred while loading the payment form.');
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };

    // Robust script loading
    const existingScript = document.querySelector(`script[src*="st.js"]`);
    if (existingScript) {
      console.log('[TrustPayments] st.js script already in document');
      if (window.SecureTrading) {
        initPayment();
      } else {
        console.log('[TrustPayments] Waiting for existing st.js to load');
        existingScript.addEventListener('load', initPayment);
        existingScript.addEventListener('error', (e) => {
          console.error('[TrustPayments] Existing st.js load error', e);
          setError('Failed to load secure payment script.');
          setLoading(false);
        });
      }
      return;
    }

    console.log('[TrustPayments] Injecting st.js script tag');
    const script = document.createElement('script');
    script.src = ST_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      console.log('[TrustPayments] st.js script tag onload fired');
      initPayment();
    };
    script.onerror = (e) => {
      console.error('[TrustPayments] st.js script tag onerror fired', e);
      setError('The secure payment script could not be loaded. Please check your connection.');
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    document.head.appendChild(script);
  }, [jwt]);

  const handleRetry = () => {
    // Full page reload re-fetches JWT and re-initializes
    window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="bg-[#0B5D3B] hover:bg-green-700 text-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link href="/cart">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Cart
              </Button>
            </Link>
          </div>
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
            <div id="st-expiration-date" className="mb-3" />
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
