/**
 * CentralHub Supabase client — browser-safe, anon key only.
 * Reads from the separate CentralHub Supabase project.
 * Never exposes service_role key; uses NEXT_PUBLIC_ vars exclusively.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CENTRALHUB_URL = 'https://icnvrpnzjjcbvgcqgiua.supabase.co';
const CENTRALHUB_ANON_KEY = 'sb_publishable_6IwwngtJYA8G9zrIy0q5vw_eaQXWO5k';

let client: SupabaseClient | undefined;

export function getCentralHubClient(): SupabaseClient {
  if (client) return client;
  client = createClient(CENTRALHUB_URL, CENTRALHUB_ANON_KEY, {
    auth: { persistSession: false },
  });
  return client;
}