/*
  # Rate Limiting System

  ## Purpose
  Provides a database-backed rate limiting mechanism for sensitive Edge Functions
  (like OTP sending) to prevent abuse and "SMS pumping" attacks.
*/

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- e.g., IP address or phone number
  action text NOT NULL,     -- e.g., 'send-otp'
  count integer DEFAULT 1,
  last_request_at timestamptz DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Index for cleanup efficiency
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_request ON public.rate_limits(last_request_at);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window interval;
BEGIN
  v_window := (p_window_seconds || ' seconds')::interval;

  -- 1. Upsert request count
  INSERT INTO public.rate_limits (identifier, action, count, last_request_at)
  VALUES (p_identifier, p_action, 1, now())
  ON CONFLICT (identifier, action)
  DO UPDATE SET
    count = CASE
      WHEN rate_limits.last_request_at < (now() - v_window) THEN 1
      ELSE rate_limits.count + 1
    END,
    last_request_at = now()
  RETURNING count INTO v_count;

  -- 2. Clean up old entries (optional: could be pgcron)
  -- DELETE FROM public.rate_limits WHERE last_request_at < (now() - v_window * 10);

  RETURN v_count <= p_max_requests;
END;
$$;

-- Revoke all on rate_limits from public/anon
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
GRANT SELECT ON public.rate_limits TO service_role;
