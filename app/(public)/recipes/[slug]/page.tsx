import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, ChefHat, Users, ChevronLeft, Utensils, ListChecks } from 'lucide-react';
import { getRecipeBySlug, getRecipes } from '@/lib/services/recipeService';
import RecipeCartActions from '@/components/recipes/RecipeCartActions';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const recipes = await getRecipes();
  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipeBySlug(params.slug);
  if (!recipe) return { title: 'Recipe Not Found' };

  return {
    title: `${recipe.title} | Kerala Recipes | KeralaGrocery.com`,
    description: recipe.description,
  };
}

export default async function RecipeDetailPage({ params }: Props) {
  const recipe = await getRecipeBySlug(params.slug);
  if (!recipe) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="relative h-[50vh] md:h-[60vh] w-full">
        <Image
          src={recipe.image_url}
          alt={recipe.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 py-12 px-4">
          <div className="max-w-4xl mx-auto text-white">
            <Link
              href="/recipes"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 font-bold text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Recipes
            </Link>

            <Badge className="bg-green-600 text-white border-none mb-4 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              {recipe.category}
            </Badge>

            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              {recipe.title}
            </h1>

            <div className="flex flex-wrap gap-8 text-sm font-bold uppercase tracking-widest text-white/90">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span>{recipe.prepTime} Prep</span>
              </div>
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-green-400" />
                <span>{recipe.difficulty}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <span>Serves {recipe.servings}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-16 items-start">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Utensils className="w-8 h-8 text-green-600" />
                The Story
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed italic border-l-4 border-green-100 pl-6">
                &quot;{recipe.description}&quot;
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
                <ListChecks className="w-8 h-8 text-green-600" />
                Instructions
              </h2>
              <div className="space-y-10">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-black">
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className="text-gray-700 text-lg leading-relaxed">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar - Ingredients & Actions */}
          <div className="space-y-8 lg:sticky lg:top-24">
            <RecipeCartActions ingredients={recipe.ingredients} />

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Ingredients</h3>
              <ul className="space-y-4">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start justify-between gap-4">
                    <span className="text-gray-700 font-medium">{ing.name}</span>
                    <span className="text-green-700 font-bold text-sm whitespace-nowrap">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
