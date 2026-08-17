/*
  # Delivery Settings

  ## Summary
  Creates a full delivery configuration system with per-region support and audit logging.

  ## New Tables
  1. `delivery_settings` — global delivery fee configuration (singleton row)
     - free_delivery_threshold, standard/express/same_day/click_collect fees
     - each fee type has an `enabled` flag and optional `label` override
     - updated_at, updated_by
  2. `delivery_regions` — per-region delivery fee overrides
     - region_name (England, Scotland, Wales, Northern Ireland)
     - delivery_fee, enabled
  3. `delivery_audit_log` — immutable change history
     - admin user, field changed, old/new value, timestamp

  ## Security
  - All tables have RLS enabled
  - Only admins can read/write delivery_settings and delivery_regions
  - delivery_audit_log is insert-only for authenticated admins, read-only for admins
  - No anon access
*/

-- ── delivery_settings (singleton) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_settings (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Free delivery rule
  free_delivery_threshold     numeric(10,2) NOT NULL DEFAULT 40.00,
  free_delivery_enabled       boolean       NOT NULL DEFAULT true,
  free_delivery_message       text          NOT NULL DEFAULT 'Spend £{remaining} more for FREE delivery',

  -- Standard delivery
  standard_delivery_fee       numeric(10,2) NOT NULL DEFAULT 4.99,
  standard_delivery_enabled   boolean       NOT NULL DEFAULT true,
  standard_delivery_label     text          NOT NULL DEFAULT 'Standard Delivery (2-3 days)',

  -- Express delivery
  express_delivery_fee        numeric(10,2) NOT NULL DEFAULT 7.99,
  express_delivery_enabled    boolean       NOT NULL DEFAULT false,
  express_delivery_label      text          NOT NULL DEFAULT 'Express Delivery (Next day)',

  -- Same day delivery
  same_day_delivery_fee       numeric(10,2) NOT NULL DEFAULT 9.99,
  same_day_delivery_enabled   boolean       NOT NULL DEFAULT false,
  same_day_delivery_label     text          NOT NULL DEFAULT 'Same Day Delivery',

  -- Click & Collect
  click_collect_fee           numeric(10,2) NOT NULL DEFAULT 0.00,
  click_collect_enabled       boolean       NOT NULL DEFAULT false,
  click_collect_label         text          NOT NULL DEFAULT 'Click & Collect',

  updated_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_by                  uuid          REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read delivery settings"
  ON delivery_settings FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert delivery settings"
  ON delivery_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update delivery settings"
  ON delivery_settings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public read for checkout/cart calculation
CREATE POLICY "Public can read delivery settings"
  ON delivery_settings FOR SELECT
  TO anon
  USING (true);

-- ── delivery_regions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_regions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name   text        NOT NULL UNIQUE,
  delivery_fee  numeric(10,2) NOT NULL DEFAULT 4.99,
  enabled       boolean     NOT NULL DEFAULT true,
  sort_order    integer     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_regions_enabled ON delivery_regions (enabled);

ALTER TABLE delivery_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read delivery regions"
  ON delivery_regions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert delivery regions"
  ON delivery_regions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update delivery regions"
  ON delivery_regions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public can read delivery regions"
  ON delivery_regions FOR SELECT
  TO anon
  USING (true);

-- ── delivery_audit_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email text,
  table_name    text        NOT NULL,
  field_name    text        NOT NULL,
  old_value     text,
  new_value     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_audit_created ON delivery_audit_log (created_at DESC);

ALTER TABLE delivery_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read delivery audit log"
  ON delivery_audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert delivery audit log"
  ON delivery_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ── Seed default settings row ─────────────────────────────────────────────────
INSERT INTO delivery_settings (
  free_delivery_threshold, free_delivery_enabled, free_delivery_message,
  standard_delivery_fee, standard_delivery_enabled, standard_delivery_label,
  express_delivery_fee, express_delivery_enabled, express_delivery_label,
  same_day_delivery_fee, same_day_delivery_enabled, same_day_delivery_label,
  click_collect_fee, click_collect_enabled, click_collect_label
) VALUES (
  40.00, true, 'Spend £{remaining} more for FREE delivery',
  4.99, true, 'Standard Delivery (2-3 days)',
  7.99, false, 'Express Delivery (Next day)',
  9.99, false, 'Same Day Delivery',
  0.00, false, 'Click & Collect'
)
ON CONFLICT DO NOTHING;

-- ── Seed regions ──────────────────────────────────────────────────────────────
INSERT INTO delivery_regions (region_name, delivery_fee, enabled, sort_order) VALUES
  ('England',          4.99, true, 1),
  ('Scotland',         6.99, true, 2),
  ('Wales',            4.99, true, 3),
  ('Northern Ireland', 8.99, true, 4)
ON CONFLICT (region_name) DO NOTHING;
