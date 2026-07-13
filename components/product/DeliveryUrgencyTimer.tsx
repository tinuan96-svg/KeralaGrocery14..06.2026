'use client';

import { useState, useEffect } from 'react';
import { Clock, Truck } from 'lucide-react';

export default function DeliveryUrgencyTimer() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Cutoff time is 2:00 PM (14:00) every day for next-day delivery
      const cutoff = new Date();
      cutoff.setHours(14, 0, 0, 0);

      if (now > cutoff) {
        // If past today's cutoff, next cutoff is tomorrow at 2:00 PM
        cutoff.setDate(cutoff.getDate() + 1);
      }

      const diff = cutoff.getTime() - now.getTime();

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse-slow">
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Clock className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-amber-900">
          Want it tomorrow?
        </p>
        <p className="text-xs text-amber-700">
          Order within <span className="font-bold text-amber-900">
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span> for next-day delivery!
        </p>
      </div>
      <Truck className="w-5 h-5 text-amber-400 ml-auto opacity-50" />
    </div>
  );
}
