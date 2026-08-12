'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import ProductCard from './ProductCard';
import { Loader2, RotateCcw } from 'lucide-react';

export default function BuyItAgain() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBuyItAgain = async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('view_buy_it_again')
          .select('*')
          .eq('user_id', user.id)
          .limit(8);

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('[BuyItAgain] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuyItAgain();
  }, [user]);

  if (!user || (!loading && products.length === 0)) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <RotateCcw className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Buy It Again</h2>
          <p className="text-sm text-gray-500">Frequently ordered items from your history</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.product_id} product={{
              ...p,
              id: p.product_id, // Map product_id back to id for the card
            }} />
          ))}
        </div>
      )}
    </section>
  );
}
