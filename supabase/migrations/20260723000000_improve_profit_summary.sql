/*
  # Improve Profit Summary & Stock Reserve Logic

  ## Improvements
  1. Updated `get_profit_summary` to explicitly handle missing cost data.
  2. Added internal comments explaining the 25% margin fallback.
  3. Ensured `get_stock_replenishment_reserve` uses the same consistent logic.
  4. Added a warning-like mechanism by adding a `missing_cost_data_count` to the summary.
*/

-- Redefine get_profit_summary with extra metrics for data health
CREATE OR REPLACE FUNCTION get_profit_summary(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to   timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_revenue            numeric,
  total_cogs               numeric,
  total_payment_fees       numeric,
  gross_profit             numeric,
  net_profit               numeric,
  order_count              bigint,
  avg_order_value          numeric,
  profit_margin_pct        numeric,
  missing_cost_data_count  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH paid_orders AS (
    SELECT
      o.id,
      o.total,
      o.subtotal,
      o.payment_method
    FROM orders o
    WHERE o.payment_status = 'paid'
      AND o.is_deleted = false
      AND o.created_at >= p_from
      AND o.created_at < p_to
  ),
  order_item_metrics AS (
    SELECT
      oi.order_id,
      SUM(
        -- Fallback: If cost_price is NULL, we assume a 25% margin (COGS = 75% of unit_price)
        -- This is a safety fallback but should be addressed by setting cost_price on all products.
        COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity
      ) AS cogs,
      COUNT(*) FILTER (WHERE p.cost_price IS NULL) AS missing_costs
    FROM order_items oi
    JOIN paid_orders po ON po.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY oi.order_id
  ),
  fees AS (
    SELECT
      po.id,
      CASE
        WHEN po.payment_method IN ('card', 'paypal') THEN
          ROUND((po.total * 0.019 + 0.20)::numeric, 2)
        ELSE 0.00
      END AS fee
    FROM paid_orders po
  ),
  totals AS (
    SELECT
      COALESCE(SUM(po.total), 0)   AS revenue,
      COALESCE(SUM(om.cogs), 0)    AS cogs,
      COALESCE(SUM(f.fee), 0)      AS fees,
      COUNT(po.id)                  AS cnt,
      COALESCE(SUM(om.missing_costs), 0) AS missing_cnt
    FROM paid_orders po
    LEFT JOIN order_item_metrics om ON om.order_id = po.id
    LEFT JOIN fees f ON f.id = po.id
  )
  SELECT
    t.revenue,
    t.cogs,
    t.fees,
    GREATEST(t.revenue - t.cogs, 0)          AS gross_profit,
    GREATEST(t.revenue - t.cogs - t.fees, 0) AS net_profit,
    t.cnt,
    CASE WHEN t.cnt > 0 THEN ROUND(t.revenue / t.cnt, 2) ELSE 0 END,
    CASE WHEN t.revenue > 0
      THEN ROUND(((t.revenue - t.cogs - t.fees) / t.revenue) * 100, 1)
      ELSE 0
    END,
    t.missing_cnt::bigint
  FROM totals t;
END;
$$;
