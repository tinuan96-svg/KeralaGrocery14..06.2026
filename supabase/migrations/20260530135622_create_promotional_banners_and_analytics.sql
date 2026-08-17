/*
  # Promotional Banners & Analytics System

  ## Summary
  Creates the full promotional banner system for the homepage carousel and the
  analytics tables for tracking views and clicks.

  ## New Tables

  ### promotional_banners
  - `id` (uuid, primary key)
  - `title` – headline text
  - `subtitle` – short offer text
  - `image_url` – desktop/default banner image (full URL or Supabase storage path)
  - `mobile_image_url` – optional mobile-optimised image
  - `cta_text` – call-to-action button label (e.g. "Shop Now")
  - `cta_link` – CTA destination URL
  - `bg_color` – CSS background color (fallback)
  - `bg_gradient` – full CSS gradient string (takes precedence over bg_color)
  - `text_color` – 'light' | 'dark' (controls text/button contrast)
  - `banner_type` – enum: product_promotion | flash_deal | cashback_promotion |
                    free_delivery | seasonal | new_arrivals | brand_promotion
  - `display_order` (int)
  - `start_date` (date) – null means always
  - `end_date` (date) – null means always
  - `is_active` (boolean)

  ### banner_analytics
  - `id`, `banner_id`, `event_type` (view | click), `session_id`, `user_id`, `created_at`
  - One row per event; kept lightweight for fast inserts during page loads.

  ## Security
  - RLS enabled on both tables.
  - `promotional_banners`: anon can SELECT active banners; admins have full access.
  - `banner_analytics`: anyone can INSERT; admins can SELECT.

  ## Storage
  - `banner-images` storage bucket (public) for banner images.

  ## Seed
  - 4 sample banners so the carousel works immediately.
*/

-- ── promotional_banners ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotional_banners (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  subtitle         text,
  image_url        text,
  mobile_image_url text,
  cta_text         text        NOT NULL DEFAULT 'Shop Now',
  cta_link         text        NOT NULL DEFAULT '/products',
  bg_color         text        NOT NULL DEFAULT '#0B5D3B',
  bg_gradient      text,
  text_color       text        NOT NULL DEFAULT 'light'
                     CHECK (text_color IN ('light', 'dark')),
  banner_type      text        NOT NULL DEFAULT 'product_promotion'
                     CHECK (banner_type IN (
                       'product_promotion','flash_deal','cashback_promotion',
                       'free_delivery','seasonal','new_arrivals','brand_promotion'
                     )),
  display_order    integer     NOT NULL DEFAULT 0,
  start_date       date,
  end_date         date,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotional_banners_active_order
  ON promotional_banners (is_active, display_order, start_date, end_date);

ALTER TABLE promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active banners"
  ON promotional_banners FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= current_date)
    AND (end_date   IS NULL OR end_date   >= current_date)
  );

CREATE POLICY "Authenticated can read active banners"
  ON promotional_banners FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= current_date)
    AND (end_date   IS NULL OR end_date   >= current_date)
  );

CREATE POLICY "Admins can select all banners"
  ON promotional_banners FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert banners"
  ON promotional_banners FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update banners"
  ON promotional_banners FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete banners"
  ON promotional_banners FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── banner_analytics ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banner_analytics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id   uuid        NOT NULL REFERENCES promotional_banners(id) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type IN ('view', 'click')),
  session_id  text,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_event
  ON banner_analytics (banner_id, event_type, created_at DESC);

ALTER TABLE banner_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon visitors) can record events
CREATE POLICY "Anyone can insert analytics events"
  ON banner_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert analytics events"
  ON banner_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read analytics"
  ON banner_analytics FOR SELECT
  TO authenticated
  USING (is_admin());

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-images',
  'banner-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read banner images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'banner-images');

CREATE POLICY "Admins can upload banner images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'banner-images' AND is_admin());

CREATE POLICY "Admins can update banner images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'banner-images' AND is_admin());

CREATE POLICY "Admins can delete banner images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'banner-images' AND is_admin());

-- ── Seed banners ──────────────────────────────────────────────────────────────

INSERT INTO promotional_banners
  (title, subtitle, cta_text, cta_link, bg_gradient, bg_color, text_color, banner_type, display_order, is_active)
VALUES
  (
    'Flash Deals This Week',
    'Save up to 30% on selected Kerala favourites',
    'Shop Deals',
    '/products?filter=deals',
    'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #b91c1c 100%)',
    '#dc2626',
    'light',
    'flash_deal',
    0,
    true
  ),
  (
    'Earn Up To 15% Cashback',
    'Gold Tier loyalty rewards on every order',
    'Learn More',
    '/account/wallet',
    'linear-gradient(135deg, #064e3b 0%, #0B5D3B 50%, #065f46 100%)',
    '#0B5D3B',
    'light',
    'cashback_promotion',
    1,
    true
  ),
  (
    'Free Delivery Weekend',
    'On all orders above £35 — this weekend only',
    'Shop Now',
    '/products',
    'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #1e40af 100%)',
    '#1d4ed8',
    'light',
    'free_delivery',
    2,
    true
  ),
  (
    'New Kerala Spices',
    'Fresh stock just arrived — authentic flavours',
    'Browse',
    '/products',
    'linear-gradient(135deg, #451a03 0%, #b45309 50%, #92400e 100%)',
    '#b45309',
    'light',
    'new_arrivals',
    3,
    true
  );
