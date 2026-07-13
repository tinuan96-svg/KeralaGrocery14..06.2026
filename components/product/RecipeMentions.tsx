'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChefHat, ChevronRight, Utensils } from 'lucide-react';
import { getRecipesForProduct, type Recipe } from '@/lib/services/recipeService';

interface Props {
  productName: string;
}

export default function RecipeMentions({ productName }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    getRecipesForProduct(productName).then(setRecipes);
  }, [productName]);

  if (recipes.length === 0) return null;

  return (
    <div className="mt-8 bg-[#f4faf6] border border-green-100 rounded-3xl overflow-hidden shadow-sm">
      <div className="bg-[#0B5D3B] px-6 py-3 flex items-center gap-2">
        <ChefHat className="w-4 h-4 text-yellow-400" />
        <span className="text-white text-xs font-bold uppercase tracking-widest">Featured in Recipes</span>
      </div>

      <div className="p-6">
        <p className="text-gray-600 text-sm mb-4">
          Discover how to use <span className="font-bold text-gray-900">{productName}</span> in authentic Kerala dishes:
        </p>

        <div className="space-y-3">
          {recipes.map(recipe => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.slug}`}
              className="group flex items-center gap-4 bg-white p-3 rounded-2xl border border-transparent hover:border-green-200 hover:shadow-md transition-all"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={recipe.image_url}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                  {recipe.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {recipe.difficulty} • {recipe.prepTime}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
