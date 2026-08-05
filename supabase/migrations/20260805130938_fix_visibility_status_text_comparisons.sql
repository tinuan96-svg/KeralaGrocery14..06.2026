/*
# Fix visibility_status text comparisons in RPC functions

The `products.visibility_status` column is of type `text` (values: 'visible', 'hidden'),
but several RPC functions compare it with boolean `true`, causing:
  ERROR: operator does not exist: text = boolean

1. Modified Functions
- `get_category_carousel()`: Changed `p.visibility_status = true` → `p.visibility_status = 'visible'`
- `get_product_variants(p_variant_group_id)`: Changed `p.visibility_status = true` → `p.visibility_status = 'visible'`

2. Security
- No RLS or policy changes. Functions remain STABLE and SECURITY DEFINER-free.
- search_path remains 'public' on both functions.
*/

CREATE OR REPLACE FUNCTION public.get_category_carousel()
RETURNS TABLE(id uuid, name text, slug text, sort_order integer, product_count bigint, hero_image text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
SELECT
  c.id,
  c.name,
  c.slug,
  c.sort_order,
  COUNT(p.id) AS product_count,
  (
    SELECT p2.image_url
    FROM   products p2
    WHERE  p2.category_id = c.id
    AND    p2.is_active   = true
    AND    p2.is_deleted  = false
    AND    p2.image_url  IS NOT NULL
    AND    p2.image_url  NOT LIKE '/placeholder%'
    AND    p2.image_url  LIKE 'http%'
    ORDER BY
      p2.image_quality_score DESC NULLS LAST,
      p2.is_featured         DESC NULLS LAST,
      p2.sold_count          DESC NULLS LAST
    LIMIT 1
  ) AS hero_image
FROM  categories c
LEFT  JOIN products p
ON    p.category_id = c.id
AND   p.is_active   = true
AND   p.is_deleted  = false
AND   p.approval_status    = 'approved'
AND   p.visibility_status  = 'visible'
WHERE c.is_active        = true
AND   c.show_on_homepage = true
GROUP BY c.id, c.name, c.slug, c.sort_order
ORDER BY c.sort_order ASC, c.name ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_product_variants(p_variant_group_id uuid)
RETURNS TABLE(id uuid, name text, slug text, variant_size text, variant_weight_g numeric, variant_unit text, price numeric, compare_price numeric, image_url text, image_main text, in_stock boolean)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.variant_size,
    p.variant_weight_g,
    p.variant_unit,
    p.price,
    p.compare_price,
    p.image_url,
    p.image_main,
    (COALESCE(p.stock, 0) > 0)
  FROM products p
  WHERE p.variant_group_id = p_variant_group_id
    AND p.is_deleted = false
    AND p.approval_status = 'approved'
    AND p.visibility_status = 'visible'
  ORDER BY p.variant_weight_g NULLS LAST, p.variant_size NULLS LAST;
END;
$function$;