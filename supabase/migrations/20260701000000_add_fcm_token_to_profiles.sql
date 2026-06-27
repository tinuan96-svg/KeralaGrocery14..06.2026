/*
  # Add FCM Token to User Profiles

  1. New Columns
    - `fcm_token` (text) - Firebase Cloud Messaging token for push notifications

  2. Security
    - Existing RLS policies on `user_profiles` already allow users to update their own rows, so no new policies are needed.
*/

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS fcm_token text;

-- Index for faster lookup when sending notifications
CREATE INDEX IF NOT EXISTS idx_user_profiles_fcm_token ON user_profiles(fcm_token);
