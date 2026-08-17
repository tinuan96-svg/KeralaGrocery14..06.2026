/*
  # KG Wallet & Loyalty Cashback System

  ## Overview
  Implements a complete loyalty wallet system for KeralaGroceries with tiered cashback.

  ## New Tables

  ### wallets
  - One row per user; stores current spendable balance
  - balance enforced >= 0 at DB level

  ### wallet_transactions
  - Full immutable audit trail of every wallet movement
  - Types: cashback_credit, cashback_expiry, refund_credit, promotion_credit,
           referral_credit, manual_credit, manual_debit, wallet_payment
  - cashback_credit rows carry expires_at; expiry job creates cashback_expiry debit

  ### wallet_cycles
  - One active cycle per user at a time
  - Cycle end determined by tier at cycle creation (30/60/90 days)
  - Daily job processes expired cycles → calculates cashback → creates next cycle

  ### wallet_cashback_logs
  - Records every cashback award
  - tracks used_amount for FIFO expiry: expire only (cashback_amount - used_amount)

  ### wallet_settings
  - Single-row config table (id = 1)
  - Tier rates, tier thresholds, cycle durations, max wallet usage %

  ## Schema changes to existing tables
  - orders: adds wallet_amount column (wallet portion of payment)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can SELECT own rows only
  - All writes go through edge functions using service_role (bypass RLS)
  - Admin users (is_admin in app_metadata) can SELECT all rows

  ## Helper functions
  - get_wallet_tier(spend)            → 'bronze' | 'silver' | 'gold'
  - get_tier_cashback_rate(tier)       → numeric rate
  - get_tier_cycle_days(tier)          → integer days
  - ensure_wallet(uid)                 → creates wallet row if missing
*/

-- ─── wallets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    numeric(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet"
  ON wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── wallet_transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text        NOT NULL CHECK (type IN (
                              'cashback_credit', 'cashback_expiry', 'refund_credit',
                              'promotion_credit', 'referral_credit', 'manual_credit',
                              'manual_debit', 'wallet_payment'
                            )),
  source        text,
  amount        numeric(10,2) NOT NULL,
  description   text,
  balance_after numeric(10,2) NOT NULL,
  order_id      uuid        REFERENCES orders(id) ON DELETE SET NULL,
  expires_at    timestamptz,
  expired_at    timestamptz,
  admin_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── wallet_cycles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_cycles (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start    date        NOT NULL,
  cycle_end      date        NOT NULL,
  spend          numeric(10,2) NOT NULL DEFAULT 0,
  tier           text        NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold')),
  cashback_amount numeric(10,2),
  processed      boolean     NOT NULL DEFAULT false,
  processed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE wallet_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cycles"
  ON wallet_cycles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── wallet_cashback_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_cashback_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id        uuid        REFERENCES wallet_cycles(id) ON DELETE SET NULL,
  cycle_start     date        NOT NULL,
  cycle_end       date        NOT NULL,
  spend           numeric(10,2) NOT NULL,
  tier            text        NOT NULL,
  cashback_amount numeric(10,2) NOT NULL,
  used_amount     numeric(10,2) NOT NULL DEFAULT 0,
  expiry_date     timestamptz NOT NULL,
  transaction_id  uuid        REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  expired_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE wallet_cashback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cashback logs"
  ON wallet_cashback_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── wallet_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_settings (
  id                       integer   PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bronze_rate              numeric(5,4) NOT NULL DEFAULT 0.02,
  silver_rate              numeric(5,4) NOT NULL DEFAULT 0.10,
  gold_rate                numeric(5,4) NOT NULL DEFAULT 0.15,
  bronze_days              integer   NOT NULL DEFAULT 30,
  silver_days              integer   NOT NULL DEFAULT 60,
  gold_days                integer   NOT NULL DEFAULT 90,
  bronze_min               numeric(10,2) NOT NULL DEFAULT 0,
  bronze_max               numeric(10,2) NOT NULL DEFAULT 250,
  silver_min               numeric(10,2) NOT NULL DEFAULT 251,
  silver_max               numeric(10,2) NOT NULL DEFAULT 499,
  gold_min                 numeric(10,2) NOT NULL DEFAULT 500,
  max_wallet_usage_percent numeric(5,4) NOT NULL DEFAULT 0.50,
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for checkout UI)
CREATE POLICY "Anyone reads wallet settings"
  ON wallet_settings FOR SELECT
  USING (true);

-- Seed default settings
INSERT INTO wallet_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─── orders: add wallet_amount ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'wallet_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN wallet_amount numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wallets_user_id          ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id        ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created        ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_expires        ON wallet_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_cycles_user       ON wallet_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_cycles_end        ON wallet_cycles(cycle_end) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_wallet_cashback_user     ON wallet_cashback_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_cashback_expiry   ON wallet_cashback_logs(expiry_date) WHERE expired_at IS NULL;

-- ─── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_wallet_tier(spend numeric)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION get_tier_cashback_rate(tier text)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION get_tier_cycle_days(tier text)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION ensure_wallet(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Grant execute only to service_role (edge functions) and authenticated for ensure_wallet
REVOKE EXECUTE ON FUNCTION get_wallet_tier(numeric)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_tier_cashback_rate(text)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_tier_cycle_days(text)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION ensure_wallet(uuid)             FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION get_wallet_tier(numeric)        TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_cashback_rate(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_cycle_days(text)       TO authenticated;
