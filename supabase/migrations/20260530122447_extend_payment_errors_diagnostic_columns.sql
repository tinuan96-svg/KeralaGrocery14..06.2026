/*
  # Extend payment_errors table with diagnostic columns

  1. Changes
     - `http_status`     (integer)  — HTTP status code returned by Worldpay
     - `amount_pence`    (integer)  — Order amount in pence at time of failure
     - `merchant_entity` (text)     — Worldpay merchant entity used in the request

  2. Notes
     - All new columns are nullable — existing rows are unaffected
     - No RLS changes needed; table is already service_role-only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_errors' AND column_name = 'http_status'
  ) THEN
    ALTER TABLE payment_errors ADD COLUMN http_status integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_errors' AND column_name = 'amount_pence'
  ) THEN
    ALTER TABLE payment_errors ADD COLUMN amount_pence integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_errors' AND column_name = 'merchant_entity'
  ) THEN
    ALTER TABLE payment_errors ADD COLUMN merchant_entity text;
  END IF;
END $$;
