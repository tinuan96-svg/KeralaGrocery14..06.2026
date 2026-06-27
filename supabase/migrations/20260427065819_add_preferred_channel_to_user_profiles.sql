/*
  # Add preferred_channel to user_profiles

  Stores which messaging channel (whatsapp / sms) last succeeded for a user.
  The notification function reads this before sending and updates it after success,
  so repeat messages skip the channel that is known to fail and reduce unnecessary
  Twilio API calls.

  ## Changes
  - user_profiles: add `preferred_channel` text column, nullable, constrained to
    'whatsapp' | 'sms'. NULL means no preference established yet (always try
    WhatsApp first).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_channel'
  ) THEN
    ALTER TABLE user_profiles
      ADD COLUMN preferred_channel text
      CHECK (preferred_channel IN ('whatsapp', 'sms'));
  END IF;
END $$;
