-- Ensure brands table exists
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  show_on_homepage boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  show_on_homepage boolean DEFAULT true,
  icon text,
  sort_order integer DEFAULT 0
);

-- Ensure get_category_carousel function exists (it was missing in some environments)
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

-- Ensure view_buy_it_again exists
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

-- Ensure cart table exists
CREATE TABLE IF NOT EXISTS public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
  ON public.cart FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
