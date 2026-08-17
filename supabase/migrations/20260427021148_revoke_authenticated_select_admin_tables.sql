/*
  # Revoke authenticated SELECT on admin/internal tables to hide from GraphQL introspection

  ## Problem
  Any authenticated (signed-in) user can see the full schema of ~140 tables including
  highly sensitive admin tables via GraphQL introspection at /graphql/v1.
  Even though RLS restricts rows, the table/column names are visible to attackers.

  ## Tables revoked from authenticated (admin/internal only):
  Financial: bank_transactions, gateway_transactions, cash_flow_tracking, cashflow_predictions,
    expenses, gateway_fee_rules, gateway_fee_statistics, payment_gateways, payout_batches,
    reconciliation_records, store_bank_accounts, transactions, vat_audit_log, vat_calculations,
    vat_reconciliation, profit_analytics
  Procurement/Inventory: purchase_orders, purchase_order_items, purchase_plan_suggestions,
    material_purchase_order_items, packing_materials, packing_material_transactions,
    packing_learning_data, product_batches, product_expiry, product_supplier_map,
    product_supplier_mappings, product_suppliers, supplier_contacts, supplier_invoices,
    supplier_material_prices, supplier_payments, supplier_performance_metrics,
    supplier_price_lists, suppliers, cost_history, stock_replenishment_suggestions,
    procurement_alerts, procurement_events, product_warehouse_locations
  Admin/Internal: ai_actions, ai_insights, ai_suggestions_log, alert_history, alert_settings,
    audience_members, audiences, backorder_items, bulk_operations_log, campaign_conversions,
    campaign_performance, campaigns, data_health_metrics, data_integrity_issues,
    data_integrity_scans, data_navigation_map, deleted_products_archive, image_processing_jobs,
    ingestion_jobs, keralagroceries, main_categories, marketing_events, marketing_insights,
    marketing_integrations, media_assets, message_campaigns, message_templates, messages,
    ms_formatting_rules, ms_pricing_rules, ms_products, ms_stock_rules, ms_stores,
    order_packing, order_packing_items, po_drafts, pocketgrocery, pricing_rules,
    pricing_rules_with_scope, pricing_suggestions, product_boosts, product_bundles,
    product_feeds, product_image_remap, product_marketing_tags, product_metrics,
    product_sync_logs, products_import_staging, promotion_campaigns, promotion_items,
    promotion_rules, query_logs, sender_profiles, shipment_events, shipments,
    shipping_rates_cache, store_category_mappings, store_deletion_audit, store_product_variants,
    store_products_view, store_settings, trust_score_history, trust_scores, user_actions,
    user_context, user_nav_permissions, utm_links, variant_analytics, app_config,
    comm_automations, comm_campaigns, comm_events, comm_messages, comm_templates,
    comm_user_preferences, alert_settings, users

  ## Tables retained for authenticated (storefront needs):
  cart, orders, order_items, order_status_history, user_profiles, wallets, user_spending,
  user_preferences, products, product_variants, product_images, categories, brands,
  store_categories, store_brand_assignments, store_category_assignments, store_products,
  central_inventory, v_storefront_products, banners, carousel_banners,
  homepage_section_products, promotions, stores, comm_otp_codes
*/

-- Financial tables
REVOKE SELECT ON public.bank_transactions FROM authenticated;
REVOKE SELECT ON public.gateway_transactions FROM authenticated;
REVOKE SELECT ON public.cash_flow_tracking FROM authenticated;
REVOKE SELECT ON public.cashflow_predictions FROM authenticated;
REVOKE SELECT ON public.expenses FROM authenticated;
REVOKE SELECT ON public.gateway_fee_rules FROM authenticated;
REVOKE SELECT ON public.gateway_fee_statistics FROM authenticated;
REVOKE SELECT ON public.payment_gateways FROM authenticated;
REVOKE SELECT ON public.payout_batches FROM authenticated;
REVOKE SELECT ON public.reconciliation_records FROM authenticated;
REVOKE SELECT ON public.store_bank_accounts FROM authenticated;
REVOKE SELECT ON public.transactions FROM authenticated;
REVOKE SELECT ON public.vat_audit_log FROM authenticated;
REVOKE SELECT ON public.vat_calculations FROM authenticated;
REVOKE SELECT ON public.vat_reconciliation FROM authenticated;
REVOKE SELECT ON public.profit_analytics FROM authenticated;

-- Procurement / supply chain
REVOKE SELECT ON public.purchase_orders FROM authenticated;
REVOKE SELECT ON public.purchase_order_items FROM authenticated;
REVOKE SELECT ON public.purchase_plan_suggestions FROM authenticated;
REVOKE SELECT ON public.material_purchase_order_items FROM authenticated;
REVOKE SELECT ON public.packing_materials FROM authenticated;
REVOKE SELECT ON public.packing_material_transactions FROM authenticated;
REVOKE SELECT ON public.packing_learning_data FROM authenticated;
REVOKE SELECT ON public.product_batches FROM authenticated;
REVOKE SELECT ON public.product_expiry FROM authenticated;
REVOKE SELECT ON public.product_supplier_map FROM authenticated;
REVOKE SELECT ON public.product_supplier_mappings FROM authenticated;
REVOKE SELECT ON public.product_suppliers FROM authenticated;
REVOKE SELECT ON public.supplier_contacts FROM authenticated;
REVOKE SELECT ON public.supplier_invoices FROM authenticated;
REVOKE SELECT ON public.supplier_material_prices FROM authenticated;
REVOKE SELECT ON public.supplier_payments FROM authenticated;
REVOKE SELECT ON public.supplier_performance_metrics FROM authenticated;
REVOKE SELECT ON public.supplier_price_lists FROM authenticated;
REVOKE SELECT ON public.suppliers FROM authenticated;
REVOKE SELECT ON public.cost_history FROM authenticated;
REVOKE SELECT ON public.stock_replenishment_suggestions FROM authenticated;
REVOKE SELECT ON public.procurement_alerts FROM authenticated;
REVOKE SELECT ON public.procurement_events FROM authenticated;
REVOKE SELECT ON public.product_warehouse_locations FROM authenticated;

-- AI / ML / analytics (admin only)
REVOKE SELECT ON public.ai_actions FROM authenticated;
REVOKE SELECT ON public.ai_insights FROM authenticated;
REVOKE SELECT ON public.ai_suggestions_log FROM authenticated;
REVOKE SELECT ON public.alert_history FROM authenticated;
REVOKE SELECT ON public.alert_settings FROM authenticated;
REVOKE SELECT ON public.data_health_metrics FROM authenticated;
REVOKE SELECT ON public.data_integrity_issues FROM authenticated;
REVOKE SELECT ON public.data_integrity_scans FROM authenticated;
REVOKE SELECT ON public.data_navigation_map FROM authenticated;
REVOKE SELECT ON public.marketing_events FROM authenticated;
REVOKE SELECT ON public.marketing_insights FROM authenticated;
REVOKE SELECT ON public.marketing_integrations FROM authenticated;
REVOKE SELECT ON public.query_logs FROM authenticated;
REVOKE SELECT ON public.trust_score_history FROM authenticated;
REVOKE SELECT ON public.trust_scores FROM authenticated;
REVOKE SELECT ON public.variant_analytics FROM authenticated;

-- Marketing / campaigns (admin only)
REVOKE SELECT ON public.audience_members FROM authenticated;
REVOKE SELECT ON public.audiences FROM authenticated;
REVOKE SELECT ON public.bulk_operations_log FROM authenticated;
REVOKE SELECT ON public.campaign_conversions FROM authenticated;
REVOKE SELECT ON public.campaign_performance FROM authenticated;
REVOKE SELECT ON public.campaigns FROM authenticated;
REVOKE SELECT ON public.message_campaigns FROM authenticated;
REVOKE SELECT ON public.message_templates FROM authenticated;
REVOKE SELECT ON public.messages FROM authenticated;
REVOKE SELECT ON public.promotion_campaigns FROM authenticated;
REVOKE SELECT ON public.promotion_items FROM authenticated;
REVOKE SELECT ON public.promotion_rules FROM authenticated;
REVOKE SELECT ON public.sender_profiles FROM authenticated;
REVOKE SELECT ON public.utm_links FROM authenticated;

-- Internal pipeline / admin tables
REVOKE SELECT ON public.app_config FROM authenticated;
REVOKE SELECT ON public.backorder_items FROM authenticated;
REVOKE SELECT ON public.deleted_products_archive FROM authenticated;
REVOKE SELECT ON public.image_processing_jobs FROM authenticated;
REVOKE SELECT ON public.ingestion_jobs FROM authenticated;
REVOKE SELECT ON public.keralagroceries FROM authenticated;
REVOKE SELECT ON public.main_categories FROM authenticated;
REVOKE SELECT ON public.media_assets FROM authenticated;
REVOKE SELECT ON public.ms_formatting_rules FROM authenticated;
REVOKE SELECT ON public.ms_pricing_rules FROM authenticated;
REVOKE SELECT ON public.ms_products FROM authenticated;
REVOKE SELECT ON public.ms_stock_rules FROM authenticated;
REVOKE SELECT ON public.ms_stores FROM authenticated;
REVOKE SELECT ON public.order_packing FROM authenticated;
REVOKE SELECT ON public.order_packing_items FROM authenticated;
REVOKE SELECT ON public.po_drafts FROM authenticated;
REVOKE SELECT ON public.pocketgrocery FROM authenticated;
REVOKE SELECT ON public.pricing_rules FROM authenticated;
REVOKE SELECT ON public.pricing_rules_with_scope FROM authenticated;
REVOKE SELECT ON public.pricing_suggestions FROM authenticated;
REVOKE SELECT ON public.product_boosts FROM authenticated;
REVOKE SELECT ON public.product_bundles FROM authenticated;
REVOKE SELECT ON public.product_feeds FROM authenticated;
REVOKE SELECT ON public.product_image_remap FROM authenticated;
REVOKE SELECT ON public.product_marketing_tags FROM authenticated;
REVOKE SELECT ON public.product_metrics FROM authenticated;
REVOKE SELECT ON public.product_sync_logs FROM authenticated;
REVOKE SELECT ON public.products_import_staging FROM authenticated;
REVOKE SELECT ON public.shipment_events FROM authenticated;
REVOKE SELECT ON public.shipments FROM authenticated;
REVOKE SELECT ON public.shipping_rates_cache FROM authenticated;
REVOKE SELECT ON public.store_category_mappings FROM authenticated;
REVOKE SELECT ON public.store_deletion_audit FROM authenticated;
REVOKE SELECT ON public.store_product_variants FROM authenticated;
REVOKE SELECT ON public.store_products_view FROM authenticated;
REVOKE SELECT ON public.store_settings FROM authenticated;
REVOKE SELECT ON public.user_actions FROM authenticated;
REVOKE SELECT ON public.user_context FROM authenticated;
REVOKE SELECT ON public.user_nav_permissions FROM authenticated;

-- Comms (user only sees own rows via RLS, but structure still hidden)
REVOKE SELECT ON public.comm_automations FROM authenticated;
REVOKE SELECT ON public.comm_campaigns FROM authenticated;
REVOKE SELECT ON public.comm_events FROM authenticated;
REVOKE SELECT ON public.comm_messages FROM authenticated;
REVOKE SELECT ON public.comm_templates FROM authenticated;
REVOKE SELECT ON public.comm_user_preferences FROM authenticated;

-- users table — use auth.users, not public.users
REVOKE SELECT ON public.users FROM authenticated;
