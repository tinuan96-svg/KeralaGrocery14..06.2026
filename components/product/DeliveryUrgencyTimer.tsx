'use client';

import { useState, useEffect } from 'react';
import { Truck, Clock, Zap } from 'lucide-react';

interface Props {
  cutoffTime?: string; // HH:mm format, e.g. "16:00"
}

export default function DeliveryUrgencyTimer({ cutoffTime = "16:00" }: Props) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null);
  const [isPastCutoff, setIsPastCutoff] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const [hours, minutes] = cutoffTime.split(':').map(Number);

      const cutoff = new Date();
      cutoff.setHours(hours, minutes, 0, 0);

      // If past cutoff today, target tomorrow's cutoff
      if (now > cutoff) {
        setIsPastCutoff(true);
        return;
      }

      const diff = cutoff.getTime() - now.getTime();

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours: h, minutes: m, seconds: s });
      setIsPastCutoff(false);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [cutoffTime]);

  if (isPastCutoff) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <Truck className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <p className="text-xs font-medium text-blue-800">
          Order now for <span className="font-bold underline">Dispatch Tomorrow</span> morning!
        </p>
      </div>
    );
  }

  if (!timeLeft) return null;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-600 fill-amber-600 animate-pulse" />
        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Fast Delivery</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-amber-900 tabular-nums">{timeLeft.hours}h</span>
          <span className="text-lg font-black text-amber-900 tabular-nums">{timeLeft.minutes}m</span>
          <span className="text-sm font-bold text-amber-700 tabular-nums">{timeLeft.seconds}s</span>
        </div>

        <div className="h-8 w-px bg-amber-200" />

        <div className="flex flex-col">
          <p className="text-[11px] font-bold text-amber-900 leading-none">Order within this time</p>
          <p className="text-[10px] font-medium text-amber-700 mt-1">
            for <span className="text-green-700 font-bold">Next Day Delivery!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
