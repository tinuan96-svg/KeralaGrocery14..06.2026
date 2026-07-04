/*
  # Enable Supabase Realtime on products and realtime_sync_events

  ## Problem
  The `supabase_realtime` publication exists but contains zero tables
  (puballtables = false, no rows in pg_publication_tables).

  The sync-status page and RealtimeSyncContext both subscribe to
  postgres_changes on the `products` table via Supabase Realtime channels.
  Because `products` is not in the publication, the WAL decoder never emits
  events for it. The WebSocket connection reaches SUBSCRIBED state (which is
  why connState briefly shows "connected") but no postgres_changes events
  ever arrive. After the channel idle-timeout, the client receives TIMED_OUT
  and connState flips to "error" — which is exactly the reported symptom.

  ## Changes
  1. Add `products` to `supabase_realtime` — fixes the Sync Status dashboard,
     RealtimeSyncContext, and useProductSync hook.
  2. Add `realtime_sync_events` to `supabase_realtime` — the sync-status event
     log table should also stream changes in real time.

  ## No RLS impact
  Adding a table to the publication does not change RLS policies.
  Supabase Realtime enforces RLS on postgres_changes events: clients only
  receive rows they are permitted to SELECT under the existing policies.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_sync_events;
