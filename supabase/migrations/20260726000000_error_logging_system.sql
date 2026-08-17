/*
  # Client-side Error Logging System

  ## Purpose
  Provides a way to capture and store frontend errors (React rendering errors, JS exceptions)
  to improve observability and debugging without requiring third-party tools like Sentry initially.
*/

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text,
  stack text,
  component_stack text,
  url text,
  user_id uuid, -- Reference to user if logged in
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts so we capture errors even for non-logged-in users
CREATE POLICY "Public can insert error logs"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view logs
CREATE POLICY "Admins can view error logs"
  ON public.client_error_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.client_error_logs(created_at);
