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

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
