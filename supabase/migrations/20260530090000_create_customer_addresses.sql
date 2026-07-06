/*
  # Create customer_addresses table

  ## Summary
  Adds a full address book system for customers, enabling them to save, manage, and reuse
  delivery addresses across orders.

  ## New Tables
  - `customer_addresses`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users, not null)
    - `label` (text) — "Home", "Work", "Other", or custom
    - `full_name` (text, not null)
    - `phone` (text)
    - `address_line_1` (text, not null)
    - `address_line_2` (text)
    - `city` (text, not null)
    - `county` (text)
    - `postcode` (text, not null)
    - `country` (text, default 'GB')
    - `is_default` (boolean, default false)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Constraints
  - Max 10 addresses per user enforced at DB level via check trigger
  - Unique constraint: only one default address per user at a time (enforced via trigger)

  ## Security
  - RLS enabled
  - Authenticated users can only access their own addresses
  - Insert, select, update, delete policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS customer_addresses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           text NOT NULL DEFAULT 'Home',
  full_name       text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  address_line_1  text NOT NULL DEFAULT '',
  address_line_2  text NOT NULL DEFAULT '',
  city            text NOT NULL DEFAULT '',
  county          text NOT NULL DEFAULT '',
  postcode        text NOT NULL DEFAULT '',
  country         text NOT NULL DEFAULT 'GB',
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_default ON customer_addresses(user_id, is_default) WHERE is_default = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_address_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_customer_address_timestamp();

-- Enforce max 10 addresses per user
CREATE OR REPLACE FUNCTION check_address_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM customer_addresses WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 addresses per user exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_address_limit
  BEFORE INSERT ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION check_address_limit();

-- When an address is set as default, clear all other defaults for the same user
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE customer_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_address
  AFTER INSERT OR UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_address();

-- Enable RLS
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own addresses
CREATE POLICY "Users can view own addresses"
  ON customer_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: users can add their own addresses
CREATE POLICY "Users can insert own addresses"
  ON customer_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON customer_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON customer_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
