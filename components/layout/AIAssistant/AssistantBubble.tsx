'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAssistant } from './AssistantContext';
import { useEffect } from 'react';
import { bubbleVariants } from './AssistantAnimations';

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
          variants={bubbleVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-[180px] left-10 z-[60] max-w-[240px]"
        >
          <div className="relative bg-white border-2 border-[#0B5D3B] rounded-[2.5rem] rounded-bl-none shadow-2xl p-5 pr-10">
            <p className="text-sm font-black text-gray-900 leading-tight whitespace-pre-line italic">
              &quot;{bubbleText}&quot;
            </p>

            <button
              onClick={() => setBubbleText(null)}
              className="absolute top-3 right-3 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Tail pointing to Kichu */}
            <div className="absolute -bottom-2 left-6 w-6 h-6 bg-white border-r-2 border-b-2 border-[#0B5D3B] rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
