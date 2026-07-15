-- Recovery Migration: Ensure all missing database objects are present

-- 1. Ensure 'cart' table exists and has correct columns (renamed from cart_items if needed)
CREATE TABLE IF NOT EXISTS public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Copy data from cart_items to cart if cart_items exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
        INSERT INTO public.cart (id, user_id, product_id, quantity, created_at, updated_at)
        SELECT id, user_id, product_id, quantity, created_at, updated_at FROM public.cart_items
        ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;
END $$;

-- 2. Ensure get_category_carousel function exists
CREATE OR REPLACE FUNCTION public.get_category_carousel()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  sort_order integer,
  product_count bigint,
  hero_image text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.sort_order,
    COUNT(p.id) as product_count,
    MAX(p.enhanced_image_url) as hero_image
  FROM categories c
  LEFT JOIN products p ON c.id = p.category_id AND p.approval_status = 'approved' AND p.visibility_status = true
  WHERE c.is_active = true AND c.show_on_homepage = true
  GROUP BY c.id
  ORDER BY c.sort_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_category_carousel() TO anon, authenticated;

-- 3. Ensure view_buy_it_again exists
CREATE OR REPLACE VIEW public.view_buy_it_again AS
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

GRANT SELECT ON public.view_buy_it_again TO authenticated;

-- 4. Ensure realtime_sync_events table exists
CREATE TABLE IF NOT EXISTS public.realtime_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centralhub_product_id text,
  event_type text,
  status text,
  payload jsonb,
  error_message text,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 5. Ensure price_history table exists
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  old_cost_price numeric,
  new_cost_price numeric,
  old_selling_price numeric,
  new_selling_price numeric,
  markup_percentage numeric,
  changed_by text,
  created_at timestamptz DEFAULT now()
);

-- 6. Ensure products table has all required columns for sync
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'source_name') THEN
    ALTER TABLE products ADD COLUMN source_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'source_brand') THEN
    ALTER TABLE products ADD COLUMN source_brand text;
  END IF;
END $$;
