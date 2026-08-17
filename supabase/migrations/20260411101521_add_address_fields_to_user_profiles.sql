/*
  # Add address fields to user_profiles

  ## Summary
  Adds delivery address and display name fields to user_profiles so the website
  can store all profile data there instead of the legacy `users` table.

  ## New Columns on user_profiles
  - `name` (text): Full display name
  - `address` (text): Street address for delivery
  - `city` (text): City for delivery
  - `postcode` (text): UK postcode for delivery

  ## Notes
  - All new columns are nullable to avoid breaking existing rows
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
