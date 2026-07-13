import { getSupabase } from '@/lib/supabase/client';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[reviewService] fetchProductReviews error:', error);
    return [];
  }

  return (data || []) as ProductReview[];
}

export async function submitProductReview(params: {
  productId: string;
  userId: string | null;
  customerName: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // Check if user has bought this product to mark as verified purchase
  let isVerified = false;
  if (params.userId) {
    const { data: orders } = await supabase
      .from('order_items')
      .select('id, orders!inner(user_id, payment_status)')
      .eq('product_id', params.productId)
      .eq('orders.user_id', params.userId)
      .eq('orders.payment_status', 'paid')
      .limit(1);

    if (orders && orders.length > 0) {
      isVerified = true;
    }
  }

  const { error } = await supabase
    .from('product_reviews')
    .insert({
      product_id: params.productId,
      user_id: params.userId,
      customer_name: params.customerName,
      rating: params.rating,
      comment: params.comment,
      is_verified_purchase: isVerified,
      status: 'approved', // Auto-approve for now, can be changed to 'pending' later
    });

  if (error) {
    console.error('[reviewService] submitProductReview error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
