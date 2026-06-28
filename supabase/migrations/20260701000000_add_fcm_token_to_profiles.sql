-- ── Add FCM Token column to user_profiles ────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'fcm_token'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN fcm_token text;

        COMMENT ON COLUMN public.user_profiles.fcm_token IS 'Firebase Cloud Messaging token for native push notifications.';
    END IF;
END $$;
