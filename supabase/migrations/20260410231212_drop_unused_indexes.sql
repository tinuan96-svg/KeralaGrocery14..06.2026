/*
  # Drop Unused Indexes

  Removes all indexes flagged as unused by the Supabase performance advisor.
  Unused indexes consume storage and slow down write operations (INSERT/UPDATE/DELETE)
  without providing any read performance benefit. These can always be recreated if
  query patterns change in the future.

  ## Tables affected
  - ai_actions, ai_insights, ai_suggestions_log
  - alert_history, audience_members
  - backorder_items, bulk_operations_log
  - campaign_conversions, campaign_performance, campaigns
  - cart, cashflow_predictions, comm_automations, comm_events
  - cost_history, data_health_metrics, data_integrity_issues, data_integrity_scans
  - expenses, gateway_fee_rules, gateway_fee_statistics, gateway_transactions
  - homepage_section_products, homepage_sections
  - marketing_events, marketing_insights, material_purchase_order_items
  - message_campaigns, messages
  - order_items, order_packing, order_packing_items, order_status_history, orders
  - packing_learning_data, packing_material_transactions, packing_materials, payment_gateways
  - payout_batches, po_drafts, pricing_rules, pricing_suggestions, procurement_events
  - product_batches, product_boosts, product_bundles, product_expiry, product_feeds
  - product_marketing_tags, product_metrics, product_supplier_map, product_supplier_mappings
  - product_suppliers, product_sync_logs, product_variants, product_warehouse_locations
  - products, profit_analytics, promotion_campaigns, promotion_items, promotion_rules
  - purchase_order_items, purchase_orders, purchase_plan_suggestions
  - reconciliation_records, shipment_events, shipments
  - stock_replenishment_suggestions, store_bank_accounts, store_brand_assignments
  - store_categories, store_category_assignments, store_category_mappings
  - store_deletion_audit, store_product_variants, store_products, store_settings
  - supplier_contacts, supplier_invoices, supplier_material_prices, supplier_payments
  - supplier_price_lists, transactions, trust_score_history, trust_scores
  - user_actions, utm_links, variant_analytics
  - vat_audit_log, vat_calculations, vat_reconciliation
*/

DROP INDEX IF EXISTS public.idx_reconciliation_store_date;
DROP INDEX IF EXISTS public.idx_cashflow_store_date;
DROP INDEX IF EXISTS public.idx_pricing_rules_priority;
DROP INDEX IF EXISTS public.idx_pricing_rules_category_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_product_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_store_id;
DROP INDEX IF EXISTS public.idx_orders_is_deleted;
DROP INDEX IF EXISTS public.idx_orders_gateway_id;
DROP INDEX IF EXISTS public.idx_orders_user_id;
DROP INDEX IF EXISTS public.idx_ai_actions_approved_by;
DROP INDEX IF EXISTS public.idx_ai_actions_insight_id;
DROP INDEX IF EXISTS public.idx_ai_actions_status;
DROP INDEX IF EXISTS public.idx_ai_actions_priority_score;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_accepted_by;
DROP INDEX IF EXISTS public.idx_ai_suggestions_log_product_id;
DROP INDEX IF EXISTS public.idx_ai_insights_created_at;
DROP INDEX IF EXISTS public.idx_alert_history_issue_id;
DROP INDEX IF EXISTS public.idx_alert_history_scan_id;
DROP INDEX IF EXISTS public.idx_alert_history_trust_score_id;
DROP INDEX IF EXISTS public.idx_alert_history_sent_to_user_id;
DROP INDEX IF EXISTS public.idx_audience_members_user_id;
DROP INDEX IF EXISTS public.idx_audience_members_audience;
DROP INDEX IF EXISTS public.idx_backorder_items_product_id;
DROP INDEX IF EXISTS public.idx_backorder_items_order_id;
DROP INDEX IF EXISTS public.idx_backorder_items_status;
DROP INDEX IF EXISTS public.idx_backorder_items_po;
DROP INDEX IF EXISTS public.idx_bulk_operations_log_performed_by;
DROP INDEX IF EXISTS public.idx_campaign_conversions_campaign_id;
DROP INDEX IF EXISTS public.idx_campaign_conversions_order;
DROP INDEX IF EXISTS public.idx_campaign_performance_date;
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
DROP INDEX IF EXISTS public.idx_expenses_store;
DROP INDEX IF EXISTS public.idx_expenses_invoice_date;
DROP INDEX IF EXISTS public.idx_gateway_fee_rules_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_statistics_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_fee_stats_store_gateway;
DROP INDEX IF EXISTS public.idx_gateway_transactions_gateway_id;
DROP INDEX IF EXISTS public.idx_gateway_transactions_store;
DROP INDEX IF EXISTS public.idx_gateway_transactions_order;
DROP INDEX IF EXISTS public.idx_gateway_transactions_status;
DROP INDEX IF EXISTS public.idx_homepage_section_products_product_id;
DROP INDEX IF EXISTS public.idx_homepage_sections_store;
DROP INDEX IF EXISTS public.idx_marketing_events_product_id;
DROP INDEX IF EXISTS public.idx_marketing_events_user_id;
DROP INDEX IF EXISTS public.idx_marketing_events_type;
DROP INDEX IF EXISTS public.idx_marketing_events_order;
DROP INDEX IF EXISTS public.idx_marketing_insights_campaign_id;
DROP INDEX IF EXISTS public.idx_marketing_insights_status;
DROP INDEX IF EXISTS public.idx_material_purchase_order_items_material_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_po;
DROP INDEX IF EXISTS public.idx_message_campaigns_template_id;
DROP INDEX IF EXISTS public.idx_messages_order_id;
DROP INDEX IF EXISTS public.idx_messages_template_id;
DROP INDEX IF EXISTS public.idx_order_items_product_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_order_packing_packed_by;
DROP INDEX IF EXISTS public.idx_order_packing_suggested_box_id;
DROP INDEX IF EXISTS public.idx_order_packing_order;
DROP INDEX IF EXISTS public.idx_order_packing_items_material_id;
DROP INDEX IF EXISTS public.idx_order_packing_items_order_packing_id;
DROP INDEX IF EXISTS public.idx_order_status_history_created_by;
DROP INDEX IF EXISTS public.idx_order_status_history_order_id;
DROP INDEX IF EXISTS public.idx_packing_learning_data_actual_box_id;
DROP INDEX IF EXISTS public.idx_packing_learning_data_suggested_box_id;
DROP INDEX IF EXISTS public.idx_packing_learning_data_order_id;
DROP INDEX IF EXISTS public.idx_packing_material_transactions_material_id;
DROP INDEX IF EXISTS public.idx_packing_material_transactions_type;
DROP INDEX IF EXISTS public.idx_packing_material_transactions_created_by;
DROP INDEX IF EXISTS public.idx_packing_materials_stock;
DROP INDEX IF EXISTS public.idx_payment_gateways_store;
DROP INDEX IF EXISTS public.idx_payment_gateways_status;
DROP INDEX IF EXISTS public.idx_payout_batches_gateway_id;
DROP INDEX IF EXISTS public.idx_payout_batches_store;
DROP INDEX IF EXISTS public.idx_payout_batches_status;
DROP INDEX IF EXISTS public.idx_po_drafts_supplier_id;
DROP INDEX IF EXISTS public.idx_po_drafts_status;
DROP INDEX IF EXISTS public.idx_po_drafts_converted_to_po_id;
DROP INDEX IF EXISTS public.idx_po_drafts_store_id_fk;
DROP INDEX IF EXISTS public.idx_pricing_suggestions_store_id;
DROP INDEX IF EXISTS public.idx_pricing_suggestions_product_id;
DROP INDEX IF EXISTS public.idx_procurement_events_created_at;
DROP INDEX IF EXISTS public.idx_product_batches_store_id;
DROP INDEX IF EXISTS public.idx_product_batches_supplier_id;
DROP INDEX IF EXISTS public.idx_product_batches_product_id;
DROP INDEX IF EXISTS public.idx_product_boosts_store;
DROP INDEX IF EXISTS public.idx_product_bundles_bundle_product_id;
DROP INDEX IF EXISTS public.idx_product_bundles_component_product_id;
DROP INDEX IF EXISTS public.idx_product_expiry_product_id;
DROP INDEX IF EXISTS public.idx_product_expiry_date;
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
DROP INDEX IF EXISTS public.idx_product_variants_product_id_active;
DROP INDEX IF EXISTS public.idx_product_variants_product_id;
DROP INDEX IF EXISTS public.idx_product_warehouse_locations_store_id;
DROP INDEX IF EXISTS public.idx_product_warehouse_locations_product_id;
DROP INDEX IF EXISTS public.idx_products_sku;
DROP INDEX IF EXISTS public.idx_products_main_category_id;
DROP INDEX IF EXISTS public.idx_products_product_name;
DROP INDEX IF EXISTS public.idx_products_name;
DROP INDEX IF EXISTS public.idx_products_created_at;
DROP INDEX IF EXISTS public.idx_profit_analytics_store_id;
DROP INDEX IF EXISTS public.idx_promotion_campaigns_store;
DROP INDEX IF EXISTS public.idx_promotion_items_campaign_id;
DROP INDEX IF EXISTS public.idx_promotion_items_product_id;
DROP INDEX IF EXISTS public.idx_promotion_rules_campaign_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_product_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_price_list_id;
DROP INDEX IF EXISTS public.idx_purchase_order_items_po_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_created_by;
DROP INDEX IF EXISTS public.idx_purchase_orders_store_id;
DROP INDEX IF EXISTS public.idx_purchase_orders_supplier_id;
DROP INDEX IF EXISTS public.idx_purchase_plan_suggestions_product_id;
DROP INDEX IF EXISTS public.idx_purchase_plan_suggestions_supplier_id;
DROP INDEX IF EXISTS public.idx_purchase_plan_status;
DROP INDEX IF EXISTS public.idx_shipment_events_shipment_id;
DROP INDEX IF EXISTS public.idx_shipments_order_id;
DROP INDEX IF EXISTS public.idx_stock_replenishment_product_id;
DROP INDEX IF EXISTS public.idx_stock_replenishment_supplier_id;
DROP INDEX IF EXISTS public.idx_stock_replenishment_suggestions_store_id;
DROP INDEX IF EXISTS public.idx_store_bank_accounts_store_id;
DROP INDEX IF EXISTS public.idx_store_brand_assignments_brand_id;
DROP INDEX IF EXISTS public.idx_store_categories_store_id;
DROP INDEX IF EXISTS public.idx_store_category_assignments_category_id;
DROP INDEX IF EXISTS public.idx_store_category_mappings_store_category_id;
DROP INDEX IF EXISTS public.idx_store_category_mappings_central_category_id;
DROP INDEX IF EXISTS public.idx_store_deletion_audit_deleted_by;
DROP INDEX IF EXISTS public.idx_store_product_variants_variant_id;
DROP INDEX IF EXISTS public.idx_store_products_active;
DROP INDEX IF EXISTS public.idx_store_products_composite;
DROP INDEX IF EXISTS public.idx_store_settings_store;
DROP INDEX IF EXISTS public.idx_supplier_contacts_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_invoices_purchase_order_id;
DROP INDEX IF EXISTS public.idx_supplier_material_prices_material_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_created_by;
DROP INDEX IF EXISTS public.idx_supplier_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_payments_purchase_order_id;
DROP INDEX IF EXISTS public.idx_supplier_price_lists_product_id;
DROP INDEX IF EXISTS public.idx_supplier_price_lists_supplier_id;
DROP INDEX IF EXISTS public.idx_transactions_user_id;
DROP INDEX IF EXISTS public.idx_trust_score_history_trust_score_id;
DROP INDEX IF EXISTS public.idx_trust_scores_store_id;
DROP INDEX IF EXISTS public.idx_user_actions_user_id;
DROP INDEX IF EXISTS public.idx_utm_links_created_by;
DROP INDEX IF EXISTS public.idx_utm_links_campaign_id;
DROP INDEX IF EXISTS public.idx_variant_analytics_store_id;
DROP INDEX IF EXISTS public.idx_vat_calculations_store;
DROP INDEX IF EXISTS public.idx_vat_audit_store;
DROP INDEX IF EXISTS public.idx_vat_reconciliation_store;
