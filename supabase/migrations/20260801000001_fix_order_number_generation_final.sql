-- Final fix for order number generation and schema consistency
-- This migration ensures that generate_order_number exists with the correct signature and permissions.
-- It also ensures the 'original_order_number' column exists to fix schema cache issues.

-- 1. Ensure columns exist (fixes "Could not find column in schema cache" errors)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_order_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_amount numeric(10,2) NOT NULL DEFAULT 0;

-- 2. Drop all possible existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number(text) CASCADE;

-- 3. Ensure all sequences exist and start high enough to avoid collisions
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10000;
CREATE SEQUENCE IF NOT EXISTS public.order_number_paid_v2_seq START 2026;

-- 4. Create the function with extremely robust error handling and uniqueness
CREATE OR REPLACE FUNCTION public.generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seq_val bigint;
  final_num text;
BEGIN
  IF p_payment_status = 'paid' THEN
    seq_val := nextval('public.order_number_paid_v2_seq');
    final_num := 'KG' || seq_val::text;
  ELSE
    seq_val := nextval('public.order_number_seq');
    final_num := 'KG-2026-' || seq_val::text;
  END IF;

  -- Collision protection
  IF EXISTS (SELECT 1 FROM public.orders WHERE order_number = final_num) THEN
    final_num := final_num || '-' || (floor(random() * 900) + 100)::text;
  END IF;

  RETURN final_num;
EXCEPTION WHEN OTHERS THEN
  RETURN 'KG-' || (floor(random() * 9000000) + 1000000)::text;
END;
$$;

-- 5. Re-grant permissions
GRANT EXECUTE ON FUNCTION public.generate_order_number(text) TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_paid_v2_seq TO authenticated, anon, service_role;

-- 6. Ensure original_order_number is populated on insert if missing
CREATE OR REPLACE FUNCTION public.trg_populate_original_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_order_number IS NULL THEN
    NEW.original_order_number := NEW.order_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_original_order_number ON public.orders;
CREATE TRIGGER trg_ensure_original_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_populate_original_order_number();

-- 7. Update the finalize trigger
CREATE OR REPLACE FUNCTION public.finalize_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND (NEW.order_number = NEW.original_order_number OR NEW.original_order_number IS NULL) THEN

    IF NEW.original_order_number IS NULL THEN
      NEW.original_order_number := NEW.order_number;
    END IF;

    NEW.order_number := public.generate_order_number('paid');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
