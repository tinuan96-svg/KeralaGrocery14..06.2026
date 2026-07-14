'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { sendWelcomeNotification } from '@/lib/services/notificationService';

const USER_STORAGE_KEY = 'kerala-grocery-user';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
}

// Profile has three states:
//   undefined  — fetch is in flight; do NOT make any redirect decisions yet
//   null       — fetch complete, confirmed no user_profiles row (new user)
//   UserProfile — fetch complete, row found
type ProfileState = UserProfile | null | undefined;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileState;
  loading: boolean;
  /** True only when profile has settled and phone is confirmed unverified */
  needsPhoneVerification: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: any; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signInWithGoogle: () => Promise<{ error: any; data: any }>;
  signInWithApple: () => Promise<{ error: any; data: any }>;
  signInWithPhoneOtp: (phone: string) => Promise<{ error: any; data: any }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: any; data: any }>;
  /** Save/update the user's profile in user_profiles */
  saveProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => Promise<{ error: any }>;
  /** Mark phone as verified and persist it */
  markPhoneVerified: (phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: undefined,
  loading: true,
  needsPhoneVerification: false,
  signUp: async () => ({ error: null, data: null }),
  signIn: async () => ({ error: null, data: null }),
  signInWithGoogle: async () => ({ error: null, data: null }),
  signInWithApple: async () => ({ error: null, data: null }),
  signInWithPhoneOtp: async () => ({ error: null, data: null }),
  verifyPhoneOtp: async () => ({ error: null, data: null }),
  saveProfile: async () => ({ error: null }),
  markPhoneVerified: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileState>(undefined);
  const [loading, setLoading] = useState(true);

  const needsPhoneVerification =
    !!user &&
    profile !== undefined &&
    (profile === null || !profile.phone || !profile.phone_verified);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const saveUser = (u: User | null) => {
    try {
      if (u) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
  };

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id,name,email,phone,phone_verified,display_name,avatar_url,address,city,postcode')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('[Auth] fetchProfile DB error:', error.message);
        return null;
      }
      return data as UserProfile | null;
    } catch (e: any) {
      console.error('[Auth] fetchProfile unexpected error:', e.message);
      return null;
    }
  }, []);

  const applySession = useCallback(async (s: Session | null) => {
    try {
      setSession(s);
      setUser(s?.user ?? null);
      saveUser(s?.user ?? null);

      if (s?.user) {
        setProfile(undefined);
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('[Auth] applySession crash:', err);
      setProfile(null);
    }
  }, [fetchProfile]);

  // ── Boot ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = getSupabase();

    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (raw && raw !== 'undefined' && raw !== 'null') {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('[Auth] localStorage parse error:', e);
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      (async () => {
        await applySession(s);
        setLoading(false);
      })();
    }).catch((err) => {
      console.error('[Auth] getSession error:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      (async () => {
        await applySession(s);
        setLoading(false);
      })();
    });

    // ── Capacitor Native URL Handling ────────────────────────────────────────
    // Listen for custom scheme redirects (e.g. kgapp://auth)
    const setupNativeListener = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import('@capacitor/app');
      const { Browser } = await import('@capacitor/browser');

      const handleUrl = async (urlStr: string) => {
        const isKgAppScheme = urlStr.startsWith('kgapp://auth');
        const isAndroidScheme = urlStr.startsWith('com.keralagrocery.app://auth');
        const isWebCallback = urlStr.includes('keralagrocery.com/auth/callback');

        if (isKgAppScheme || isAndroidScheme || isWebCallback) {
          const closeBrowser = async () => {
            try { await Browser.close(); } catch (e) {}
          };
          closeBrowser();
          setTimeout(closeBrowser, 500);
          setTimeout(closeBrowser, 1500);

          let webUrlStr = urlStr;
          if (isKgAppScheme) {
            webUrlStr = urlStr.replace('kgapp://auth', 'https://keralagrocery.com/auth/callback');
          } else if (isAndroidScheme) {
            webUrlStr = urlStr.replace('com.keralagrocery.app://auth', 'https://keralagrocery.com/auth/callback');
          }

          try {
            const url = new URL(webUrlStr);
            // Handle both PKCE (?code=) and Implicit Flow (#access_token=)
            const searchParams = new URLSearchParams(url.search);
            const code = searchParams.get('code');

            // For implicit flow, the fragment contains access_token etc.
            const fragmentParams = new URLSearchParams(url.hash.substring(1));
            const accessToken = fragmentParams.get('access_token');
            const refreshToken = fragmentParams.get('refresh_token');

            if (code) {
              console.log('[Auth] Exchanging code for session');
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
            } else if (accessToken && refreshToken) {
              console.log('[Auth] Setting session from fragment tokens');
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (error) throw error;
            }

            // Redirect to account once session is established
            router.push('/account');

          } catch (err) {
            console.error('[Auth] OAuth handling error:', err);
          }
        }
      };

      const listener = await App.addListener('appUrlOpen', async (data) => {
        await handleUrl(data.url);
      });

      // Safety net: Close browser when app becomes active (in case redirect didn't trigger close)
      await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          Browser.close().catch(() => {});
        }
      });

      // Check for launch URL in case app was opened from cold start via deep link
      App.getLaunchUrl().then((launchUrl) => {
        if (launchUrl?.url) {
          handleUrl(launchUrl.url);
        }
      });

      return () => listener.remove();
    };

    const cleanupNative = setupNativeListener();

    return () => {
      subscription.unsubscribe();
      cleanupNative.then(fn => fn?.());
    };
  }, [applySession]);

  // ── Auth methods ───────────────────────────────────────────────────────────

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (!error && data.session) await applySession(data.session);
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) await applySession(data.session);
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabase();
    const { Capacitor } = await import('@capacitor/core');
    const { Browser } = await import('@capacitor/browser');
    const isApp = Capacitor.isNativePlatform();

    // For both platforms, we go through the web callback as a "bridge"
    // to ensure deep links work reliably and because Supabase whitelists it by default.
    const redirectTo = `${window.location.origin}/auth/callback?platform=native`;

    console.log('[Auth] signInWithGoogle - isApp:', isApp, 'redirectTo:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isApp,
        queryParams: {
          access_type: 'offline', 
          prompt: 'select_account' 
        },
      },
    });

    if (!error && isApp && data?.url) {
      console.log('[Auth] Opening OAuth URL in browser:', data.url);
      await Browser.open({ url: data.url, windowName: '_blank' });
    }

    return { data, error };
  };

  const signInWithApple = async () => {
    const supabase = getSupabase();
    const { Capacitor } = await import('@capacitor/core');
    const { Browser } = await import('@capacitor/browser');
    const isApp = Capacitor.isNativePlatform();

    const redirectTo = `${window.location.origin}/auth/callback?platform=native`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        skipBrowserRedirect: isApp,
      },
    });

    if (!error && isApp && data?.url) {
      await Browser.open({ url: data.url, windowName: '_blank' });
    }

    return { data, error };
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok || json.error) return { data: null, error: { message: json.error || 'Failed to send OTP' } };
      return { data: json, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message || 'Failed to send OTP' } };
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-otp`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone, token }),
      });
      const json = await res.json();
      if (!res.ok || json.error) return { data: null, error: { message: json.error || 'Invalid code' } };

      // If user is already logged in (e.g. via Google), this is just verification
      if (user) {
        console.log('[Auth] verifyPhoneOtp: user already authenticated — keeping current session');
        (async () => { try { await sendWelcomeNotification(phone); } catch {} })();
        return { data: { user, session: null }, error: null };
      }

      // Otherwise, log them in using the token returned by the Edge Function
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: json.hashed_token,
        type: 'email', // The Edge Function returns a magic-link style token hash
      });
      if (!error && data?.session) {
        await applySession(data.session);
        (async () => {
          try { await sendWelcomeNotification(phone); } catch {}
        })();
      }
      return { data, error };
    } catch (e: any) {
      return { data: null, error: { message: e.message || 'Verification failed' } };
    }
  };

  // ── Profile methods ────────────────────────────────────────────────────────

  const saveProfile = async (updates: Partial<Omit<UserProfile, 'id'>>) => {
    if (!user) return { error: { message: 'Not authenticated' } };
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      if (error) {
        console.error('[Auth] saveProfile upsert error:', error.message);
      } else {
        const p = await fetchProfile(user.id);
        setProfile(p);
      }
      return { error };
    } catch (e: any) {
      return { error: { message: e.message } };
    }
  };

  const markPhoneVerified = async (phone: string) => {
    // Keep the real email if this was a Google-linked account
    const realEmail = user?.email && !user.email.includes('@keralagrocery.phone')
      ? user.email
      : undefined;
    return saveProfile({
      phone,
      phone_verified: true,
      ...(realEmail ? { email: realEmail } : {}),
    });
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(undefined);
    const p = await fetchProfile(user.id);
    setProfile(p);
  };

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    saveUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, needsPhoneVerification,
      signUp, signIn, signInWithGoogle, signInWithApple,
      signInWithPhoneOtp, verifyPhoneOtp,
      saveProfile, markPhoneVerified, refreshProfile,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
