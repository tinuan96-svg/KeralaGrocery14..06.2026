/*
  # Revoke authenticated EXECUTE on admin-only SECURITY DEFINER functions

  ## Problem
  Any signed-in user (authenticated role) can call destructive admin functions:
  - delete_store, bulk_soft_delete_products, bulk_soft_delete_orders
  - sync_bank_transactions, reconcile_transaction, match_gateway_transactions
  - get_cashflow_analysis, get_bank_balance_summary (financial data)
  - bulk_update_fulfillment_status, update_order_fulfillment_status
  - All product/store management functions

  ## Fix
  Revoke EXECUTE from authenticated for all admin-only functions.
  Retain EXECUTE on authenticated for functions the storefront legitimately needs:
  - get_dynamic_banner_products, get_homepage_section_products (homepage)
  - get_store_products_clean (product listing)
  - get_cashback_percentage, get_cashback_tier (loyalty info)
  - generate_order_number (checkout flow)
  - is_admin (used in RLS policies)
  - get_store_product_visibility, is_product_visible_in_store (product visibility checks)
*/

-- Financial / reconciliation — admin only
REVOKE EXECUTE ON FUNCTION public.calculate_expected_payout(uuid, text, date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.find_matching_transactions(uuid, text, numeric, date, integer, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_bank_balance_summary(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cashflow_analysis(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_unreconciled_transactions(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.match_gateway_transactions(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_transaction(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_bank_transactions(uuid, jsonb) FROM authenticated;

-- Product management — admin only
REVOKE EXECUTE ON FUNCTION public.archive_deleted_product() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_generate_sku() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_set_product_visibility(uuid[], uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_soft_delete_products(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_deleted_product_display_rows() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_store_product_stock_override(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_hard_delete_on_soft_delete() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_has_variants() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_sku() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_sku(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_incomplete_variant_product_ids() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_product_assignments_for_store(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_products_for_store_simple(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_schema() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_store_category_name(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visibility_summary(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visible_products_for_store(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ms_products_set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_google_sheet() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_images_by_product() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_images_by_store() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_name_override(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_overrides(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_price_override(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_product_stock_override(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.run_image_backfill() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_store_product_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_image_columns() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_image_columns_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_media_asset_from_storage() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_products_visibility_from_store() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_store_product_image_override() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_product_visibility(uuid, uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_auto_image_processing() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_catalogue_products_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_media_assets_updated_at() FROM authenticated;

-- Order management — admin only (users have their own order RLS)
REVOKE EXECUTE ON FUNCTION public.bulk_soft_delete_orders(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_update_fulfillment_status(uuid[], public.fulfillment_status, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_order_fulfillment_status(uuid, public.fulfillment_status, text) FROM authenticated;

-- Store management — admin only
REVOKE EXECUTE ON FUNCTION public.delete_store(uuid) FROM authenticated;

-- Trigger functions — called by DB engine only
REVOKE EXECUTE ON FUNCTION public.auto_confirm_order_on_payment() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_from_inventory() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_from_pricing_rules() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_from_products() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_from_store_products() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_from_stores() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup() FROM authenticated;
