import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Server-side: return a stateless client
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'kerala-grocery-server-ssr',
        },
      },
      db: {
        schema: 'public',
      },
    });
  }

  // Client-side: return a cached stateful client
  if (browserClient) {
    return browserClient;
  }

  // Detect if we are in a native app to adjust settings
  const isNative = typeof window !== 'undefined' &&
                  (window.location.href.includes('localhost') ||
                   window.navigator.userAgent.includes('KeralaGroceryApp'));

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Disable automatic URL detection for native apps as we handle it
      // manually via App.addListener('appUrlOpen') in AuthContext.
      // This prevents potential race conditions and loops on Android.
      detectSessionInUrl: !isNative,
      flowType: 'pkce',
      storageKey: 'kerala-grocery-auth',
      storage: window.localStorage,
    },
    global: {
      headers: {
        'X-Client-Info': 'kerala-grocery-web',
      },
    },
    realtime: {
      params: {
        events_per_second: 10,
      },
      timeout: 20000,
    },
    db: {
      schema: 'public',
    },
  });

  return browserClient;
}
