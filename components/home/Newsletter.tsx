'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CircleCheck as CheckCircle2, Sparkles, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubscribed(true);
    setEmail('');

    toast({
      title: "Successfully subscribed!",
      description: "You'll receive Kerala deals and new arrivals in your inbox.",
    });

    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <section className="section-green-tint py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-100/40 via-transparent to-orange-100/40 -z-0" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-300/20 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl -z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-2xl">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Get Exclusive Kerala Deals
          </h2>
          <p className="text-gray-700 mb-4 text-xl leading-relaxed font-medium">
            Subscribe to our newsletter for exclusive offers, authentic Kerala recipes, and updates on fresh stock arrivals.
          </p>
          <div className="flex items-center justify-center gap-6 mb-10 flex-wrap">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <Sparkles className="h-5 w-5" />
              <span>Weekly Deals</span>
            </div>
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <Gift className="h-5 w-5" />
              <span>Exclusive Offers</span>
            </div>
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <Mail className="h-5 w-5" />
              <span>New Arrivals</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-16 flex-1 text-lg rounded-2xl border-2 border-green-200 focus:border-green-500 shadow-lg"
              disabled={subscribed}
            />
            <Button
              type="submit"
              size="lg"
              disabled={subscribed}
              className="gradient-green text-white font-bold h-16 px-10 text-lg rounded-2xl shadow-2xl hover:scale-105 btn-press transition-all"
            >
              {subscribed ? (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  Subscribed!
                </>
              ) : (
                'Subscribe Now'
              )}
            </Button>
          </form>

          <p className="text-sm text-gray-600 mt-6 font-medium">
            We respect your privacy. Unsubscribe anytime. Join 5,000+ subscribers!
          </p>
        </div>
      </div>
    </section>
  );
}
