import { createClient } from '@supabase/supabase-js';
import { getSupabase } from './client';

/**
 * For Capacitor/Static Export compatibility, this function now returns
 * the standard client if called in a browser environment.
 */
export function createServerSupabaseClient() {
  if (typeof window !== 'undefined') {
    return getSupabase();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'kerala-grocery-server',
      },
    },
  });
}
