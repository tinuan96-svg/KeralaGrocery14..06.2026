-- Final Security Hardening Migration
-- Addresses mutable search_path and insecure execute permissions reported in the audit.

-- 1. Fix Search Path for all reported functions
-- This prevents search path injection attacks by pinning the path to public and pg_temp.

ALTER FUNCTION public.push_order_to_centralhub() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_centralhub_order() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_order_item_total_price() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_product_visibility_from_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_order_status_from_payment() SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_order_totals() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_order_items_recompute_totals() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_orders_delivery_fee_recompute_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_order_sync_store() SET search_path = public, pg_temp;

-- 2. Revoke Public and Authenticated Execute permissions on critical SECURITY DEFINER functions
-- SECURITY DEFINER functions run with owner privileges. They should NOT be accessible by anon or authenticated
-- unless absolutely necessary for the application to function. Most of these are internal triggers or sync logic.

-- notify_centralhub_order()
REVOKE EXECUTE ON FUNCTION public.notify_centralhub_order() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_centralhub_order() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_centralhub_order() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_centralhub_order() TO service_role;

-- push_order_to_centralhub()
REVOKE EXECUTE ON FUNCTION public.push_order_to_centralhub() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.push_order_to_centralhub() FROM anon;
REVOKE EXECUTE ON FUNCTION public.push_order_to_centralhub() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.push_order_to_centralhub() TO service_role;

-- 3. Ensure other internal trigger functions are also restricted (Best Practice)
-- These are usually triggered by DB events and don't need direct execution by users.

REVOKE EXECUTE ON FUNCTION public.set_order_item_total_price() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_item_total_price() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_order_item_total_price() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_product_visibility_from_stock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_product_visibility_from_stock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_product_visibility_from_stock() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_payment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_payment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_payment() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.recompute_order_totals() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_order_totals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_order_totals() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_order_items_recompute_totals() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_order_items_recompute_totals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_order_items_recompute_totals() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_orders_delivery_fee_recompute_total() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_orders_delivery_fee_recompute_total() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_orders_delivery_fee_recompute_total() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_order_sync_store() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_order_sync_store() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_order_sync_store() FROM authenticated;

-- Ensure service_role still has access to everything
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
