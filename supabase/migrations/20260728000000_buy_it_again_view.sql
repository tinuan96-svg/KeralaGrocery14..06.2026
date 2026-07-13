-- Create a view to identify frequently ordered products per user
CREATE OR REPLACE VIEW view_buy_it_again AS
SELECT
    o.user_id,
    p.id as product_id,
    p.name,
    p.slug,
    p.price,
    p.original_price,
    p.image_url,
    p.image_main,
    p.enhanced_image_url,
    p.image_medium,
    p.stock,
    p.stock_quantity,
    p.approval_status,
    p.visibility_status,
    p.is_active,
    p.is_deleted,
    p.category_id,
    COUNT(oi.id) as order_count,
    MAX(o.created_at) as last_ordered_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.payment_status = 'paid'
  AND p.approval_status = 'approved'
  AND p.visibility_status = true
  AND p.is_active = true
  AND (p.is_deleted IS NULL OR p.is_deleted = false)
GROUP BY o.user_id, p.id
ORDER BY order_count DESC, last_ordered_at DESC;

-- Grant access to the view
GRANT SELECT ON view_buy_it_again TO authenticated;
