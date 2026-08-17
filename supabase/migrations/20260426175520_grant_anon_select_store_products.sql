/*
  # Grant SELECT on store_products to anon role

  The anon role was missing the SELECT privilege on store_products,
  causing "permission denied" for unauthenticated product listing pages.
  The RLS policy allowing public read already exists — this just restores
  the missing table-level grant.
*/

GRANT SELECT ON TABLE public.store_products TO anon;
