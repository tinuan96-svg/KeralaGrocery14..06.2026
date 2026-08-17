
-- ── 1. Fix banner_analytics RLS INSERT policies ──────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON banner_analytics;
DROP POLICY IF EXISTS "Authenticated can insert analytics events" ON banner_analytics;

CREATE POLICY "Anon can insert analytics events"
  ON banner_analytics FOR INSERT
  TO anon
  WITH CHECK (
    banner_id IS NOT NULL
    AND event_type IN ('view', 'click')
  );

CREATE POLICY "Authenticated can insert analytics events"
  ON banner_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    banner_id IS NOT NULL
    AND event_type IN ('view', 'click')
  );

-- ── 2. Fix banner-images storage SELECT policy (prevents full-bucket listing) ─

DROP POLICY IF EXISTS "Public read banner images" ON storage.objects;

CREATE POLICY "Public read banner images"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'banner-images'
    AND name IS NOT NULL
    AND name <> ''
  );

-- ── 3. Revoke trigger functions from PUBLIC, anon, authenticated ──────────────

REVOKE EXECUTE ON FUNCTION public.check_address_limit()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_single_default_address()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_customer_address_timestamp()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_media_link_count()
  FROM PUBLIC, anon, authenticated;

-- ── 4. Revoke is_admin() from anon ────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.is_admin()
  FROM anon;

-- ── 5. Revoke write-side SECURITY DEFINER functions from authenticated ────────

REVOKE EXECUTE ON FUNCTION public.ensure_wallet(uuid)
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_loyalty_cycle(uuid, timestamptz)
  FROM authenticated;

-- ── 6. Revoke get_media_stats() from authenticated ───────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_media_stats()
  FROM authenticated;

-- ── 7. Switch wallet-read functions to SECURITY INVOKER ──────────────────────

CREATE OR REPLACE FUNCTION public.get_wallet_tier(spend numeric)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  s wallet_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM wallet_settings WHERE id = 1;
  IF spend >= s.gold_min    THEN RETURN 'gold';
  ELSIF spend >= s.silver_min THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_cashback_rate(tier text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  s wallet_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM wallet_settings WHERE id = 1;
  IF tier = 'gold'   THEN RETURN s.gold_rate;
  ELSIF tier = 'silver' THEN RETURN s.silver_rate;
  ELSE RETURN s.bronze_rate;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_cycle_days(tier text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  s wallet_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM wallet_settings WHERE id = 1;
  IF tier = 'gold'   THEN RETURN s.gold_days;
  ELSIF tier = 'silver' THEN RETURN s.silver_days;
  ELSE RETURN s.bronze_days;
  END IF;
END;
$$;
