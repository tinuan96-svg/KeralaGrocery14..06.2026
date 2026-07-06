/*
  # Commerce Intelligence Dashboard — DB Functions & Views

  ## Purpose
  Provides pre-aggregated metrics for the Commerce Intelligence Dashboard:
  - Profit Engine: revenue, cost, payment fees, net profit per period
  - Stock Replenishment Reserve: sum(cost_price × qty_sold)
  - Order KPIs: count, AOV, status breakdown
  - Customer KPIs: new/returning counts
  - Top products by revenue and profit
  - Cash flow summary

  ## New Functions
  1. `get_profit_summary(p_from timestamptz, p_to timestamptz)` — returns revenue, cogs, payment fees, gross profit, net profit for a date range
  2. `get_stock_replenishment_reserve(p_from timestamptz, p_to timestamptz)` — returns total reserve needed based on cost_price × qty
  3. `get_order_kpis(p_from timestamptz, p_to timestamptz)` — order count, total revenue, AOV, status breakdown
  4. `get_top_products_by_revenue(p_from timestamptz, p_to timestamptz, p_limit int)` — best sellers
  5. `get_top_products_by_profit(p_from timestamptz, p_to timestamptz, p_limit int)` — most profitable
  6. `get_customer_kpis(p_from timestamptz, p_to timestamptz)` — new customers, repeat orders
  7. `get_revenue_chart(p_from timestamptz, p_to timestamptz, p_granularity text)` — day/week/month timeseries

  ## Notes
  - Payment fee is estimated at 1.9% + £0.20 per order (Worldpay/card standard UK rate)
  - COGS = sum(order_items.unit_price / (1 + markup_pct/100) × quantity) using cost_price from products when available
  - All functions are SECURITY DEFINER with fixed search_path for safety
  - Admin-only access enforced via is_admin() check
*/

-- ─────────────────────────────────────────────
-- 1. Profit Summary
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_profit_summary(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to   timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_revenue        numeric,
  total_cogs           numeric,
  total_payment_fees   numeric,
  gross_profit         numeric,
  net_profit           numeric,
  order_count          bigint,
  avg_order_value      numeric,
  profit_margin_pct    numeric
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
  order_costs AS (
    SELECT
      oi.order_id,
      SUM(
        COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity
      ) AS cogs
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
      COALESCE(SUM(oc.cogs), 0)    AS cogs,
      COALESCE(SUM(f.fee), 0)      AS fees,
      COUNT(po.id)                  AS cnt
    FROM paid_orders po
    LEFT JOIN order_costs oc ON oc.order_id = po.id
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
    END
  FROM totals t;
END;
$$;

-- ─────────────────────────────────────────────
-- 2. Stock Replenishment Reserve
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_stock_replenishment_reserve(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to   timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_revenue        numeric,
  reserve_amount       numeric,
  net_cash_available   numeric,
  units_sold           bigint
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
  WITH paid AS (
    SELECT o.id, o.total
    FROM orders o
    WHERE o.payment_status = 'paid'
      AND o.is_deleted = false
      AND o.created_at >= p_from
      AND o.created_at < p_to
  )
  SELECT
    COALESCE(SUM(paid.total), 0)                                           AS total_revenue,
    COALESCE(SUM(
      COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity
    ), 0)                                                                   AS reserve_amount,
    COALESCE(SUM(paid.total), 0) - COALESCE(SUM(
      COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity
    ), 0)                                                                   AS net_cash_available,
    COALESCE(SUM(oi.quantity), 0)::bigint                                   AS units_sold
  FROM paid
  JOIN order_items oi ON oi.order_id = paid.id
  LEFT JOIN products p ON p.id = oi.product_id;
END;
$$;

-- ─────────────────────────────────────────────
-- 3. Order KPIs
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_order_kpis(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to   timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_orders         bigint,
  paid_orders          bigint,
  pending_orders       bigint,
  cancelled_orders     bigint,
  total_revenue        numeric,
  avg_order_value      numeric,
  total_delivery_fees  numeric
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
  SELECT
    COUNT(*)                                               AS total_orders,
    COUNT(*) FILTER (WHERE payment_status = 'paid')       AS paid_orders,
    COUNT(*) FILTER (WHERE payment_status = 'pending')    AS pending_orders,
    COUNT(*) FILTER (WHERE order_status = 'cancelled')    AS cancelled_orders,
    COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue,
    CASE
      WHEN COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
      THEN ROUND(
        SUM(total) FILTER (WHERE payment_status = 'paid')
        / COUNT(*) FILTER (WHERE payment_status = 'paid'),
        2
      )
      ELSE 0
    END AS avg_order_value,
    COALESCE(SUM(delivery_fee) FILTER (WHERE payment_status = 'paid'), 0) AS total_delivery_fees
  FROM orders
  WHERE is_deleted = false
    AND created_at >= p_from
    AND created_at < p_to;
END;
$$;

-- ─────────────────────────────────────────────
-- 4. Top Products by Revenue
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_top_products_by_revenue(
  p_from  timestamptz DEFAULT (now() - interval '30 days'),
  p_to    timestamptz DEFAULT now(),
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  product_id    uuid,
  product_name  text,
  image_url     text,
  units_sold    bigint,
  revenue       numeric,
  avg_price     numeric
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
  SELECT
    oi.product_id,
    oi.product_name,
    p.image_url,
    SUM(oi.quantity)::bigint  AS units_sold,
    SUM(oi.total_price)       AS revenue,
    ROUND(AVG(oi.unit_price), 2) AS avg_price
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.payment_status = 'paid'
    AND o.is_deleted = false
    AND o.created_at >= p_from
    AND o.created_at < p_to
    AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id, oi.product_name, p.image_url
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$;

-- ─────────────────────────────────────────────
-- 5. Top Products by Profit
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_top_products_by_profit(
  p_from  timestamptz DEFAULT (now() - interval '30 days'),
  p_to    timestamptz DEFAULT now(),
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  product_id    uuid,
  product_name  text,
  image_url     text,
  units_sold    bigint,
  revenue       numeric,
  cogs          numeric,
  profit        numeric,
  margin_pct    numeric
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
  SELECT
    oi.product_id,
    oi.product_name,
    p.image_url,
    SUM(oi.quantity)::bigint AS units_sold,
    SUM(oi.total_price)      AS revenue,
    SUM(COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity) AS cogs,
    SUM(oi.total_price) - SUM(COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity) AS profit,
    CASE
      WHEN SUM(oi.total_price) > 0
      THEN ROUND(
        (SUM(oi.total_price) - SUM(COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity))
        / SUM(oi.total_price) * 100, 1
      )
      ELSE 0
    END AS margin_pct
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.payment_status = 'paid'
    AND o.is_deleted = false
    AND o.created_at >= p_from
    AND o.created_at < p_to
    AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id, oi.product_name, p.image_url
  HAVING SUM(oi.total_price) > 0
  ORDER BY profit DESC
  LIMIT p_limit;
END;
$$;

-- ─────────────────────────────────────────────
-- 6. Customer KPIs
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_kpis(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to   timestamptz DEFAULT now()
)
RETURNS TABLE (
  new_customers        bigint,
  returning_customers  bigint,
  total_customers      bigint,
  guest_orders         bigint
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
  WITH period_orders AS (
    SELECT user_id, customer_email, MIN(created_at) AS first_seen
    FROM orders
    WHERE is_deleted = false
      AND payment_status = 'paid'
      AND created_at >= p_from
      AND created_at < p_to
    GROUP BY user_id, customer_email
  ),
  all_time AS (
    SELECT user_id, customer_email, MIN(created_at) AS first_ever
    FROM orders
    WHERE is_deleted = false AND payment_status = 'paid'
    GROUP BY user_id, customer_email
  )
  SELECT
    COUNT(*) FILTER (WHERE at.first_ever >= p_from)::bigint  AS new_customers,
    COUNT(*) FILTER (WHERE at.first_ever < p_from)::bigint   AS returning_customers,
    COUNT(*)::bigint                                          AS total_customers,
    COUNT(*) FILTER (WHERE po.user_id IS NULL)::bigint       AS guest_orders
  FROM period_orders po
  LEFT JOIN all_time at
    ON (po.user_id IS NOT NULL AND po.user_id = at.user_id)
    OR (po.user_id IS NULL AND po.customer_email = at.customer_email);
END;
$$;

-- ─────────────────────────────────────────────
-- 7. Revenue Chart (timeseries)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_revenue_chart(
  p_from        timestamptz DEFAULT (now() - interval '30 days'),
  p_to          timestamptz DEFAULT now(),
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE (
  period_label  text,
  revenue       numeric,
  order_count   bigint,
  profit        numeric
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
  SELECT
    to_char(date_trunc(p_granularity, o.created_at AT TIME ZONE 'Europe/London'), 
      CASE p_granularity
        WHEN 'day'   THEN 'DD Mon'
        WHEN 'week'  THEN 'DD Mon'
        WHEN 'month' THEN 'Mon YYYY'
        ELSE 'DD Mon'
      END
    )                                                         AS period_label,
    COALESCE(SUM(o.total), 0)                                 AS revenue,
    COUNT(o.id)::bigint                                       AS order_count,
    COALESCE(SUM(o.total), 0) - COALESCE(SUM(
      COALESCE(p.cost_price, oi.unit_price * 0.75) * oi.quantity
    ), 0)                                                     AS profit
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.payment_status = 'paid'
    AND o.is_deleted = false
    AND o.created_at >= p_from
    AND o.created_at < p_to
  GROUP BY date_trunc(p_granularity, o.created_at AT TIME ZONE 'Europe/London')
  ORDER BY date_trunc(p_granularity, o.created_at AT TIME ZONE 'Europe/London');
END;
$$;

-- Grant execute to authenticated users (is_admin() check inside each fn)
GRANT EXECUTE ON FUNCTION get_profit_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_replenishment_reserve(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_kpis(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_by_revenue(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_by_profit(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_kpis(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_chart(timestamptz, timestamptz, text) TO authenticated;
