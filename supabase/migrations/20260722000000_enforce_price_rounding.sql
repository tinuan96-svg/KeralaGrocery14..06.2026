-- Function to enforce rounding on product prices
CREATE OR REPLACE FUNCTION enforce_product_price_rounding()
RETURNS TRIGGER AS $$
BEGIN
  -- Round up price to nearest 0.10
  IF NEW.price IS NOT NULL AND NEW.price > 0 THEN
    NEW.price := CEIL(NEW.price * 10) / 10;
  END IF;

  -- Round up selling_price to nearest 0.10
  IF NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 THEN
    NEW.selling_price := CEIL(NEW.selling_price * 10) / 10;
  END IF;

  -- Round up original_price to nearest 0.10
  IF NEW.original_price IS NOT NULL AND NEW.original_price > 0 THEN
    NEW.original_price := CEIL(NEW.original_price * 10) / 10;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run BEFORE every insert or update on products
DROP TRIGGER IF EXISTS trigger_enforce_product_price_rounding ON products;
CREATE TRIGGER trigger_enforce_product_price_rounding
BEFORE INSERT OR UPDATE OF price, selling_price, original_price ON products
FOR EACH ROW
EXECUTE FUNCTION enforce_product_price_rounding();

-- Apply to existing products immediately
UPDATE products
SET price = CEIL(price * 10) / 10,
    selling_price = CEIL(COALESCE(selling_price, price) * 10) / 10
WHERE price > 0;
