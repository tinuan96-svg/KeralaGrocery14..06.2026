'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';

/**
 * OAuth callback page.
 *
 * Supabase redirects here after Google OAuth completes.
 * The URL contains either:
 *   - PKCE flow:    ?code=...&code_verifier=... (handled by supabase-js detectSessionInUrl)
 *   - Implicit flow: #access_token=...&refresh_token=...
 *
 * This page acts as a "Bridge" for native apps to ensure the auth session is
 * passed back to the Capacitor shell via deep-linking.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    const url = new URL(window.location.href);

    // Check if we are in a "bridge" mode for native apps
    const isNativeBridge = url.searchParams.get('platform') === 'native' ||
                          url.searchParams.get('native') === 'true';

    if (isNativeBridge) {
      // We are in the system browser, redirected from Supabase.
      // We need to pass the auth params back to the native app via deep link.
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const scheme = isIOS ? 'kgapp://auth' : 'com.keralagrocery.app://auth';

      // Pass all search params and the hash (which contains tokens in implicit flow)
      const deepLink = `${scheme}${url.search}${url.hash}`;

      console.log('[AuthCallback] Native bridge detected, deep-linking to:', scheme);

      // Attempt automatic redirect
      window.location.href = deepLink;

      // Fallback: Show a button if deep link doesn't trigger automatically
      const timeout = setTimeout(() => {
        setIsRedirecting(true); // Reusing this state to show a "Return to App" button
      }, 2500);

      return () => clearTimeout(timeout);
    }

    // Standard web flow
    let localIsRedirecting = false;

    const handleRedirect = (session: any) => {
      if (localIsRedirecting) return;
      localIsRedirecting = true;
      setIsRedirecting(true);

      const next = sessionStorage.getItem('kg_oauth_redirect') ?? '/account';
      sessionStorage.removeItem('kg_oauth_redirect');
      router.replace(next);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (subscription) subscription.unsubscribe();
        handleRedirect(session);
      }
    });

    // Fallback: if already signed in (page refreshed mid-flow), redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        handleRedirect(session);
      }
    });

    // Hard timeout — if nothing happens in 8s, send to /account anyway
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      if (!localIsRedirecting) router.replace('/account');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  const handleManualReturn = () => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const scheme = isIOS ? 'kgapp://auth' : 'com.keralagrocery.app://auth';
    const url = new URL(window.location.href);
    window.location.href = `${scheme}${url.search}${url.hash}`;
  };

  return (
    <div className="min-h-screen bg-[#0B5D3B] flex items-center justify-center p-6">
      <div className="text-center text-white space-y-6 max-w-xs w-full">
        {isRedirecting ? (
          <>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Authenticated!</h1>
            <p className="text-sm text-white/70">If the app doesn't open automatically, please tap the button below.</p>
            <button
              onClick={handleManualReturn}
              className="w-full py-3 bg-white text-[#0B5D3B] font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
            >
              Return to App
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-white/80">Finalizing login…</p>
          </>
        )}
      </div>
    </div>
  );
}
