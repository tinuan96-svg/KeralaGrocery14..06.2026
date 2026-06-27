/*
  # Category Discovery Carousel — missing categories + helper function

  1. New Categories Added
     - Ready To Eat (sort_order: 7)
     - Frozen Foods (sort_order: 8)
     - Sweets (sort_order: 9)
     - Personal Care (sort_order: 11)
     - Beverages (sort_order: 12)
     - Spices (sort_order: 13)
     - Tea & Coffee show_on_homepage flag corrected to true

  2. New Function
     - `get_category_carousel()` — returns categories with their
       best representative product image and live product count,
       ordered by sort_order.
       Accessible to anon + authenticated roles (read-only, no RLS bypass).
*/

-- ── Ensure Tea & Coffee shows on homepage ─────────────────────────────────────
UPDATE categories
SET show_on_homepage = true
WHERE slug = 'tea-coffee';

-- ── Insert missing categories (idempotent) ────────────────────────────────────
INSERT INTO categories (id, name, slug, sort_order, is_active, show_on_homepage)
VALUES
  (gen_random_uuid(), 'Ready To Eat',   'ready-to-eat',   7,  true, true),
  (gen_random_uuid(), 'Frozen Foods',   'frozen-foods',   8,  true, true),
  (gen_random_uuid(), 'Sweets',         'sweets',         9,  true, true),
  (gen_random_uuid(), 'Personal Care',  'personal-care',  11, true, true),
  (gen_random_uuid(), 'Beverages',      'beverages',      12, true, true),
  (gen_random_uuid(), 'Spices',         'spices',         13, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ── Helper function ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_category_carousel()
RETURNS TABLE (
  id            uuid,
  name          text,
  slug          text,
  sort_order    integer,
  product_count bigint,
  hero_image    text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    c.sort_order,
    COUNT(p.id)                                              AS product_count,
    (
      SELECT p2.image_url
      FROM   products p2
      WHERE  p2.category_id = c.id
        AND  p2.is_active   = true
        AND  p2.is_deleted  = false
        AND  p2.image_url  IS NOT NULL
        AND  p2.image_url  NOT LIKE '/placeholder%'
        AND  p2.image_url  LIKE 'http%'
      ORDER BY
        p2.image_quality_score DESC NULLS LAST,
        p2.is_featured         DESC NULLS LAST,
        p2.sold_count          DESC NULLS LAST
      LIMIT 1
    )                                                        AS hero_image
  FROM  categories c
  LEFT  JOIN products p
        ON  p.category_id = c.id
        AND p.is_active   = true
        AND p.is_deleted  = false
        AND p.approval_status    = 'approved'
        AND p.visibility_status  = true
  WHERE c.is_active        = true
    AND c.show_on_homepage = true
  GROUP BY c.id, c.name, c.slug, c.sort_order
  ORDER BY c.sort_order ASC, c.name ASC;
$$;

-- Grant read access to all authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_category_carousel() TO anon, authenticated;
