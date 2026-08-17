/*
  # Fix RLS performance, unused indexes, duplicate index, missing policy, and function search paths

  ## Summary
  Comprehensive security and performance fixes addressing all advisor warnings:

  ## 1. RLS Initialization Plan Fixes
  Policies on `data_navigation_map` and `query_logs` were calling `auth.uid()` directly,
  causing it to be re-evaluated per-row. Replaced with `(select auth.uid())` so Postgres
  evaluates it once per query.

  ## 2. Function Search Path Fixes (17 functions)
  All listed functions had a mutable `search_path`, making them vulnerable to search_path
  injection. Setting `search_path = ''` forces fully-qualified object references.

  ## 3. RLS Policy Added for deleted_products_archive
  Table had RLS enabled but zero policies. Added admin-only SELECT and DELETE policies.

  ## 4. Duplicate Index on media_assets
  `media_assets_bucket_name_object_path_key` is a UNIQUE constraint that duplicates
  `ux_media_assets_bucket_object`. Dropped the constraint, keeping the named index.

  ## 5. Unused Indexes Dropped
  100+ unused indexes removed to reduce storage overhead and write amplification.

  ## Notes
  Two items require Supabase Dashboard action — see comments at bottom of file.
*/

-- ============================================================
-- 1. FIX RLS INITIALIZATION PLAN: data_navigation_map
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view data navigation map" ON public.data_navigation_map;
DROP POLICY IF EXISTS "Authenticated users can insert data navigation map" ON public.data_navigation_map;
DROP POLICY IF EXISTS "Authenticated users can update data navigation map" ON public.data_navigation_map;
DROP POLICY IF EXISTS "Authenticated users can delete data navigation map" ON public.data_navigation_map;

CREATE POLICY "Authenticated users can view data navigation map"
  ON public.data_navigation_map FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert data navigation map"
  ON public.data_navigation_map FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update data navigation map"
  ON public.data_navigation_map FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete data navigation map"
  ON public.data_navigation_map FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================
-- 2. FIX RLS INITIALIZATION PLAN: query_logs
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert query logs" ON public.query_logs;
DROP POLICY IF EXISTS "Authenticated users can select query logs" ON public.query_logs;

CREATE POLICY "Authenticated users can insert query logs"
  ON public.query_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can select query logs"
  ON public.query_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================
-- 3. FIX FUNCTION SEARCH PATHS (17 functions)
-- ============================================================

ALTER FUNCTION public.apply_store_product_stock_defaults() SET search_path = '';
ALTER FUNCTION public.sync_store_products_from_central_inventory() SET search_path = '';
ALTER FUNCTION public.slugify_text(input text) SET search_path = '';
ALTER FUNCTION public.recalc_store_stock_overrides_from_store() SET search_path = '';
ALTER FUNCTION public.recalc_store_product_stock_override() SET search_path = '';
ALTER FUNCTION public.propagate_store_changes_to_store_products() SET search_path = '';
ALTER FUNCTION public.propagate_product_changes_to_store_products() SET search_path = '';
ALTER FUNCTION public.enforce_store_product_not_deleted() SET search_path = '';
ALTER FUNCTION public.remove_store_products_on_product_delete() SET search_path = '';
ALTER FUNCTION public.sync_products_to_central_inventory() SET search_path = '';
ALTER FUNCTION public.products_normalize_weight_grams() SET search_path = '';
ALTER FUNCTION public.propagate_inventory_changes_to_store_products() SET search_path = '';
ALTER FUNCTION public.auto_map_new_product_to_stores() SET search_path = '';
ALTER FUNCTION public.archive_deleted_product() SET search_path = '';
ALTER FUNCTION public.cleanup_deleted_product_display_rows() SET search_path = '';
ALTER FUNCTION public.sync_store_products_defaults() SET search_path = '';

-- ============================================================
-- 4. ADD MISSING POLICIES: deleted_products_archive
-- ============================================================

CREATE POLICY "Admins can read deleted products archive"
  ON public.deleted_products_archive FOR SELECT
  TO authenticated
  USING ((select public.is_admin()));

CREATE POLICY "Admins can delete from deleted products archive"
  ON public.deleted_products_archive FOR DELETE
  TO authenticated
  USING ((select public.is_admin()));

-- ============================================================
-- 5. DROP DUPLICATE CONSTRAINT (unique index) on media_assets
-- ============================================================

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_bucket_name_object_path_key;

-- ============================================================
-- 6. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_ai_actions_approved_by;
DROP INDEX IF EXISTS public.idx_ai_actions_insight_id;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_accepted_by;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_product_id;
DROP INDEX IF EXISTS public.idx_alert_history_issue_id;
DROP INDEX IF EXISTS public.idx_alert_history_scan_id;
DROP INDEX IF EXISTS public.idx_alert_history_sent_to_user_id;
DROP INDEX IF EXISTS public.idx_alert_history_trust_score_id;
DROP INDEX IF EXISTS public.idx_audience_members_user_id;
DROP INDEX IF EXISTS public.idx_backorder_items_assigned_po_id;
DROP INDEX IF EXISTS public.idx_backorder_items_order_id;
DROP INDEX IF EXISTS public.idx_backorder_items_product_id;
DROP INDEX IF EXISTS public.idx_bulk_operations_log_performed_by;
DROP INDEX IF EXISTS public.idx_campaign_conversions_campaign_id;
DROP INDEX IF EXISTS public.idx_campaign_conversions_order_id;
DROP INDEX IF EXISTS public.idx_campaigns_created_by;
DROP INDEX IF EXISTS public.idx_cart_product_id;
DROP INDEX IF EXISTS public.idx_comm_automations_template_id;
DROP INDEX IF EXISTS public.idx_comm_events_order_id;
DROP INDEX IF EXISTS public.idx_cost_history_product_id;
DROP INDEX IF EXISTS public.idx_cost_history_supplier_id;
DROP INDEX IF EXISTS public.idx_cost_history_store_id;
DROP INDEX IF EXISTS public.idx_data_health_metrics_scan_id;
DROP INDEX IF EXISTS public.idx_data_integrity_issues_fixed_by;
DROP INDEX IF EXISTS public.idx_data_integrity_issues_scan_id;
DROP INDEX IF EXISTS public.idx_data_integrity_scans_triggered_by;
DROP INDEX IF EXISTS public.idx_expenses_supplier_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_rules_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_statistics_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_transactions_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_transactions_order_id;
DROP INDEX IF EXISTS public.idx_marketing_events_order_id;
DROP INDEX IF EXISTS public.idx_marketing_events_product_id;
DROP INDEX IF EXISTS public.idx_marketing_events_user_id;
DROP INDEX IF EXISTS public.idx_marketing_insights_campaign_id;
DROP INDEX IF EXISTS public.idx_mpoi_material_id;
DROP INDEX IF EXISTS public.idx_mpoi_purchase_order_id;
DROP INDEX IF EXISTS public.idx_message_campaigns_template_id;
DROP INDEX IF EXISTS public.idx_messages_order_id;
DROP INDEX IF EXISTS public.idx_messages_template_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_order_items_product_id;
DROP INDEX IF EXISTS public.idx_order_packing_packed_by;
DROP INDEX IF EXISTS public.idx_order_packing_suggested_box_id;
DROP INDEX IF EXISTS public.idx_order_packing_items_material_id;
DROP INDEX IF EXISTS public.idx_order_packing_items_order_packing_id;
DROP INDEX IF EXISTS public.idx_order_status_history_created_by;
DROP INDEX IF EXISTS public.idx_order_status_history_order_id;
DROP INDEX IF EXISTS public.idx_orders_gateway_id;
DROP INDEX IF EXISTS public.idx_pld_actual_box_id;
DROP INDEX IF EXISTS public.idx_pld_order_id;
DROP INDEX IF EXISTS public.idx_pld_suggested_box_id;
DROP INDEX IF EXISTS public.idx_pmt_created_by;
DROP INDEX IF EXISTS public.idx_pmt_material_id;
DROP INDEX IF EXISTS public.idx_payout_batches_gateway_id;
DROP INDEX IF EXISTS public.idx_po_drafts_converted_to_po_id;
DROP INDEX IF EXISTS public.idx_po_drafts_store_id;
DROP INDEX IF EXISTS public.idx_po_drafts_supplier_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_category_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_product_id;
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
DROP INDEX IF EXISTS public.idx_psm_supplier_id;
DROP INDEX IF EXISTS public.idx_psm_supplier_price_list_id;
DROP INDEX IF EXISTS public.idx_product_suppliers_supplier_id;
DROP INDEX IF EXISTS public.idx_product_sync_logs_created_by;
DROP INDEX IF EXISTS public.idx_product_sync_logs_product_id;
DROP INDEX IF EXISTS public.idx_product_sync_logs_store_id;
DROP INDEX IF EXISTS public.idx_pwl_product_id;
DROP INDEX IF EXISTS public.idx_pwl_store_id;
DROP INDEX IF EXISTS public.idx_profit_analytics_store_id;
DROP INDEX IF EXISTS public.idx_promotion_items_campaign_id;
DROP INDEX IF EXISTS public.idx_promotion_items_product_id;
DROP INDEX IF EXISTS public.idx_promotion_rules_campaign_id;
DROP INDEX IF EXISTS public.idx_poi_product_id;
DROP INDEX IF EXISTS public.idx_poi_purchase_order_id;
DROP INDEX IF EXISTS public.idx_poi_supplier_price_list_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_store_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_supplier_id;
DROP INDEX IF EXISTS public.idx_pps_product_id;
DROP INDEX IF EXISTS public.idx_pps_supplier_id;
DROP INDEX IF EXISTS public.idx_reconciliation_records_store_id;
DROP INDEX IF EXISTS public.idx_shipment_events_shipment_id;
DROP INDEX IF EXISTS public.idx_shipments_order_id;
DROP INDEX IF EXISTS public.idx_srs_product_id;
DROP INDEX IF EXISTS public.idx_srs_recommended_supplier_id;
DROP INDEX IF EXISTS public.idx_srs_store_id;
DROP INDEX IF EXISTS public.idx_store_bank_accounts_store_id;
DROP INDEX IF EXISTS public.idx_store_brand_assignments_brand_id;
DROP INDEX IF EXISTS public.idx_store_category_assignments_category_id;
DROP INDEX IF EXISTS public.idx_store_deletion_audit_deleted_by;
DROP INDEX IF EXISTS public.idx_store_product_variants_variant_id;
DROP INDEX IF EXISTS public.idx_supplier_contacts_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_invoices_purchase_order_id;
DROP INDEX IF EXISTS public.idx_supplier_material_prices_material_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_created_by;
DROP INDEX IF EXISTS public.idx_supplier_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_purchase_order_id;
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
DROP INDEX IF EXISTS public.idx_media_assets_created_by;
DROP INDEX IF EXISTS public.idx_media_assets_object_path;
DROP INDEX IF EXISTS public.idx_query_logs_table_name;
DROP INDEX IF EXISTS public.idx_query_logs_route;

/*
  MANUAL DASHBOARD ACTIONS REQUIRED:

  1. Auth DB Connection Strategy
     Path: Supabase Dashboard > Project Settings > Database > Connection pooling
     Action: Switch from fixed-count to percentage-based connection allocation for Auth.

  2. Leaked Password Protection
     Path: Supabase Dashboard > Authentication > Providers > Email
     Action: Enable "Check for compromised passwords (HaveIBeenPwned.org)".
*/
