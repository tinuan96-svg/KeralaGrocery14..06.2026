/*
  # Create admin_activity_log table

  ## Purpose
  Stores recent admin-facing activity events for the dashboard activity feed.
  Events are inserted by database triggers and application code.

  ## New Tables
  - `admin_activity_log`
    - `id` (uuid, PK)
    - `event_type` (text) — e.g. 'order_placed', 'product_approved', 'price_updated', 'sync_completed', 'banner_changed'
    - `description` (text) — human-readable summary
    - `entity_id` (uuid, nullable) — related record id
    - `entity_name` (text, nullable) — human label of the related entity
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Admins (is_admin = true in app_metadata) can SELECT all rows
  - No public read — this is internal admin-only data
*/

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text NOT NULL,
  description  text NOT NULL,
  entity_id    uuid,
  entity_name  text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx ON admin_activity_log (created_at DESC);

-- Admins can read the activity log
CREATE POLICY "Admins can read activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Admins can insert activity entries
CREATE POLICY "Admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Trigger function: log product approval status changes
CREATE OR REPLACE FUNCTION log_product_approval_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.approval_status = 'approved' THEN
    INSERT INTO admin_activity_log (event_type, description, entity_id, entity_name)
    VALUES ('product_approved', 'Product approved: ' || NEW.name, NEW.id, NEW.name);
  END IF;
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price AND NEW.selling_price IS NOT NULL THEN
    INSERT INTO admin_activity_log (event_type, description, entity_id, entity_name)
    VALUES ('price_updated', 'Price updated: ' || NEW.name || ' → £' || round(NEW.selling_price::numeric, 2)::text, NEW.id, NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_product_approval ON products;
CREATE TRIGGER trg_log_product_approval
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION log_product_approval_activity();

-- Trigger function: log new orders
CREATE OR REPLACE FUNCTION log_order_placed_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_activity_log (event_type, description, entity_id, entity_name)
  VALUES ('order_placed', 'Order placed: #' || NEW.order_number || ' by ' || NEW.customer_name || ' — £' || round(NEW.total::numeric, 2)::text, NEW.id, NEW.order_number);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_placed ON orders;
CREATE TRIGGER trg_log_order_placed
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_placed_activity();

-- Trigger function: log sync completions
CREATE OR REPLACE FUNCTION log_sync_completed_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' AND (OLD.status IS DISTINCT FROM 'success') THEN
    INSERT INTO admin_activity_log (event_type, description, entity_id, entity_name)
    VALUES (
      'sync_completed',
      'CentralHub sync completed — ' || NEW.imported_new || ' new, ' || NEW.updated_existing || ' updated',
      NEW.id,
      'sync_log'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_sync_completed ON sync_log;
CREATE TRIGGER trg_log_sync_completed
  AFTER UPDATE ON sync_log
  FOR EACH ROW EXECUTE FUNCTION log_sync_completed_activity();
