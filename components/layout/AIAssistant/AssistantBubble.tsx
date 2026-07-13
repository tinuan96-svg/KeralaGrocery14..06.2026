'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { useEffect } from 'react';

export default function AssistantBubble() {
  const { bubbleText, setBubbleText, isOpen } = useAssistant();

  useEffect(() => {
    if (bubbleText) {
      const timer = setTimeout(() => {
        setBubbleText(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [bubbleText, setBubbleText]);

  if (isOpen) return null;

  return (
    <AnimatePresence>
      {bubbleText && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -20, y: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: -20, y: 10 }}
          className="fixed bottom-36 left-6 z-[60] max-w-[240px]"
        >
          <div className="relative bg-white border-2 border-green-600 rounded-[2rem] rounded-bl-none shadow-2xl p-4 pr-10">
            {/* Kerala Greeting Style Text */}
            <p className="text-sm font-bold text-gray-800 leading-tight whitespace-pre-line">
              {bubbleText}
            </p>

            <button
              onClick={() => setBubbleText(null)}
              className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Tail */}
            <div className="absolute -bottom-2 left-0 w-6 h-6 bg-white border-r-2 border-b-2 border-green-600 rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
