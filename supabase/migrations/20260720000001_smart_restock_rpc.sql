-- RPC to identify products that might need restocking
CREATE OR REPLACE FUNCTION get_products_for_restock_check()
RETURNS TABLE (
  user_id uuid,
  customer_name text,
  phone text,
  product_name text,
  slug text,
  last_purchase_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH last_purchases AS (
    -- Get the most recent purchase date for each user/product combo
    SELECT
      o.user_id,
      oi.product_id,
      MAX(o.created_at) as last_at
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      AND o.user_id IS NOT NULL
    GROUP BY o.user_id, oi.product_id
  )
  SELECT
    lp.user_id,
    p.name as customer_name,
    p.phone,
    pr.name as product_name,
    pr.slug,
    lp.last_at as last_purchase_date
  FROM last_purchases lp
  JOIN user_profiles p ON lp.user_id = p.id
  JOIN products pr ON lp.product_id = pr.id
  WHERE
    -- Only suggest restocking for "Essential" categories
    (pr.category ILIKE '%rice%' OR pr.category ILIKE '%oil%' OR pr.category ILIKE '%flour%' OR pr.category ILIKE '%spice%')
    -- If it was bought between 21 and 30 days ago
    AND lp.last_at < (now() - interval '21 days')
    AND lp.last_at > (now() - interval '30 days')
    AND p.phone IS NOT NULL
    AND p.phone_verified = true
    AND pr.is_active = true
    AND pr.stock > 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
