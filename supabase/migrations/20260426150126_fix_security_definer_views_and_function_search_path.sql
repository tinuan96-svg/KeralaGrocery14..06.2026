/*
  # Fix Security Definer Views and Function Search Path

  ## Changes

  ### 1. Remove SECURITY DEFINER from views
  - `v_storefront_products` — recreated as a standard (invoker security) view
  - `store_products_view` — recreated as a standard (invoker security) view
  
  SECURITY DEFINER on views runs the view as the view owner, bypassing RLS on
  underlying tables. Standard views respect the calling user's RLS policies,
  which is the correct behavior.

  ### 2. Fix get_homepage_section_products mutable search_path
  - The single-argument overload lacks `SET search_path TO 'public'`
  - Recreate it with the fixed search path to prevent search_path injection attacks

  ## Security Impact
  - Views will now correctly respect RLS on underlying tables
  - Function is protected against search_path manipulation
*/

-- ============================================================
-- 1. Recreate v_storefront_products without SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE VIEW public.v_storefront_products AS
 SELECT k.id AS row_id,
    k.product_id,
    k.store_id,
    k.product_code,
    k.product_title,
    k.product_display_name,
    k.brand,
    COALESCE(NULLIF(k.adjusted_price, (0)::numeric), NULLIF(k.price, (0)::numeric), ( SELECT min(pv.price) AS min
           FROM product_variants pv
          WHERE ((pv.product_id = k.product_id) AND (pv.is_active = true) AND (pv.price > (0)::numeric)))) AS effective_price,
    COALESCE(NULLIF(k.price, (0)::numeric), ( SELECT min(pv.price) AS min
           FROM product_variants pv
          WHERE ((pv.product_id = k.product_id) AND (pv.is_active = true) AND (pv.price > (0)::numeric)))) AS original_price,
    COALESCE(k.adjusted_qnty, k.qnty) AS effective_stock,
    k.qnty,
    k.adjusted_qnty,
    k.unit,
    k.weight,
    COALESCE(k.category_name_original, k.category_name) AS display_category,
    k.mapped_category_name,
    k.category_name,
    k.main_category,
    k.parent_category,
    k.product_description,
    k.seo_title,
    k.seo_keywords,
    k.seo_description,
    k.status,
    k.backorder_enabled,
    k.created_at,
    p.slug AS product_slug,
    COALESCE(sp.image_override, p.image_url) AS image_url
   FROM (((keralagroceries k
     LEFT JOIN products p ON ((p.id = k.product_id)))
     LEFT JOIN store_products sp ON (((sp.product_id = k.product_id) AND (sp.store_id = k.store_id))))
     LEFT JOIN store_categories sc ON ((sc.id = k.store_category_id)))
  WHERE (k.status = 'active'::text);

-- ============================================================
-- 2. Recreate store_products_view without SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE VIEW public.store_products_view AS
 SELECT p.id,
    p.ms_store_id AS rule_store_id,
    s.name AS store_name,
        CASE
            WHEN (fr.type = 'clean_name'::text) THEN
            CASE
                WHEN (array_length(fr.remove_patterns, 1) > 0) THEN initcap(TRIM(BOTH FROM regexp_replace(p.raw_name, (('(?i)\m('::text || array_to_string(fr.remove_patterns, '|'::text)) || ')\M\s*'::text), ''::text, 'g'::text)))
                ELSE initcap(p.raw_name)
            END
            WHEN (fr.type = 'uppercase'::text) THEN upper(p.raw_name)
            WHEN (fr.type = 'title_case'::text) THEN initcap(p.raw_name)
            ELSE p.raw_name
        END AS final_name,
    round(
        CASE
            WHEN (pr.type = 'percentage_markup'::text) THEN (p.base_price + ((p.base_price * pr.value) / (100)::numeric))
            WHEN (pr.type = 'fixed_markup'::text) THEN (p.base_price + pr.value)
            ELSE p.base_price
        END, 2) AS final_price,
        CASE
            WHEN (sr.type = 'hide_below_threshold'::text) THEN
            CASE
                WHEN (p.raw_stock < sr.threshold) THEN 0
                ELSE p.raw_stock
            END
            WHEN (sr.type = 'buffer_stock'::text) THEN GREATEST(0, (p.raw_stock - sr.threshold))
            ELSE p.raw_stock
        END AS final_stock,
    p.category,
    p.image_url,
    p.is_active
   FROM ((((ms_products p
     JOIN ms_stores s ON ((s.id = p.ms_store_id)))
     JOIN ms_pricing_rules pr ON ((pr.id = s.pricing_rule_id)))
     JOIN ms_formatting_rules fr ON ((fr.id = s.formatting_rule_id)))
     JOIN ms_stock_rules sr ON ((sr.id = s.stock_rule_id)))
  WHERE ((p.is_active = true) AND (s.is_active = true));

-- ============================================================
-- 3. Fix get_homepage_section_products (1-arg) mutable search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_homepage_section_products(p_store_id uuid)
RETURNS TABLE(
  section_id uuid,
  section_name text,
  section_label text,
  section_product_limit integer,
  product_id uuid,
  section_position integer,
  display_name text,
  image_url text,
  price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
with base as (
  select
    b.id as section_id,
    coalesce(nullif(b.display_name, ''), b.section_name) as section_name,
    b.label as section_label,
    b.product_limit as section_product_limit,
    h.product_id,
    h.position as section_position,
    trim(
      case
        when coalesce(nullif(sp.brand_name, ''), nullif(p.brand, '')) is null
          then coalesce(nullif(sp.product_name, ''), p.name)
        when position(lower(coalesce(nullif(sp.brand_name, ''), nullif(p.brand, ''))) in lower(coalesce(nullif(sp.product_name, ''), p.name))) > 0
          then coalesce(nullif(sp.product_name, ''), p.name)
        else coalesce(nullif(sp.product_name, ''), p.name) || ' ' || coalesce(nullif(sp.brand_name, ''), nullif(p.brand, ''))
      end
    ) as display_name,
    coalesce(nullif(sp.image_cdn_url, ''), nullif(sp.image_override, ''), p.image_url) as image_url,
    coalesce(sp.price_override, p.price) as price,
    row_number() over (partition by b.id order by h.position asc, h.created_at asc) as rn
  from public.banners b
  join public.homepage_section_products h
    on h.section_id = b.id
   and h.store_id = p_store_id
  join public.store_products sp
    on sp.product_id = h.product_id
   and sp.store_id = p_store_id
  join public.products p
    on p.id = h.product_id
  where b.store_id = p_store_id
    and b.is_active = true
    and sp.is_active = true
    and p.is_active = true
    and coalesce(p.is_deleted, false) = false
)
select
  section_id,
  section_name,
  section_label,
  section_product_limit,
  product_id,
  section_position,
  display_name,
  image_url,
  price
from base
where rn <= coalesce(section_product_limit, 2147483647)
order by section_name, section_position;
$function$;
