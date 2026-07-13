/*
  # Create Recipes Table

  ## Purpose
  Provides a structured way to store and query traditional Kerala recipes,
  allowing the AI Assistant to provide dynamic cooking guidance.
*/

CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  prep_time text,
  cook_time text,
  servings integer DEFAULT 4,
  difficulty text CHECK (difficulty IN ('Easy', 'Medium', 'Expert')),
  category text,
  instructions text[], -- Array of steps
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for recipe ingredients with optional product linking
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL, -- Name of the ingredient (e.g. 'Coconut Oil')
  quantity text,       -- e.g. '2 tbsp'
  optional boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read active recipes" ON public.recipes FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (true);

-- Seed some initial recipes
INSERT INTO public.recipes (title, slug, description, image_url, prep_time, cook_time, servings, difficulty, category, instructions)
VALUES
(
  'Authentic Kerala Fish Curry',
  'kerala-fish-curry',
  'A spicy and tangy fish curry made with Kudampuli (Malabar Tamarind) and authentic Kerala spices.',
  'https://images.unsplash.com/photo-1626509653295-4f582a65a78c?q=80&w=800',
  '15 mins',
  '25 mins',
  4,
  'Medium',
  'Curries',
  ARRAY[
    'Soak Kudampuli in warm water for 10 minutes.',
    'Make a paste of chilli powder, turmeric, and ginger-garlic with a little water.',
    'Heat coconut oil in a clay pot (Manchatti) and sauté shallots and curry leaves.',
    'Add the spice paste and cook until oil separates.',
    'Add fish pieces, Kudampuli water, and salt. Simmer until fish is cooked.'
  ]
),
(
  'Traditional Palakkadan Matta Rice',
  'palakkadan-matta-rice-guide',
  'Learn how to cook the perfect bowl of nutrient-rich red Matta rice, a staple of Kerala.',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800',
  '5 mins',
  '40 mins',
  4,
  'Easy',
  'Basics',
  ARRAY[
    'Wash the rice 3-4 times until water runs clear.',
    'Pressure cook with 6 cups of water for 4-5 whistles.',
    'Alternatively, boil in a large pot until tender, then drain the excess water.',
    'Rest for 10 minutes before fluffing and serving.'
  ]
)
ON CONFLICT (slug) DO NOTHING;
