/*
  # Add marketing preferences to user_profiles

  ## Summary
  Adds fields to track user marketing consent and preferences for GDPR compliance.

  ## New Columns
  - `accepts_marketing` (boolean, default false)
  - `marketing_consent_date` (timestamptz)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'accepts_marketing'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN accepts_marketing boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'marketing_consent_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN marketing_consent_date timestamptz;
  END IF;
END $$;
