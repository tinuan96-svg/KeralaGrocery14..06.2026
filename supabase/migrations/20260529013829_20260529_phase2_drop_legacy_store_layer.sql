/*
  # Phase 2: Drop legacy store-layer tables

  ## Changes
  These tables are from the old multi-store architecture that pre-dates CentralHub sync.
  All are empty (0 rows) and their only code references are in superseded service files
  that will be updated in the same change set.

  ## Drop order (respects FK dependencies)
  1. `store_categories` — FK child of both `stores` and `categories`; drop first
  2. `keralagroceries` — FK child of `stores` and `products`
  3. `store_products` — FK child of `stores` and `products`
  4. `central_inventory` — FK child of `products`

  ## What replaces them
  - Products now come directly from `products` table via CentralHub sync + approval workflow
  - Category assignment is on `products.category_id` → `categories`
  - No per-store product overrides or inventory tracking needed

  ## Security
  - All associated RLS policies are automatically dropped with each table
*/

DROP TABLE IF EXISTS public.store_categories;
DROP TABLE IF EXISTS public.keralagroceries;
DROP TABLE IF EXISTS public.store_products;
DROP TABLE IF EXISTS public.central_inventory;
