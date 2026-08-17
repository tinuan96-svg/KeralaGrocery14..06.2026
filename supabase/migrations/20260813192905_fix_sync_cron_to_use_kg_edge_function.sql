/*
# Fix product price sync: point cron to KG's own edge function

1. Problem
   - The cron job calls trigger_centralhub_push() which POSTs to:
     https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/centralhub-product-sync
   - That URL is on the CENTRALHUB project, not the KG project.
   - The edge function uses Deno.env.get("SUPABASE_URL") and
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") to write products.
   - When running on CentralHub, those env vars point to CentralHub's own DB,
     so the sync writes to CentralHub's products table instead of KG's.
   - Result: KG product prices never get updated.

2. Fix
   - Update centralhub_push_url to point to KG's own edge function.
   - Update centralhub_anon_key to KG's anon key so the POST is authorized.
   - The edge function on KG correctly uses KG's SUPABASE_URL/SERVICE_ROLE_KEY
     to write to KG's DB, and CENTRALHUB_API_URL/CENTRALHUB_API_KEY to read from CentralHub.
*/

UPDATE app_config
SET value = '"https://vnqjqopzoeunojomssmq.supabase.co/functions/v1/centralhub-product-sync"'::jsonb,
    updated_at = now()
WHERE id = 'centralhub_push_url';

UPDATE app_config
SET value = '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucWpxb3B6b2V1bm9qb21zc21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTU5ODYsImV4cCI6MjA5NTU5MTk4Nn0.Nvayw0O0rgdFzADjb-BOzG74mlBViLynnd480ImkXPk"'::jsonb,
    updated_at = now()
WHERE id = 'centralhub_anon_key';
