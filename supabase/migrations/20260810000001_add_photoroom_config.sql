-- Add Photoroom API key to app_config
INSERT INTO public.app_config (id, value)
VALUES (
    'photoroom_config',
    jsonb_build_object(
        'api_key', 'sk_pr_keralagrocery_4766761712e0e2505e1b6b538af17765671866ab'
    )
)
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;
