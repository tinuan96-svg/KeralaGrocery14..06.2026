/*
  # Extend homepage_sections allowlist and create promotions table

  ## Summary
  1. Drops and recreates the section_name check constraint on homepage_sections
     to include 'promotions' as a valid built-in section type.
  2. Creates the promotions table for time-bounded promotional offers.
  3. Seeds a 'promotions' homepage section and two sample active promotions
     for the keralagroceries store.

  ## Changes

  ### homepage_sections
  - Constraint `homepage_sections_section_name_check` is replaced to allow
    the new 'promotions' value in addition to existing built-in names.

  ### New Table: promotions
  - `id` (uuid, PK)
  - `store_id` (uuid, FK → stores.id)
  - `title` - Promotion headline
  - `description` - Optional body copy
  - `image_url` - Optional card image
  - `link_url` - Optional CTA destination
  - `badge_text` - Short label e.g. "20% OFF"
  - `status` - 'active' | 'inactive' | 'scheduled'
  - `priority` - Higher = shown first
  - `start_date` / `end_date` - Optional date-range gating (NULL = unrestricted)
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled on promotions
  - Anon + authenticated can SELECT where status = 'active'
  - No public write access
*/

ALTER TABLE homepage_sections
  DROP CONSTRAINT IF EXISTS homepage_sections_section_name_check;

ALTER TABLE homepage_sections
  ADD CONSTRAINT homepage_sections_section_name_check CHECK (
    (section_name = ANY (ARRAY[
      'offers'::text,
      'bestsellers'::text,
      'new_arrivals'::text,
      'trending'::text,
      'low_price'::text,
      'deals_for_you'::text,
      'promotions'::text
    ])) OR (section_name ~ '^custom_[a-z][a-z0-9_]{1,48}$'::text)
  );

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  badge_text text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled')),
  priority integer NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_store_id ON promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON promotions(store_id, status, priority DESC);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active promotions"
  ON promotions FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

INSERT INTO homepage_sections (store_id, section_name, display_name, mode, is_active, product_limit)
VALUES (
  'a2e4d9f9-6b51-4071-97eb-decf72485b5a',
  'promotions',
  'Current Offers',
  'manual',
  true,
  20
)
ON CONFLICT DO NOTHING;

INSERT INTO promotions (store_id, title, description, badge_text, link_url, status, priority, start_date, end_date)
VALUES
  (
    'a2e4d9f9-6b51-4071-97eb-decf72485b5a',
    'Free Delivery on Orders Over £40',
    'Get free next-day delivery on all orders above £40. No code needed — offer applied automatically at checkout.',
    'FREE DELIVERY',
    '/products',
    'active',
    10,
    now(),
    now() + interval '30 days'
  ),
  (
    'a2e4d9f9-6b51-4071-97eb-decf72485b5a',
    '10% Off Your First Order',
    'New to Kerala Grocery? Use code WELCOME10 at checkout to save 10% on your first order.',
    '10% OFF',
    '/products',
    'active',
    5,
    now(),
    now() + interval '60 days'
  );
