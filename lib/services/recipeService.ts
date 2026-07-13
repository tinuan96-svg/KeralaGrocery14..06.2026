export interface RecipeIngredient {
  productId: string;
  name: string;
  quantity: string;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Expert';
  ingredients: RecipeIngredient[];
  instructions: string[];
  category: string;
}

const RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Authentic Kerala Fish Curry',
    slug: 'kerala-fish-curry',
    description: 'A spicy and tangy fish curry made with Kudampuli (Malabar Tamarind) and authentic Kerala spices.',
    image_url: 'https://images.unsplash.com/photo-1626509653295-4f582a65a78c?q=80&w=800',
    prepTime: '15 mins',
    cookTime: '25 mins',
    servings: 4,
    difficulty: 'Medium',
    category: 'Curries',
    ingredients: [
      { productId: 'f6b2b638-3b1a-4d7a-8f1e-0b1a2c3d4e5f', name: 'Kudampuli (Malabar Tamarind)', quantity: '3 pieces' },
      { productId: 'a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d', name: 'Kashmiri Chilli Powder', quantity: '2 tbsp' },
      { productId: 'b2c3d4e5-f6a7-4b6c-0d9e-8f7a6b5c4d3e', name: 'Turmeric Powder', quantity: '1/2 tsp' },
      { productId: 'c3d4e5f6-a7b8-4c7d-1e0f-9a8b7c6d5e4f', name: 'Coconut Oil', quantity: '2 tbsp' },
    ],
    instructions: [
      'Soak Kudampuli in warm water for 10 minutes.',
      'Make a paste of chilli powder, turmeric, and ginger-garlic with a little water.',
      'Heat coconut oil in a clay pot (Manchatti) and sauté shallots and curry leaves.',
      'Add the spice paste and cook until oil separates.',
      'Add fish pieces, Kudampuli water, and salt. Simmer until fish is cooked.'
    ]
  },
  {
    id: '2',
    title: 'Traditional Palakkadan Matta Rice',
    slug: 'palakkadan-matta-rice-guide',
    description: 'Learn how to cook the perfect bowl of nutrient-rich red Matta rice, a staple of Kerala.',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800',
    prepTime: '5 mins',
    cookTime: '40 mins',
    servings: 4,
    difficulty: 'Easy',
    category: 'Basics',
    ingredients: [
      { productId: 'd4e5f6a7-b8c9-4d8e-2f1a-0b9c8d7e6f5a', name: 'Palakkadan Matta Rice', quantity: '2 cups' },
      { productId: 'e5f6a7b8-c9d0-4e9f-3a2b-1c0d9e8f7a6b', name: 'Rock Salt', quantity: 'to taste' },
    ],
    instructions: [
      'Wash the rice 3-4 times until water runs clear.',
      'Pressure cook with 6 cups of water for 4-5 whistles.',
      'Alternatively, boil in a large pot until tender, then drain the excess water.',
      'Rest for 10 minutes before fluffing and serving.'
    ]
  }
];

export async function getRecipes(): Promise<Recipe[]> {
  return RECIPES;
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  return RECIPES.find(r => r.slug === slug) || null;
}
