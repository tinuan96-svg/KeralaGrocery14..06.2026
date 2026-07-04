'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Gift, CircleCheck as CheckCircle } from 'lucide-react';

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
      setEmail('');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 md:p-12 text-center">
        <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Welcome to Kerala Groceries!
        </h3>
        <p className="text-lg text-white/90 mb-2">
          Check your email for your £5 discount code
        </p>
        <p className="text-sm text-white/75">
          Use it on your first order over £40
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <span className="inline-block bg-yellow-400 text-green-900 text-sm font-bold px-4 py-1.5 rounded-full">
            £5 OFF
          </span>
        </div>

        <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
          Get £5 Off Your First Order
        </h3>
        <p className="text-lg text-white/90 text-center mb-6">
          Join our newsletter for exclusive deals and authentic Kerala recipes
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-white border-none"
                disabled={isSubmitting}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-white text-green-700 hover:bg-gray-100 font-bold h-12 px-8"
            >
              {isSubmitting ? 'Subscribing...' : 'Get £5 Off'}
            </Button>
          </div>
          {error && (
            <p className="text-red-200 text-sm mt-2 text-center">{error}</p>
          )}
        </form>

        <p className="text-white/75 text-xs text-center mt-4">
          Valid on orders over £40. Unsubscribe anytime. We respect your privacy.
        </p>
      </div>
    </div>
  );
}

export function EmailCaptureCompact() {
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSuccess(true);
    setEmail('');
    setTimeout(() => setIsSuccess(false), 3000);
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="text-green-800 font-semibold">Thanks! Check your email for £5 off</p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-orange-600" />
        <h4 className="font-bold text-gray-900">Get £5 Off Your First Order</h4>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
          Subscribe
        </Button>
      </form>
      <p className="text-xs text-gray-600 mt-2">On orders over £40</p>
    </div>
  );
}
