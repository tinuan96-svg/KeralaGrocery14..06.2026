-- Function to handle tier level-up notifications
CREATE OR REPLACE FUNCTION notify_tier_levelup()
RETURNS TRIGGER AS $$
DECLARE
  v_phone text;
  v_name text;
  v_message text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Check if tier has increased (Gold > Silver > Bronze)
  -- Or if it's a new cycle and tier is not bronze
  IF (TG_OP = 'UPDATE' AND OLD.tier <> NEW.tier) OR (TG_OP = 'INSERT' AND NEW.tier <> 'bronze') THEN

    -- Get user details
    SELECT phone, name INTO v_phone, v_name
    FROM user_profiles
    WHERE id = NEW.user_id;

    IF v_phone IS NOT NULL AND v_phone <> '' THEN
      v_message := format('Congratulations %s! 🎊 You have reached %s status at Kerala Grocery. You now earn higher cashback on every order! Shop now: https://keralagrocery.com/account/wallet',
                          COALESCE(v_name, 'there'),
                          UPPER(NEW.tier));

      -- We can't directly call fetch in PL/pgSQL easily without extensions,
      -- but we can insert into an outbound_notifications queue or use pg_net if enabled.
      -- For this system, we'll log it to admin_activity and the app will process it.

      INSERT INTO admin_activity_log (event_type, description, entity_name)
      VALUES ('loyalty_levelup', v_message, v_name);

      -- If pg_net is available, we could trigger the edge function here.
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for tier changes
CREATE TRIGGER trigger_notify_tier_levelup
AFTER INSERT OR UPDATE ON wallet_cycles
FOR EACH ROW
EXECUTE FUNCTION notify_tier_levelup();
