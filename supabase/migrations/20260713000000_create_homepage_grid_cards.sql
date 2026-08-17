-- Create table for Amazon-style homepage grid cards
CREATE TABLE IF NOT EXISTS public.homepage_grid_cards (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    title text NOT NULL,
    layout_type text NOT NULL DEFAULT 'grid_2x2'::text,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT homepage_grid_cards_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.homepage_grid_cards ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'homepage_grid_cards' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.homepage_grid_cards FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'homepage_grid_cards' AND policyname = 'Allow admin full access'
    ) THEN
        CREATE POLICY "Allow admin full access" ON public.homepage_grid_cards FOR ALL USING (is_admin());
    END IF;
END $$;
