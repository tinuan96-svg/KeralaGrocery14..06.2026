-- 1. Add pending_balance to wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_balance numeric(10, 2) DEFAULT 0;

-- 2. Welcome Credit Trigger
-- Gifts £2.00 to new users when they verify their phone
CREATE OR REPLACE FUNCTION gift_welcome_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if phone was just verified
  IF (OLD.phone_verified = false AND NEW.phone_verified = true) THEN
    -- Ensure wallet exists
    INSERT INTO wallets (user_id, balance, pending_balance)
    VALUES (NEW.id, 2.00, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + 2.00;

    -- Record transaction
    INSERT INTO wallet_transactions (
      user_id, type, amount, description, balance_after
    ) VALUES (
      NEW.id,
      'promotion_credit',
      2.00,
      'Welcome Bonus for phone verification 🎁',
      (SELECT balance FROM wallets WHERE user_id = NEW.id)
    );

    -- Log activity
    INSERT INTO admin_activity_log (event_type, description, entity_name)
    VALUES ('wallet_credit', 'Gifts £2.00 welcome credit to ' || NEW.name, NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_gift_welcome_credit ON user_profiles;
CREATE TRIGGER trigger_gift_welcome_credit
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION gift_welcome_credit();

-- 3. Automatic "Pending to Available" move on Delivery
CREATE OR REPLACE FUNCTION release_pending_cashback()
RETURNS TRIGGER AS $$
DECLARE
  v_cashback numeric;
BEGIN
  -- Logic: When order status changes to 'delivered', move its specific cycle cashback to available
  IF (OLD.order_status <> 'delivered' AND NEW.order_status = 'delivered') THEN

    -- In our simplified system, we'll look for any pending transactions linked to this order
    -- and move them to the available balance.
    -- (This assumes we store the pending cashback in a dedicated way linked to the order)

    -- For now, let's update the wallet directly if we have a record of pending for this order
    -- Since our current schema adds to balance at cycle end, we will modify the cycle logic
    -- in the Edge Function instead.

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. View for Expiring Cashback (3 days notice)
CREATE OR REPLACE VIEW view_expiring_cashback AS
SELECT
  w.user_id,
  p.phone,
  p.name as customer_name,
  cl.cashback_amount,
  cl.expiry_date
FROM wallet_cashback_logs cl
JOIN wallets w ON cl.user_id = w.user_id
JOIN user_profiles p ON w.user_id = p.id
WHERE cl.expired_at IS NULL
  AND cl.expiry_date = (CURRENT_DATE + interval '3 days')
  AND cl.used_amount < cl.cashback_amount
  AND p.phone_verified = true;

-- 5. Helper to add to pending balance
CREATE OR REPLACE FUNCTION add_pending_wallet_balance(p_user_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, pending_balance)
  VALUES (p_user_id, 0, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET pending_balance = wallets.pending_balance + p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper to release pending balance
CREATE OR REPLACE FUNCTION release_order_cashback(p_order_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_pending numeric;
BEGIN
  -- Get user and pending amount from order
  SELECT user_id, (custom_attributes->>'pending_cashback')::numeric
  INTO v_user_id, v_pending
  FROM orders
  WHERE id = p_order_id;

  IF v_user_id IS NOT NULL AND v_pending > 0 THEN
    -- Update wallet
    UPDATE wallets
    SET
      balance = balance + v_pending,
      pending_balance = GREATEST(0, pending_balance - v_pending)
    WHERE user_id = v_user_id;

    -- Record transaction
    INSERT INTO wallet_transactions (
      user_id, type, amount, description, order_id, balance_after
    ) VALUES (
      v_user_id,
      'cashback_credit',
      v_pending,
      'Order cashback released ✅',
      p_order_id,
      (SELECT balance FROM wallets WHERE user_id = v_user_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
