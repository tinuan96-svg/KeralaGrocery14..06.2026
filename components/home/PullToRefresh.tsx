'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/useNative';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const onRefresh = async () => {
    // In a real Next.js app, we might want to use router.refresh()
    // but here we just trigger a window reload or custom logic
    window.location.reload();
  };

  const { isRefreshing } = usePullToRefresh(onRefresh);

  return (
    <div className="relative">
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
          >
            <div className="bg-white rounded-full p-2 shadow-lg border border-green-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0B5D3B] animate-spin" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pr-1">Updating...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`transition-all duration-300 ${isRefreshing ? 'translate-y-12' : ''}`}>
        {children}
      </div>
    </div>
  );
}

import { AnimatePresence } from 'framer-motion';
