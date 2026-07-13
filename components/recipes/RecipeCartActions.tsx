'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/context/CartContext';
import { getProducts } from '@/lib/services/rpcApiClient';
import type { RecipeIngredient } from '@/lib/services/recipeService';

interface Props {
  ingredients: RecipeIngredient[];
}

export default function RecipeCartActions({ ingredients }: Props) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddAll = async () => {
    setIsAdding(true);
    try {
      // For each ingredient, try to find the actual product in the DB
      // In a production app, we would link productId directly, but here we
      // search by name for maximum compatibility with current DB state.
      const addPromises = ingredients.map(async (ing) => {
        const { products } = await getProducts({ search: ing.name, limit: 1, status: 'active' });
        if (products && products.length > 0) {
          const p = products[0];
          addToCart({
            id: p.id,
            name: p.display_title,
            price: p.price,
            image_url: p.image_url ?? undefined,
            slug: p.slug ?? p.id,
          });
          return true;
        }
        return false;
      });

      await Promise.all(addPromises);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding recipe ingredients:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white border border-green-100 rounded-3xl p-8 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Cook this recipe</h3>
      <p className="text-gray-500 text-sm mb-6">
        Missing the essentials? Add all authentic Kerala ingredients to your cart in one click.
      </p>

      <Button
        onClick={handleAddAll}
        disabled={isAdding}
        className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 ${
          isSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-[#0B5D3B] hover:bg-green-800'
        }`}
      >
        {isAdding ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding to cart...</>
        ) : isSuccess ? (
          <><Check className="mr-2 h-5 w-5" /> Ingredients Added!</>
        ) : (
          <><ShoppingCart className="mr-2 h-5 w-5" /> Buy All Ingredients</>
        )}
      </Button>

      <p className="text-[10px] text-center text-gray-400 mt-4 uppercase font-bold tracking-widest">
        * Ingredients will be added based on current stock availability
      </p>
    </div>
  );
}
