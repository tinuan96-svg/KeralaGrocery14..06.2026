'use client';

import { useEffect } from 'react';
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
 * supabase-js with detectSessionInUrl: true automatically exchanges the code
 * for a session on getSession() / onAuthStateChange. We just need to wait
 * for that to complete then redirect to /account.
 *
 * This page is also the target of the Android deep-link after Google OAuth,
 * ensuring the session is captured inside the TWA's Chrome session.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();

    // Give supabase-js up to 5 seconds to exchange the code / parse the hash.
    // onAuthStateChange will fire SIGNED_IN once the exchange is complete.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        // If the app set a post-login redirect, honour it; otherwise go to /account
        const next = sessionStorage.getItem('kg_oauth_redirect') ?? '/account';
        sessionStorage.removeItem('kg_oauth_redirect');
        router.replace(next);
      }
    });

    // Fallback: if already signed in (page refreshed mid-flow), redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        const next = sessionStorage.getItem('kg_oauth_redirect') ?? '/account';
        sessionStorage.removeItem('kg_oauth_redirect');
        router.replace(next);
      }
    });

    // Hard timeout — if nothing happens in 8s, send to /account anyway
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace('/account');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0B5D3B] flex items-center justify-center">
      <div className="text-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-white/80">Signing you in…</p>
      </div>
    </div>
  );
}
