/*
  # Fix Admin Dashboard RPC Grants

  ## Summary
  Previous hardening migration (20260529195127) revoked EXECUTE grants on KPI and
  BI functions from the `authenticated` role, restricting them to `service_role` only.
  This caused 403 Forbidden errors in the Admin Dashboard, which calls these functions
  directly from the browser using the user's session.

  ## Changes
  - Grant EXECUTE back to the `authenticated` role for all BI and KPI functions
    used by the dashboard.
  - Internal `is_admin()` checks within these functions remain active to ensure
    only authorized administrators can see the data.

  ## Functions Affected
  - get_customer_kpis
  - get_order_kpis
  - get_profit_summary
  - get_revenue_chart
  - get_stock_replenishment_reserve
  - get_top_products_by_profit
  - get_top_products_by_revenue
*/

-- Grant EXECUTE to authenticated role for BI/analytics functions
GRANT EXECUTE ON FUNCTION public.get_customer_kpis(timestamptz, timestamptz)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_kpis(timestamptz, timestamptz)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_summary(timestamptz, timestamptz)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_chart(timestamptz, timestamptz, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_replenishment_reserve(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products_by_profit(timestamptz, timestamptz, integer)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products_by_revenue(timestamptz, timestamptz, integer) TO authenticated;

-- Also ensure is_admin can be called by authenticated users (needed for the checks inside the functions)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
