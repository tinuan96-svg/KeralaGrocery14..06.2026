-- Enable the pg_trgm extension for fuzzy searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIST index on product name and brand for fast similarity search
-- This significantly speeds up queries using the % operator
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gist (name gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gist (brand gist_trgm_ops);

-- Add a helper function for fuzzy product search if direct SQL becomes complex
-- For now, we will use direct similarity in the RPC/API client.
