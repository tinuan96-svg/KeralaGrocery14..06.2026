/*
  # Harden EXECUTE Grants on SECURITY DEFINER Functions

  ## Summary
  Every SECURITY DEFINER function in the public schema was previously granted EXECUTE
  to PUBLIC (all roles), anon, and authenticated — the broadest possible access. This
  migration locks each function down to only the roles that legitimately need it.

  ## Classification and Changes

  ### 1. Admin-only BI / analytics functions  →  service_role + postgres only
  These functions expose revenue, profit, cost prices, and customer KPIs.
  They already guard with is_admin() internally, but removing the broad EXECUTE
  grant means an unauthenticated request never reaches the SQL layer at all.
  - get_customer_kpis
  - get_order_kpis
  - get_profit_summary
  - get_revenue_chart
  - get_stock_replenishment_reserve
  - get_top_products_by_profit
  - get_top_products_by_revenue
  - get_variant_audit
  - get_variant_audit_report

  ### 2. Admin-only internal / maintenance functions  →  service_role + postgres only
  No customer flow requires these; they are called from edge functions or admin UI
  via service_role.
  - auto_group_product_variants
  - run_variant_audit
  - rls_auto_enable
  - log_order_placed_activity
  - log_product_approval_activity
  - log_sync_completed_activity
  - is_admin (only internal callers need to invoke this directly)

  ### 3. Trigger functions  →  postgres only
  Trigger functions are invoked by PostgreSQL itself, never by a role directly.
  - handle_new_user
  - update_updated_at_column

  ### 4. Order number generation  →  service_role + postgres only
  Called only from the create-order edge function which runs as service_role.
  - generate_order_number

  ### 5. Public product variant lookup  →  anon + authenticated + service_role + postgres
  The only function that legitimately needs public/anon access — used on the
  product detail page to load size variants.
  - get_product_variants

  ## Security Impact
  - Unauthenticated (anon) users can no longer call any KPI, revenue, profit, or
    analytics function — even a crafted RPC call will be rejected at the permission
    layer before the is_admin() check is even evaluated.
  - Authenticated customers cannot access any admin or BI function.
  - No customer-facing flow is broken: product variants remain accessible.
*/

-- ── Step 1: Revoke PUBLIC (covers all roles including anon) ───────────────────

REVOKE ALL ON FUNCTION public.get_customer_kpis(timestamptz, timestamptz)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_order_kpis(timestamptz, timestamptz)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_profit_summary(timestamptz, timestamptz)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_revenue_chart(timestamptz, timestamptz, text)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_stock_replenishment_reserve(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_top_products_by_profit(timestamptz, timestamptz, integer)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_top_products_by_revenue(timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_variant_audit()                                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_variant_audit_report()                            FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.auto_group_product_variants()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_variant_audit()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_order_placed_activity()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_product_approval_activity()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_sync_completed_activity()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin()                        FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column()        FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.generate_order_number()           FROM PUBLIC, anon, authenticated;

-- get_product_variants: keep anon/authenticated but revoke PUBLIC default
REVOKE ALL ON FUNCTION public.get_product_variants(uuid)        FROM PUBLIC;

-- ── Step 2: Grant back only to appropriate roles ──────────────────────────────

-- BI / analytics: service_role + postgres only
GRANT EXECUTE ON FUNCTION public.get_customer_kpis(timestamptz, timestamptz)           TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_order_kpis(timestamptz, timestamptz)              TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_profit_summary(timestamptz, timestamptz)          TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_revenue_chart(timestamptz, timestamptz, text)     TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_stock_replenishment_reserve(timestamptz, timestamptz) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_top_products_by_profit(timestamptz, timestamptz, integer)  TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_top_products_by_revenue(timestamptz, timestamptz, integer) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_variant_audit()                                   TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_variant_audit_report()                            TO service_role, postgres;

-- Admin / maintenance: service_role + postgres only
GRANT EXECUTE ON FUNCTION public.auto_group_product_variants()     TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.run_variant_audit()               TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable()                 TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.log_order_placed_activity()       TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.log_product_approval_activity()   TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.log_sync_completed_activity()     TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.is_admin()                        TO service_role, postgres;

-- Trigger functions: postgres only (triggers fire as superuser)
GRANT EXECUTE ON FUNCTION public.handle_new_user()                 TO postgres;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column()        TO postgres;

-- Order number: service_role + postgres only (called from edge functions)
GRANT EXECUTE ON FUNCTION public.generate_order_number()           TO service_role, postgres;

-- Product variants: anon + authenticated + service_role + postgres (public product page)
GRANT EXECUTE ON FUNCTION public.get_product_variants(uuid)        TO anon, authenticated, service_role, postgres;
