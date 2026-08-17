/*
  # Enforce phone verification on user profiles

  ## Changes
  1. user_profiles
     - Add `name` column (text) — preferred over display_name for UI
     - Add `phone_verified` (boolean, default false) — set true after OTP confirmed
     - Add UNIQUE constraint on phone to prevent duplicates across users
     - Backfill `name` from existing display_name values

  2. Security
     - No RLS changes needed; existing policies cover the new columns
*/

-- 1. Add name column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN name text;
  END IF;
END $$;

-- 2. Add phone_verified column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Backfill name from display_name
UPDATE user_profiles
SET name = display_name
WHERE name IS NULL AND display_name IS NOT NULL;

-- 4. Unique partial index: only one user per non-null phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone_unique
  ON user_profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';
