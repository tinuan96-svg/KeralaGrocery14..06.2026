'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchProductReviews, submitProductReview, type ProductReview } from '@/lib/services/reviewService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  productId: string;
  productName: string;
}

export default function ReviewSection({ productId, productName }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowFilters] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(profile?.name || '');

  useEffect(() => {
    loadReviews();
  }, [productId]);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const loadReviews = async () => {
    setIsLoading(true);
    const data = await fetchProductReviews(productId);
    setReviews(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    const result = await submitProductReview({
      productId,
      userId: user?.id || null,
      customerName: name || 'Anonymous',
      rating,
      comment,
    });

    if (result.success) {
      toast({ title: 'Review submitted', description: 'Thank you for your feedback!' });
      setComment('');
      setShowFilters(false);
      loadReviews();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <section className="mt-16 border-t border-gray-100 pt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-600" />
            Customer Reviews
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${Number(averageRating) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-gray-900">{averageRating} out of 5</span>
            <span className="text-gray-400 font-medium">({reviews.length} reviews)</span>
          </div>
        </div>

        <Button
          onClick={() => setShowFilters(!showForm)}
          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 font-bold rounded-xl"
        >
          Write a Review
        </Button>
      </div>

      {showForm && (
        <div className="bg-[#f4faf6] border border-green-100 rounded-3xl p-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Reviewing {productName}</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Overall Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-8 h-8 ${rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Your Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul K."
                  className="bg-white border-green-100 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Review Details</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like about this product? How was the taste?"
                className="bg-white border-green-100 rounded-xl min-h-[120px]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowFilters(false)}
                className="font-bold text-gray-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="bg-[#0B5D3B] hover:bg-green-800 text-white font-bold rounded-xl px-8"
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Review'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white border-b border-gray-100 pb-8 last:border-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{review.customer_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${review.rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {review.is_verified_purchase && (
                  <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Purchase
                  </div>
                )}
              </div>
              <p className="text-gray-600 leading-relaxed pl-13">
                {review.comment}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </section>
  );
}
