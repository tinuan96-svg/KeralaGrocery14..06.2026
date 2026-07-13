-- Create an RPC function for fuzzy product searching
CREATE OR REPLACE FUNCTION search_products_fuzzy(
  search_query text,
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  short_description text,
  image_url text,
  image_main text,
  enhanced_image_url text,
  image_medium text,
  price numeric,
  selling_price numeric,
  original_price numeric,
  discount_percentage numeric,
  markup_percentage numeric,
  brand text,
  source_brand text,
  category_id uuid,
  brand_id uuid,
  created_at timestamptz,
  unit text,
  weight numeric,
  stock integer,
  stock_quantity integer,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.slug, p.description, p.short_description,
    p.image_url, p.image_main, p.enhanced_image_url, p.image_medium,
    p.price, p.selling_price, p.original_price, p.discount_percentage,
    p.markup_percentage, p.brand, p.source_brand, p.category_id,
    p.brand_id, p.created_at, p.unit, p.weight, p.stock, p.stock_quantity,
    similarity(p.name, search_query) as similarity_score
  FROM products p
  WHERE
    (p.name % search_query OR p.brand % search_query OR p.name ILIKE '%' || search_query || '%')
    AND p.approval_status = 'approved'
    AND p.is_deleted = false
    AND p.visibility_status = true
    AND p.centralhub_product_id IS NOT NULL
  ORDER BY similarity_score DESC, p.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
