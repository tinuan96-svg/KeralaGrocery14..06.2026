/*
  # CentralHub Sync Tracking

  ## Summary
  Adds infrastructure for syncing products from the CentralHub API into the
  local KeralaGroceries products table.

  ## Changes

  ### products table
  - `source_product_id` (text, nullable, unique) — the CentralHub product ID; used
    to detect duplicates during sync and avoid re-importing the same product twice.
  - `source_name` (text, nullable) — original product name from CentralHub, stored
    so it can be displayed alongside the locally overridden name.

  ### New table: sync_log
  Stores a record of every sync attempt for diagnostics.
  - `id` — primary key
  - `started_at` — when the sync began
  - `finished_at` — when it completed (NULL while running)
  - `status` — 'running' | 'success' | 'error'
  - `total_fetched` — products returned by CentralHub API
  - `imported_new` — newly inserted products (draft)
  - `updated_existing` — products that already existed and had last_sync_at updated
  - `failed` — products that could not be imported
  - `error_detail` — array of error strings
  - `triggered_by` — 'manual' | 'scheduled'

  ## Security
  - RLS enabled on sync_log; only admins can read/write
  - source_product_id indexed for fast duplicate detection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'source_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN source_product_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'source_name'
  ) THEN
    ALTER TABLE products ADD COLUMN source_name text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_product_id
  ON products(source_product_id) WHERE source_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_source_product_id_lookup
  ON products(source_product_id);

CREATE TABLE IF NOT EXISTS sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  total_fetched integer NOT NULL DEFAULT 0,
  imported_new integer NOT NULL DEFAULT 0,
  updated_existing integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  error_detail text[] DEFAULT '{}',
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled'))
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sync_log"
  ON sync_log FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert sync_log"
  ON sync_log FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sync_log"
  ON sync_log FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
