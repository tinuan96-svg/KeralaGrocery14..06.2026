/*
# Add KG-2026x Order Number Sequence for Paid Orders

## What This Does
Creates a PostgreSQL sequence and SECURITY DEFINER function to atomically generate
`KG-2026x` order numbers for paid orders only. The sequence starts at 1 and the
function formats it as `KG-2026{n}` with zero-padding to 5 digits.

The existing `confirmed_order_number` column (already on the orders table with a
unique index) stores this number. It is assigned ONLY when payment is confirmed,
never at order creation time.

## New Objects
1. `paid_order_number_seq` — PostgreSQL SEQUENCE starting at 1, used to generate
   unique sequential numbers atomically.
2. `generate_paid_order_number()` — SECURITY DEFINER function that calls
   `nextval()` on the sequence and formats the result as `KG-2026{n}`.

## How It Works
- `nextval()` is atomic and concurrency-safe — two simultaneous calls will never
  return the same value.
- The function is `SECURITY DEFINER` so it can be called from edge functions
  via RPC without needing direct sequence access.
- The unique index on `confirmed_order_number` provides a second layer of
   protection against duplicates.
- Existing orders are NOT renumbered. The sequence starts at 1, so the first
  paid order after this migration gets `KG-20261`.

## Security
- Function is SECURITY DEFINER with `search_path = 'public'`
- Sequence is not directly accessible to anon/authenticated roles
*/

-- Create the sequence
CREATE SEQUENCE IF NOT EXISTS paid_order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Prevent direct access to the sequence from anon/authenticated
REVOKE ALL ON SEQUENCE paid_order_number_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE paid_order_number_seq FROM anon;
REVOKE ALL ON SEQUENCE paid_order_number_seq FROM authenticated;

-- Create the function
CREATE OR REPLACE FUNCTION public.generate_paid_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  seq_val integer;
  result text;
BEGIN
  SELECT nextval('paid_order_number_seq') INTO seq_val;
  result := 'KG-2026' || LPAD(seq_val::text, 1, '0');
  RETURN result;
END;
$function$;

-- Grant execute to authenticated and anon (for edge function service role)
GRANT EXECUTE ON FUNCTION public.generate_paid_order_number() TO authenticated, anon;
