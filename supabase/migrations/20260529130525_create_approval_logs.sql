/*
  # Create approval_logs table

  ## Purpose
  Audit trail for every product approval/rejection/draft action.

  ## New Tables
  - `approval_logs`
    - `id` (uuid, PK)
    - `product_id` (uuid, FK → products, nullable — product may be deleted)
    - `product_name` (text) — snapshot of name at time of action
    - `action` (text) — 'approve' | 'reject' | 'draft' | 'bulk_approve'
    - `admin_user` (uuid) — auth.uid() of the acting admin
    - `success` (boolean)
    - `error_message` (text, nullable) — DB or validation error
    - `missing_fields` (text[], nullable) — fields that were missing at time of action
    - `approval_status_before` (text) — status before the action
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - authenticated admins can INSERT
  - authenticated admins can SELECT (read audit trail)
  - service_role has full access
*/

CREATE TABLE IF NOT EXISTS approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('approve', 'reject', 'draft', 'bulk_approve')),
  admin_user uuid,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  missing_fields text[],
  approval_status_before text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can insert approval logs"
  ON approval_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can read approval logs"
  ON approval_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role full access to approval logs"
  ON approval_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_approval_logs_product_id ON approval_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_admin_user ON approval_logs(admin_user);
CREATE INDEX IF NOT EXISTS idx_approval_logs_created_at ON approval_logs(created_at DESC);
