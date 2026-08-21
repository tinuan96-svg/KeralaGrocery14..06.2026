'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

export default function DeliveryCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Cutoff time is 12:00 PM (noon) daily for next-day delivery
      const cutoff = new Date();
      cutoff.setHours(12, 0, 0, 0);

      if (now > cutoff) {
        // If past noon, target is tomorrow's noon
        cutoff.setDate(cutoff.getDate() + 1);
      }

      const diff = cutoff.getTime() - now.getTime();

      setTimeLeft({
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="bg-amber-50 border-y border-amber-100 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-1.5 text-amber-700 font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 fill-current" /> Next Day Delivery
        </div>
        <div className="h-3 w-px bg-amber-200" />
        <div className="flex items-center gap-2 text-gray-700">
          Order in the next
          <span className="font-black text-[#0B5D3B] tabular-nums bg-white px-1.5 py-0.5 rounded border border-amber-200">
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          for dispatch today!
        </div>
      </div>
    </div>
  );
}
