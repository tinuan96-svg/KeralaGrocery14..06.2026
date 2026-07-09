'use client';

import { useState, useEffect } from 'react';
import { X, Truck, Wallet, Clock } from 'lucide-react';

export default function TopBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages = [
    { icon: Clock, text: 'Order before 10:00 PM for Next-Day Delivery', color: 'text-green-600' },
    { icon: Truck, text: 'Free delivery on orders above £45', color: 'text-blue-600' },
    { icon: Wallet, text: 'Earn cashback with every order - Join our loyalty program', color: 'text-orange-600' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [messages.length]);

  if (!isVisible) return null;

  const Message = messages[currentMessage];

  return (
    <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 text-white py-2.5 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center gap-3">
          <Message.icon className="h-5 w-5 animate-pulse" />
          <p className="text-sm md:text-base font-medium text-center transition-all duration-500">
            {Message.text}
          </p>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30">
        <div
          className="h-full bg-white ease-linear"
          style={{ transitionProperty: 'all', transitionDuration: '4000ms', width: '100%' }}
        />
      </div>
    </div>
  );
}
