/*
  # Fix orders.is_deleted missing default

  ## Problem
  The `is_deleted` column on the `orders` table is NOT NULL but has no default value.
  When the create-order edge function inserts a new order without specifying `is_deleted`,
  Postgres rejects it with a NOT NULL constraint violation, causing "Failed to create order".

  ## Fix
  Set the default value of `is_deleted` to `false`.
*/

ALTER TABLE orders ALTER COLUMN is_deleted SET DEFAULT false;
