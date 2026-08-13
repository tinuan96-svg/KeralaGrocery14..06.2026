/*
# Add get_sync_monitor_stats RPC function

## Purpose
Provides aggregate stats for the new push-based sync monitor admin page.
Replaces the old diagnostics endpoint that called the now-deleted centralhub-sync edge function.

## Returns a single JSON row with:
- total, visible, hidden, approved, draft, rejected
- zero_price (products with price = 0)
- inactive_but_visible (is_active = false AND visibility_status = 'visible')
- draft_but_visible (approval_status = 'draft' AND visibility_status = 'visible')
- last_product_update (MAX(updated_at))
*/

CREATE OR REPLACE FUNCTION public.get_sync_monitor_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total', count(*),
    'visible', count(*) FILTER (WHERE visibility_status = 'visible'),
    'hidden', count(*) FILTER (WHERE visibility_status = 'hidden'),
    'approved', count(*) FILTER (WHERE approval_status = 'approved'),
    'draft', count(*) FILTER (WHERE approval_status = 'draft'),
    'rejected', count(*) FILTER (WHERE approval_status = 'rejected'),
    'zero_price', count(*) FILTER (WHERE price = 0 OR price IS NULL),
    'inactive_but_visible', count(*) FILTER (WHERE is_active = false AND visibility_status = 'visible'),
    'draft_but_visible', count(*) FILTER (WHERE approval_status = 'draft' AND visibility_status = 'visible'),
    'last_product_update', MAX(updated_at)
  )
  FROM products
  WHERE is_deleted = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_sync_monitor_stats() TO anon, authenticated;
