/*
  # Announcement Messages Table

  ## Purpose
  Stores rotating promotional announcements shown in the site-wide announcement bar.
  Admins can add, remove, reorder, and toggle messages via the admin panel.

  ## New Table: announcement_messages
  - id: uuid primary key
  - text: message text displayed to users
  - icon: icon name string (truck, gift, zap, star, package, sparkles, etc.)
  - link: optional URL the message links to
  - is_active: whether the message is shown to users
  - display_order: integer used to sort messages in order
  - created_at, updated_at: timestamps

  ## Security
  - RLS enabled
  - Anonymous (public) users can SELECT only active messages
  - Admins can perform all operations using the existing is_admin() function

  ## Default Data
  - 6 default promotional messages are seeded
*/

CREATE TABLE IF NOT EXISTS announcement_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text          text NOT NULL,
  icon          text NOT NULL DEFAULT 'truck',
  link          text,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE announcement_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active announcements"
  ON announcement_messages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage announcements"
  ON announcement_messages FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_announcement_display_order
  ON announcement_messages(display_order) WHERE is_active = true;

-- Seed default messages
INSERT INTO announcement_messages (text, icon, link, display_order) VALUES
  ('Free Delivery Over £45', 'truck', '/delivery-policy', 1),
  ('Earn Up To 15% Cashback', 'gift', '/account/wallet', 2),
  ('Daily Flash Deals', 'zap', '/products?filter=deals', 3),
  ('4.9 Star Customer Rating', 'star', '/about-us', 4),
  ('Next-Day Delivery Available', 'package', '/delivery-policy', 5),
  ('New Kerala Products Weekly', 'sparkles', '/products', 6)
ON CONFLICT DO NOTHING;
