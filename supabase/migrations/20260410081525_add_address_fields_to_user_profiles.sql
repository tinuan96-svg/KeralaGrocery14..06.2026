/*
  # Add address fields to user_profiles

  ## Summary
  Adds delivery address fields to the user_profiles table so all website profile
  data is stored in one place, avoiding the legacy `users` table.

  ## New Columns on user_profiles
  - `name` (text): Full name (complements display_name)
  - `address` (text): Street address for delivery
  - `city` (text): City for delivery
  - `postcode` (text): UK postcode for delivery

  ## Notes
  - All columns are nullable to avoid breaking existing rows
  - Existing RLS policies remain unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'postcode'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN postcode text;
  END IF;
END $$;
