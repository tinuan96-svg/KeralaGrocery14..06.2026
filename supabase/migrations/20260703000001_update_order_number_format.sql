-- Create a sequence for order numbers starting from 5320
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 5320;

-- Update the generate_order_number function to use the new format
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN 'KG-' || nextval('order_number_seq')::text;
END;
$$;

-- Update existing orders to the new format
-- We use a loop to ensure each order gets a unique number from the sequence
-- ordered by their original creation date to maintain chronological order.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- We only update orders that don't already have the 'KG-' prefix
    -- to avoid re-numbering if the migration is run multiple times
    FOR r IN (
        SELECT id
        FROM orders
        WHERE order_number NOT LIKE 'KG-%'
        ORDER BY created_at ASC
    ) LOOP
        UPDATE orders
        SET order_number = 'KG-' || nextval('order_number_seq')::text
        WHERE id = r.id;
    END LOOP;
END $$;
