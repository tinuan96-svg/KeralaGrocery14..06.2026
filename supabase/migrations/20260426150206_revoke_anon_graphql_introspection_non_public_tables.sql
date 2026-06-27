/*
  # Revoke anon SELECT from non-public tables to hide from GraphQL introspection

  ## Problem
  The pg_graphql extension exposes all tables/views that `anon` has SELECT on via
  the public /graphql/v1 introspection endpoint. Many sensitive internal tables
  (orders, users, suppliers, financials, AI data, etc.) are visible to anyone
  querying the introspection endpoint.

  ## Fix
  Revoke SELECT from the `anon` role on all tables that are:
  - Internal admin/business tables (suppliers, financials, AI, marketing, etc.)
  - User-private tables (orders, wallets, cart, profiles)
  - System/internal tables (logs, audit trails, staging, etc.)

  Tables that legitimately remain anon-readable (storefront browsing):
  - products, product_variants, categories, brands
  - store_products, store_categories, store_category_mappings
  - carousel_banners, banners, homepage_section_products
  - keralagroceries, promotions, main_categories, store_brand_assignments

  Note: RLS still restricts what rows anon can actually read. This revoke
  additionally hides the table schema from GraphQL introspection entirely.
*/

-- Internal AI / analytics tables
REVOKE SELECT ON public.ai_actions FROM anon;
REVOKE SELECT ON public.ai_insights FROM anon;
REVOKE SELECT ON public.ai_suggestions_log FROM anon;

-- Alert / notification system
REVOKE SELECT ON public.alert_history FROM anon;
REVOKE SELECT ON public.alert_settings FROM anon;

-- Audience / marketing targeting
REVOKE SELECT ON public.audience_members FROM anon;
REVOKE SELECT ON public.audiences FROM anon;
REVOKE SELECT ON public.campaign_conversions FROM anon;
REVOKE SELECT ON public.campaign_performance FROM anon;
REVOKE SELECT ON public.campaigns FROM anon;
REVOKE SELECT ON public.marketing_events FROM anon;
REVOKE SELECT ON public.marketing_insights FROM anon;
REVOKE SELECT ON public.marketing_integrations FROM anon;
REVOKE SELECT ON public.message_campaigns FROM anon;
REVOKE SELECT ON public.message_templates FROM anon;
REVOKE SELECT ON public.messages FROM anon;
REVOKE SELECT ON public.utm_links FROM anon;
REVOKE SELECT ON public.comm_automations FROM anon;
REVOKE SELECT ON public.comm_campaigns FROM anon;
REVOKE SELECT ON public.comm_events FROM anon;
REVOKE SELECT ON public.comm_messages FROM anon;
REVOKE SELECT ON public.comm_otp_codes FROM anon;
REVOKE SELECT ON public.comm_templates FROM anon;
REVOKE SELECT ON public.comm_user_preferences FROM anon;

-- Financial / payment tables
REVOKE SELECT ON public.bank_transactions FROM anon;
REVOKE SELECT ON public.cash_flow_tracking FROM anon;
REVOKE SELECT ON public.cashflow_predictions FROM anon;
REVOKE SELECT ON public.cost_history FROM anon;
REVOKE SELECT ON public.expenses FROM anon;
REVOKE SELECT ON public.gateway_fee_rules FROM anon;
REVOKE SELECT ON public.gateway_fee_statistics FROM anon;
REVOKE SELECT ON public.gateway_transactions FROM anon;
REVOKE SELECT ON public.payment_gateways FROM anon;
REVOKE SELECT ON public.payout_batches FROM anon;
REVOKE SELECT ON public.profit_analytics FROM anon;
REVOKE SELECT ON public.reconciliation_records FROM anon;
REVOKE SELECT ON public.store_bank_accounts FROM anon;
REVOKE SELECT ON public.transactions FROM anon;
REVOKE SELECT ON public.vat_audit_log FROM anon;
REVOKE SELECT ON public.vat_calculations FROM anon;
REVOKE SELECT ON public.vat_reconciliation FROM anon;

-- User-private tables
REVOKE SELECT ON public.cart FROM anon;
REVOKE SELECT ON public.orders FROM anon;
REVOKE SELECT ON public.order_items FROM anon;
REVOKE SELECT ON public.order_packing FROM anon;
REVOKE SELECT ON public.order_packing_items FROM anon;
REVOKE SELECT ON public.order_status_history FROM anon;
REVOKE SELECT ON public.user_actions FROM anon;
REVOKE SELECT ON public.user_context FROM anon;
REVOKE SELECT ON public.user_nav_permissions FROM anon;
REVOKE SELECT ON public.user_preferences FROM anon;
REVOKE SELECT ON public.user_profiles FROM anon;
REVOKE SELECT ON public.user_spending FROM anon;
REVOKE SELECT ON public.users FROM anon;
REVOKE SELECT ON public.wallets FROM anon;

-- Supplier / procurement tables
REVOKE SELECT ON public.backorder_items FROM anon;
REVOKE SELECT ON public.bulk_operations_log FROM anon;
REVOKE SELECT ON public.central_inventory FROM anon;
REVOKE SELECT ON public.material_purchase_order_items FROM anon;
REVOKE SELECT ON public.packing_learning_data FROM anon;
REVOKE SELECT ON public.packing_material_transactions FROM anon;
REVOKE SELECT ON public.packing_materials FROM anon;
REVOKE SELECT ON public.po_drafts FROM anon;
REVOKE SELECT ON public.procurement_alerts FROM anon;
REVOKE SELECT ON public.procurement_events FROM anon;
REVOKE SELECT ON public.product_batches FROM anon;
REVOKE SELECT ON public.product_expiry FROM anon;
REVOKE SELECT ON public.product_supplier_map FROM anon;
REVOKE SELECT ON public.product_supplier_mappings FROM anon;
REVOKE SELECT ON public.product_suppliers FROM anon;
REVOKE SELECT ON public.product_warehouse_locations FROM anon;
REVOKE SELECT ON public.products_import_staging FROM anon;
REVOKE SELECT ON public.purchase_order_items FROM anon;
REVOKE SELECT ON public.purchase_orders FROM anon;
REVOKE SELECT ON public.purchase_plan_suggestions FROM anon;
REVOKE SELECT ON public.shipment_events FROM anon;
REVOKE SELECT ON public.shipments FROM anon;
REVOKE SELECT ON public.shipping_rates_cache FROM anon;
REVOKE SELECT ON public.stock_replenishment_suggestions FROM anon;
REVOKE SELECT ON public.supplier_contacts FROM anon;
REVOKE SELECT ON public.supplier_invoices FROM anon;
REVOKE SELECT ON public.supplier_material_prices FROM anon;
REVOKE SELECT ON public.supplier_payments FROM anon;
REVOKE SELECT ON public.supplier_performance_metrics FROM anon;
REVOKE SELECT ON public.supplier_price_lists FROM anon;
REVOKE SELECT ON public.suppliers FROM anon;

-- Internal system / log tables
REVOKE SELECT ON public.data_health_metrics FROM anon;
REVOKE SELECT ON public.data_integrity_issues FROM anon;
REVOKE SELECT ON public.data_integrity_scans FROM anon;
REVOKE SELECT ON public.data_navigation_map FROM anon;
REVOKE SELECT ON public.deleted_products_archive FROM anon;
REVOKE SELECT ON public.product_sync_logs FROM anon;
REVOKE SELECT ON public.query_logs FROM anon;
REVOKE SELECT ON public.store_deletion_audit FROM anon;

-- Internal pricing / rules (not needed by storefront directly)
REVOKE SELECT ON public.pricing_rules FROM anon;
REVOKE SELECT ON public.pricing_rules_with_scope FROM anon;
REVOKE SELECT ON public.pricing_suggestions FROM anon;

-- Multi-store internal tables
REVOKE SELECT ON public.ms_formatting_rules FROM anon;
REVOKE SELECT ON public.ms_pricing_rules FROM anon;
REVOKE SELECT ON public.ms_products FROM anon;
REVOKE SELECT ON public.ms_stock_rules FROM anon;
REVOKE SELECT ON public.ms_stores FROM anon;
REVOKE SELECT ON public.store_products_view FROM anon;

-- Other internal tables
REVOKE SELECT ON public.media_assets FROM anon;
REVOKE SELECT ON public.pocketgrocery FROM anon;
REVOKE SELECT ON public.product_boosts FROM anon;
REVOKE SELECT ON public.product_bundles FROM anon;
REVOKE SELECT ON public.product_feeds FROM anon;
REVOKE SELECT ON public.product_image_remap FROM anon;
REVOKE SELECT ON public.product_marketing_tags FROM anon;
REVOKE SELECT ON public.product_metrics FROM anon;
REVOKE SELECT ON public.promotion_campaigns FROM anon;
REVOKE SELECT ON public.promotion_items FROM anon;
REVOKE SELECT ON public.promotion_rules FROM anon;
REVOKE SELECT ON public.sender_profiles FROM anon;
REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.store_settings FROM anon;
REVOKE SELECT ON public.trust_score_history FROM anon;
REVOKE SELECT ON public.trust_scores FROM anon;
REVOKE SELECT ON public.variant_analytics FROM anon;
REVOKE SELECT ON public.v_storefront_products FROM anon;
