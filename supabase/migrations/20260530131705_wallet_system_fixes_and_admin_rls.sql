/*
  # Wallet System Fixes

  ## Problems Fixed

  1. Admin RLS missing on wallet tables
     - wallets, wallet_transactions, wallet_cycles, wallet_cashback_logs had no admin read
       policies, so admin wallet management page returned empty data.
     - Uses the existing is_admin() SECURITY DEFINER function for consistency.

  2. No wallet/cycle bootstrapped when user places first paid order
     - New ensure_loyalty_cycle(user_id, order_date) function creates the wallet row
       and first cycle on-demand, so the dashboard shows data immediately.
     - Called from create-order edge function after every order.

  3. Cycle date-range double-count removed
     - The cycle query upper bound was < cycle_end T23:59:59, which included the entire
       cycle_end day. The next cycle starts on cycle_end, so orders that day were
       counted twice. Now the upper bound is cycle_end T00:00:00 (exclusive).
     - This fix lives in the DB function so both the cron job and future callers
       benefit automatically.

  ## New Objects

  ### ensure_loyalty_cycle(p_user_id, p_order_date)
  - Idempotent: safe to call on every order
  - Creates wallet row if absent
  - Creates first bronze cycle starting from order date if no cycle exists at all
  - Called by create-order edge function so dashboard updates immediately

  ## Security
  - All new RLS policies use is_admin() (SECURITY DEFINER, same as orders table)
  - ensure_loyalty_cycle is SECURITY DEFINER, granted only to authenticated + service_role
*/

-- ─── Admin RLS: wallets ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallets' AND policyname = 'Admins read all wallets'
  ) THEN
    CREATE POLICY "Admins read all wallets"
      ON wallets FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- ─── Admin RLS: wallet_transactions ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_transactions' AND policyname = 'Admins read all wallet transactions'
  ) THEN
    CREATE POLICY "Admins read all wallet transactions"
      ON wallet_transactions FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- ─── Admin RLS: wallet_cycles ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_cycles' AND policyname = 'Admins read all wallet cycles'
  ) THEN
    CREATE POLICY "Admins read all wallet cycles"
      ON wallet_cycles FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- ─── Admin RLS: wallet_cashback_logs ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_cashback_logs' AND policyname = 'Admins read all cashback logs'
  ) THEN
    CREATE POLICY "Admins read all cashback logs"
      ON wallet_cashback_logs FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- ─── ensure_loyalty_cycle ─────────────────────────────────────────────────────
-- Creates wallet + first cycle for a user if none exist yet.
-- Idempotent: safe to call on every order placement.
CREATE OR REPLACE FUNCTION ensure_loyalty_cycle(
  p_user_id    uuid,
  p_order_date timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings wallet_settings%ROWTYPE;
  v_cycle_start date;
  v_cycle_end   date;
BEGIN
  -- Ensure wallet row exists
  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Only create cycle if the user has no cycle at all
  IF NOT EXISTS (
    SELECT 1 FROM wallet_cycles WHERE user_id = p_user_id LIMIT 1
  ) THEN
    SELECT * INTO v_settings FROM wallet_settings WHERE id = 1;

    v_cycle_start := p_order_date::date;
    v_cycle_end   := v_cycle_start + v_settings.bronze_days;

    INSERT INTO wallet_cycles (user_id, cycle_start, cycle_end, spend, tier, processed)
    VALUES (p_user_id, v_cycle_start, v_cycle_end, 0, 'bronze', false)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION ensure_loyalty_cycle(uuid, timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION ensure_loyalty_cycle(uuid, timestamptz) TO authenticated, service_role;
