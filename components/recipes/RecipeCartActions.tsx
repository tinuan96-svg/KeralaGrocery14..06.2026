'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/lib/context/CartContext';
import { getSupabase } from '@/lib/supabase/client';
import { getProducts } from '@/lib/services/rpcApiClient';
import type { RecipeIngredient } from '@/lib/services/recipeService';

interface Props {
  ingredients: RecipeIngredient[];
}

export default function RecipeCartActions({ ingredients }: Props) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Track selected ingredients
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(ingredients.map((_, i) => i.toString()))
  );

  const toggleIngredient = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAddAll = async () => {
    const selectedIngredients = ingredients.filter((_, i) => selectedIds.has(i.toString()));
    if (selectedIngredients.length === 0) return;

    setIsAdding(true);
    try {
      const supabase = getSupabase();

      const addPromises = selectedIngredients.map(async (ing) => {
        let product: any = null;

        // 1. Try to find by specific productId if provided
        if (ing.productId) {
          const { data } = await supabase
            .from('products')
            .select('id, name, price, slug, image_url, image_main')
            .eq('id', ing.productId)
            .eq('approval_status', 'approved')
            .eq('visibility_status', true)
            .maybeSingle();
          product = data;
        }

        // 2. Fallback: Search by name if not found or no ID
        if (!product) {
          const { products } = await getProducts({
            search: ing.name,
            limit: 1,
            status: 'active'
          });
          if (products && products.length > 0) {
            const p = products[0];
            product = {
              id: p.id,
              name: p.display_title,
              price: p.price,
              slug: p.slug,
              image_url: p.image_url
            };
          }
        }

        if (product) {
          addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || product.image_main || undefined,
            slug: product.slug || product.id,
          });
          return true;
        }
        return false;
      });

      const results = await Promise.all(addPromises);
      const addedCount = results.filter(Boolean).length;

      if (addedCount > 0) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error adding recipe ingredients:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white border border-green-100 rounded-3xl p-6 sm:p-8 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Cook this recipe</h3>
      <p className="text-gray-500 text-sm mb-6">
        Missing the essentials? Select what you need and add to cart.
      </p>

      <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {ingredients.map((ing, i) => {
          const id = i.toString();
          const isSelected = selectedIds.has(id);
          return (
            <div
              key={id}
              onClick={() => toggleIngredient(id)}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                isSelected ? 'bg-green-50/50 border-green-200' : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleIngredient(id)}
                className="rounded-full border-green-600 data-[state=checked]:bg-green-600"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                  {ing.name}
                </p>
                {ing.amount && (
                  <p className="text-[10px] text-gray-400 font-medium">{ing.amount}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleAddAll}
        disabled={isAdding || selectedIds.size === 0}
        className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 ${
          isSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-[#0B5D3B] hover:bg-green-800'
        }`}
      >
        {isAdding ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding to cart...</>
        ) : isSuccess ? (
          <><Check className="mr-2 h-5 w-5" /> Added to Cart!</>
        ) : (
          <><ShoppingCart className="mr-2 h-5 w-5" /> Buy {selectedIds.size} {selectedIds.size === 1 ? 'Ingredient' : 'Ingredients'}</>
        )}
      </Button>

      <p className="text-[10px] text-center text-gray-400 mt-4 uppercase font-bold tracking-widest">
        * Based on current UK stock availability
      </p>
    </div>
  );
}
