/*
  # Phase 3: Drop orders.store_id column

  ## Changes
  - Drop `orders.store_id` column (nullable FK to `stores`)

  ## Rationale
  - `store_id` on orders was populated by looking up the single KeralaGroceries store row
    before every order insert — purely ceremonial in a single-store setup
  - The `stores` table is kept as a config singleton for `homepage_sections`
  - Removing this column eliminates the need to do a store lookup on every order creation,
    simplifying the create-order Edge Function and lib/actions/orders.ts

  ## Impact
  - `orders` table retains all other columns unchanged
  - The FK constraint to `stores` is dropped automatically with the column
  - `stores` table is NOT dropped (retained for homepage_sections)
*/

ALTER TABLE public.orders DROP COLUMN IF EXISTS store_id;
