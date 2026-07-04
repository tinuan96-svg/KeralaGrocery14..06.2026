/*
  # Revoke anon SELECT on internal/admin tables to hide from GraphQL introspection

  ## Problem
  pg_graphql exposes table schemas to any role that has SELECT privilege on a table,
  even when RLS restricts all rows. This lets unauthenticated users (anon) introspect
  the structure of internal tables via the /graphql/v1 endpoint.

  ## Tables exposed to anon that should NOT be:
  - app_config: internal store configuration
  - image_processing_jobs: internal image pipeline state
  - ingestion_jobs: internal product ingestion pipeline
  - keralagroceries: raw source import table (storefront uses v_storefront_products)
  - store_products_view: internal duplicate view not needed by anon

  ## Fix
  Revoke SELECT privilege from anon on these tables.
  The storefront exclusively uses v_storefront_products and the RPC functions
  (get_dynamic_banner_products, get_homepage_section_products) — it has no
  direct need to query these internal tables.

  ## Tables retained for anon (legitimately needed):
  - products, product_variants, product_images (product detail pages)
  - categories, brands, store_categories (filters + navigation)
  - store_products (product listing)
  - v_storefront_products (main storefront view)
  - banners, carousel_banners, homepage_section_products, promotions (homepage)
*/

REVOKE SELECT ON public.app_config FROM anon;
REVOKE SELECT ON public.image_processing_jobs FROM anon;
REVOKE SELECT ON public.ingestion_jobs FROM anon;
REVOKE SELECT ON public.keralagroceries FROM anon;
REVOKE SELECT ON public.store_products_view FROM anon;
