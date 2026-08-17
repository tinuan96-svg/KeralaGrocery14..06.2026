-- Add Stripe configuration to app_config
INSERT INTO public.app_config (id, value)
VALUES (
    'stripe_config',
    jsonb_build_object(
        'publishable_key', 'pk_live_51THfKEDoZ0wTfwqgwKHI0NqPh0Tjt8tDdMN2ajqRnUiZwn0B4qf31fTYziegowBCdGNEU4thjgQp0zpbOyIo9hly00BNA6JVxO',
        'webhook_url', 'https://vnqjqopzoeunojomssmq.supabase.co/functions/v1/stripe-webhook'
    )
)
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;
