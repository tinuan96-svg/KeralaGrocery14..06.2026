import { getSupabase } from '@/lib/supabase/client';

export interface RecipeIngredient {
  productId: string | null;
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

export async function getRecipes(): Promise<Recipe[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }

  return (data || []).map(transformRecipe);
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(*)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching recipe by slug:', error);
    return null;
  }

  return transformRecipe(data);
}

function transformRecipe(data: any): Recipe {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    image_url: data.image_url,
    prepTime: data.prep_time,
    cookTime: data.cook_time,
    servings: data.servings,
    difficulty: data.difficulty,
    category: data.category,
    instructions: data.instructions || [],
    ingredients: (data.recipe_ingredients || []).map((ing: any) => ({
      productId: ing.product_id,
      name: ing.name,
      quantity: ing.quantity,
      optional: ing.optional
    }))
  };
}

/**
 * AI-Driven Pairing: Finds recipes that feature a specific product
 */
export async function getRecipesForProduct(productName: string): Promise<Recipe[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(*)
    `)
    .eq('is_active', true);

  if (error) return [];

  const name = productName.toLowerCase();
  const recipes = (data || []).map(transformRecipe);

  return recipes.filter(recipe =>
    recipe.ingredients.some(ing =>
      name.includes(ing.name.toLowerCase()) ||
      ing.name.toLowerCase().includes(name)
    )
  );
}
