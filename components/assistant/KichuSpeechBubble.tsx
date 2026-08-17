'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { bubbleVariants } from './KichuAnimations';

interface Props {
  text: string | null;
  onClose: () => void;
}

export default function KichuSpeechBubble({ text, onClose }: Props) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          variants={bubbleVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative mb-4 z-[60] max-w-[220px] pointer-events-auto"
        >
          <div className="relative bg-white border-2 border-[#0B5D3B] rounded-[2rem] rounded-bl-none shadow-2xl p-4 pr-10">
            <p className="text-xs sm:text-sm font-bold text-gray-800 leading-tight italic">
              {text}
            </p>

            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Tail pointing to Kichu on the left */}
            <div className="absolute -bottom-2 left-4 w-6 h-6 bg-white border-r-2 border-b-2 border-[#0B5D3B] rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
