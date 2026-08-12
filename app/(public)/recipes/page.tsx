import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChefHat, Clock, Users, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { getRecipes } from '@/lib/services/recipeService';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Authentic Kerala Recipes | KeralaGrocery.com',
  description: 'Learn how to cook authentic Kerala dishes like Fish Curry, Appam, and Matta Rice. Shop all ingredients directly from our recipes.',
};

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div className="min-h-screen bg-[#f4faf6] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <UtensilsCrossed className="w-3 h-3" />
              Kitchen Stories
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
              Kerala <span className="text-green-600">Recipes</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl">
              Discover the secrets of Malabar spices and traditional coastal cooking.
              Step-by-step guides with one-click shopping.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.slug}`}
              className="group bg-white rounded-[2.5rem] overflow-hidden border border-green-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={recipe.image_url}
                  alt={recipe.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 backdrop-blur-md text-green-800 border-none font-bold py-1 px-3">
                    {recipe.category}
                  </Badge>
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-green-600" />
                    {recipe.prepTime}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-green-600" />
                    {recipe.difficulty}
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors mb-3 leading-snug">
                  {recipe.title}
                </h3>

                <p className="text-gray-500 text-sm line-clamp-2 mb-6">
                  {recipe.description}
                </p>

                <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between text-green-700 font-bold text-sm">
                  <span>View Recipe</span>
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
