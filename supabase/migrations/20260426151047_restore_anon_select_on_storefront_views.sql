/*
  # Restore anon SELECT on storefront views

  The previous migration over-revoked SELECT from v_storefront_products and
  store_products_view, which are required by the public storefront to display
  products. Restoring anon SELECT on these views. RLS on underlying tables
  still controls what rows are actually returned.
*/

GRANT SELECT ON public.v_storefront_products TO anon;
GRANT SELECT ON public.store_products_view TO anon;
