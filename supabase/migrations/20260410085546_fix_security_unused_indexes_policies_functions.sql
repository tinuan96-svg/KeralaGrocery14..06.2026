/*
  # Security Fixes: Unused Indexes, Duplicate Indexes, RLS Policies, and Function Search Paths

  ## Summary
  Addresses all security and performance advisories:

  1. **Drop Duplicate Index/Constraint** on `product_variants` (two identical unique constraints on product_id + variant_name)
  2. **Drop Unused Indexes** (~95 indexes never used by the query planner, wasting storage and slowing writes)
  3. **Fix Multiple Permissive Policies** on `product_variants`:
     - Remove the broad FOR ALL admin policy and replace with explicit per-action admin policies
     - Remove the unnecessary non-admin INSERT policy (only admins should manage variants)
     - Retain authenticated SELECT access
  4. **Fix Always-True RLS Policy** on `brands` INSERT:
     - Restrict to admin users only instead of any authenticated user
  5. **Fix Mutable Function Search Paths** on 13 functions:
     - Set `search_path = ''` so functions cannot be redirected to unexpected schema objects
*/

-- ============================================================
-- 1. DROP DUPLICATE CONSTRAINT/INDEX on product_variants
--    Keep product_variants_product_id_variant_name_uidx
-- ============================================================
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS uq_product_variants_product_variant_name;

-- ============================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================
DROP INDEX IF EXISTS public.idx_ai_actions_approved_by;
DROP INDEX IF EXISTS public.idx_ai_actions_insight_id;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_accepted_by;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_product_id;
DROP INDEX IF EXISTS public.idx_alert_history_issue_id;
DROP INDEX IF EXISTS public.idx_alert_history_scan_id;
DROP INDEX IF EXISTS public.idx_alert_history_trust_score_id;
DROP INDEX IF EXISTS public.idx_alert_history_sent_to_user_id;
DROP INDEX IF EXISTS public.idx_audience_members_user_id;
DROP INDEX IF EXISTS public.idx_backorder_items_product_id;
DROP INDEX IF EXISTS public.idx_bulk_operations_log_performed_by;
DROP INDEX IF EXISTS public.idx_campaign_conversions_campaign_id;
DROP INDEX IF EXISTS public.idx_campaigns_created_by;
DROP INDEX IF EXISTS public.idx_cart_product_id;
DROP INDEX IF EXISTS public.idx_comm_automations_template_id;
DROP INDEX IF EXISTS public.idx_comm_events_order_id;
DROP INDEX IF EXISTS public.idx_cost_history_product_id;
DROP INDEX IF EXISTS public.idx_cost_history_supplier_id;
DROP INDEX IF EXISTS public.idx_data_health_metrics_scan_id;
DROP INDEX IF EXISTS public.idx_data_integrity_issues_fixed_by;
DROP INDEX IF EXISTS public.idx_data_integrity_issues_scan_id;
DROP INDEX IF EXISTS public.idx_data_integrity_scans_triggered_by;
DROP INDEX IF EXISTS public.idx_expenses_supplier_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_rules_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_statistics_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_transactions_gateway_id;
DROP INDEX IF EXISTS public.idx_homepage_section_products_product_id;
DROP INDEX IF EXISTS public.idx_marketing_events_product_id;
DROP INDEX IF EXISTS public.idx_marketing_events_user_id;
DROP INDEX IF EXISTS public.idx_marketing_insights_campaign_id;
DROP INDEX IF EXISTS public.idx_material_purchase_order_items_material_id;
DROP INDEX IF EXISTS public.idx_message_campaigns_template_id;
DROP INDEX IF EXISTS public.idx_messages_order_id;
DROP INDEX IF EXISTS public.idx_messages_template_id;
DROP INDEX IF EXISTS public.idx_order_packing_packed_by;
DROP INDEX IF EXISTS public.idx_order_packing_suggested_box_id;
DROP INDEX IF EXISTS public.idx_order_packing_items_material_id;
DROP INDEX IF EXISTS public.idx_order_packing_items_order_packing_id;
DROP INDEX IF EXISTS public.idx_order_status_history_created_by;
DROP INDEX IF EXISTS public.idx_order_status_history_order_id;
DROP INDEX IF EXISTS public.idx_packing_learning_data_actual_box_id;
DROP INDEX IF EXISTS public.idx_packing_learning_data_suggested_box_id;
DROP INDEX IF EXISTS public.idx_packing_material_transactions_material_id;
DROP INDEX IF EXISTS public.idx_packing_material_transactions_created_by;
DROP INDEX IF EXISTS public.idx_payout_batches_gateway_id;
DROP INDEX IF EXISTS public.idx_po_drafts_supplier_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_category_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_product_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_store_id;
DROP INDEX IF EXISTS public.idx_pricing_suggestions_store_id;
DROP INDEX IF EXISTS public.idx_pricing_suggestions_product_id;
DROP INDEX IF EXISTS public.idx_product_batches_product_id;
DROP INDEX IF EXISTS public.idx_product_batches_store_id;
DROP INDEX IF EXISTS public.idx_product_batches_supplier_id;
DROP INDEX IF EXISTS public.idx_product_bundles_bundle_product_id;
DROP INDEX IF EXISTS public.idx_product_bundles_component_product_id;
DROP INDEX IF EXISTS public.idx_product_expiry_product_id;
DROP INDEX IF EXISTS public.idx_product_feeds_product_id;
DROP INDEX IF EXISTS public.idx_product_marketing_tags_store_id;
DROP INDEX IF EXISTS public.idx_product_metrics_store_id;
DROP INDEX IF EXISTS public.idx_product_supplier_map_supplier_id;
DROP INDEX IF EXISTS public.idx_product_supplier_mappings_supplier_id;
DROP INDEX IF EXISTS public.idx_product_supplier_mappings_price_list_id;
DROP INDEX IF EXISTS public.idx_product_suppliers_supplier_id;
DROP INDEX IF EXISTS public.idx_product_sync_logs_created_by;
DROP INDEX IF EXISTS public.idx_product_sync_logs_product_id;
DROP INDEX IF EXISTS public.idx_product_sync_logs_store_id;
DROP INDEX IF EXISTS public.idx_product_variants_expiry_date;
DROP INDEX IF EXISTS public.idx_product_variants_warehouse_location;
DROP INDEX IF EXISTS public.idx_product_warehouse_locations_product_id;
DROP INDEX IF EXISTS public.idx_product_warehouse_locations_store_id;
DROP INDEX IF EXISTS public.idx_profit_analytics_store_id;
DROP INDEX IF EXISTS public.idx_promotion_items_campaign_id;
DROP INDEX IF EXISTS public.idx_promotion_items_product_id;
DROP INDEX IF EXISTS public.idx_promotion_rules_campaign_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_product_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_price_list_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_store_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_supplier_id;
DROP INDEX IF EXISTS public.idx_purchase_plan_suggestions_product_id;
DROP INDEX IF EXISTS public.idx_purchase_plan_suggestions_supplier_id;
DROP INDEX IF EXISTS public.idx_shipment_events_shipment_id;
DROP INDEX IF EXISTS public.idx_shipments_order_id;
DROP INDEX IF EXISTS public.idx_stock_replenishment_product_id;
DROP INDEX IF EXISTS public.idx_stock_replenishment_supplier_id;
DROP INDEX IF EXISTS public.idx_store_categories_store_id;
DROP INDEX IF EXISTS public.idx_store_category_assignments_category_id;
DROP INDEX IF EXISTS public.idx_store_category_mappings_store_category_id;
DROP INDEX IF EXISTS public.idx_store_category_mappings_central_category_id;
DROP INDEX IF EXISTS public.idx_store_deletion_audit_deleted_by;
DROP INDEX IF EXISTS public.idx_store_product_variants_variant_id;
DROP INDEX IF EXISTS public.idx_supplier_contacts_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_material_prices_material_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_created_by;
DROP INDEX IF EXISTS public.idx_supplier_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_price_lists_product_id;
DROP INDEX IF EXISTS public.idx_supplier_price_lists_supplier_id;
DROP INDEX IF EXISTS public.idx_transactions_user_id;
DROP INDEX IF EXISTS public.idx_trust_score_history_trust_score_id;
DROP INDEX IF EXISTS public.idx_trust_scores_store_id;
DROP INDEX IF EXISTS public.idx_user_actions_user_id;
DROP INDEX IF EXISTS public.idx_utm_links_campaign_id;
DROP INDEX IF EXISTS public.idx_utm_links_created_by;
DROP INDEX IF EXISTS public.idx_variant_analytics_store_id;

-- ============================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES on product_variants
--    Replace FOR ALL admin policy with per-action policies.
--    Remove the non-admin INSERT policy.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can insert product variants" ON public.product_variants;

CREATE POLICY "Admins can insert product variants"
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text
  );

CREATE POLICY "Admins can update product variants"
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING (
    (((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text
  )
  WITH CHECK (
    (((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text
  );

CREATE POLICY "Admins can delete product variants"
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING (
    (((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text
  );

-- ============================================================
-- 4. FIX ALWAYS-TRUE RLS POLICY on brands INSERT
--    Restrict brand creation to admins only.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create brands" ON public.brands;

CREATE POLICY "Admins can create brands"
  ON public.brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text
  );

-- ============================================================
-- 5. FIX MUTABLE FUNCTION SEARCH PATHS
--    Empty search_path forces all object refs to be qualified.
-- ============================================================
ALTER FUNCTION public.compute_store_product_price(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.compute_store_product_stock_override(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.delete_disabled_store_product() SET search_path = '';
ALTER FUNCTION public.enforce_variable_product_has_variants() SET search_path = '';
ALTER FUNCTION public.trg_central_inventory_refresh_store_stock() SET search_path = '';
ALTER FUNCTION public.trg_pricing_rules_refresh_store_prices() SET search_path = '';
ALTER FUNCTION public.trg_products_refresh_store_names() SET search_path = '';
ALTER FUNCTION public.trg_products_refresh_store_prices() SET search_path = '';
ALTER FUNCTION public.trg_store_products_refresh_name() SET search_path = '';
ALTER FUNCTION public.trg_store_products_refresh_price() SET search_path = '';
ALTER FUNCTION public.trg_store_products_refresh_stock() SET search_path = '';
ALTER FUNCTION public.trg_store_settings_refresh_store_names() SET search_path = '';
ALTER FUNCTION public.trg_stores_refresh_store_stock() SET search_path = '';
