'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';

const RECENT_ACTIVITIES = [
  { city: 'London', product: 'Palakkadan Matta Rice', time: '2 mins ago' },
  { city: 'Manchester', product: 'Eastern Sambar Powder', time: '12 mins ago' },
  { city: 'Birmingham', product: 'Coconut Oil (1L)', time: '5 mins ago' },
  { city: 'Croydon', product: 'Banana Chips (Spicy)', time: '1 min ago' },
  { city: 'Leicester', product: 'Nirapara Roasted Rice Flour', time: '8 mins ago' },
];

export default function LiveActivityFeed() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 5000); // Wait 5s before first show

    const rotationTimer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % RECENT_ACTIVITIES.length);
        setVisible(true);
      }, 1000);
    }, 15000); // Show for 15s

    return () => {
      clearTimeout(showTimer);
      clearInterval(rotationTimer);
    };
  }, [dismissed]);

  if (dismissed) return null;

  const activity = RECENT_ACTIVITIES[current];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          className="fixed bottom-24 left-4 z-[55] hidden md:block"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm flex items-center gap-4 relative pr-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />

            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Verified Purchase</p>
              <p className="text-xs text-gray-700 leading-tight">
                Someone in <span className="font-bold text-gray-900">{activity.city}</span> just bought <span className="font-bold text-green-700">{activity.product}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">{activity.time}</p>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
