/*
  # Add CentralHub sync-orders config entries

  Adds app_config entries for the sync-orders edge function URL and store slug.
  The anon key already exists as 'centralhub_anon_key'.
*/

INSERT INTO app_config (id, value)
VALUES
  ('centralhub_supabase_url', '"https://icnvrpnzjjcbvgcqgiua.supabase.co"'::jsonb),
  ('centralhub_order_sync_url', '"https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/sync-orders"'::jsonb),
  ('centralhub_store_slug', '"keralagrocery"'::jsonb)
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;
