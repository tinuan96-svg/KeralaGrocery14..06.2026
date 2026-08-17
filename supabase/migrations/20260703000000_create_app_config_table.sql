-- ── Create App Config table for Mandatory Updates ───────────────────────────

CREATE TABLE IF NOT EXISTS public.app_config (
    id text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read app_config"
    ON public.app_config FOR SELECT
    TO anon, authenticated
    USING (true);

-- Seed initial version info
INSERT INTO public.app_config (id, value)
VALUES (
    'ios_version_config',
    '{
        "min_version": "1.0.0",
        "current_version": "1.0.0",
        "force_update": false,
        "update_url": "https://apps.apple.com/app/keralagrocery/id6778219093"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
