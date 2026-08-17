/*
  # Allow admin to upsert store_products image_override

  Adds an INSERT and UPDATE policy so admin users (is_admin = true in app_metadata)
  can set image_override on store_products rows for image assignment in the admin panel.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'store_products' AND policyname = 'Admin can insert store_products'
  ) THEN
    CREATE POLICY "Admin can insert store_products"
      ON store_products FOR INSERT
      TO authenticated
      WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'store_products' AND policyname = 'Admin can update store_products'
  ) THEN
    CREATE POLICY "Admin can update store_products"
      ON store_products FOR UPDATE
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
      WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
  END IF;
END $$;
