/*
  # Fix storefront view and keralagroceries table permissions

  ## Problem
  - v_storefront_products: anon and authenticated roles have no SELECT privilege
  - keralagroceries: anon role has no SELECT privilege
  - Both are needed for the public product listing to work

  ## Changes
  1. Grant SELECT on v_storefront_products to anon and authenticated
  2. Grant SELECT on keralagroceries to anon (authenticated already has it)
  3. The view is SECURITY INVOKER by default, so the underlying table grants
     must also allow anon/authenticated reads

  ## Notes
  - These are read-only grants on public storefront data
  - No sensitive data is exposed (view only returns active products)
*/

-- Grant SELECT on the storefront view to public roles
GRANT SELECT ON v_storefront_products TO anon, authenticated;

-- Grant SELECT on the underlying keralagroceries table to anon
-- (authenticated already has SELECT per existing grants)
GRANT SELECT ON keralagroceries TO anon;
