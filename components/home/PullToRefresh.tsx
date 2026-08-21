'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/useNative';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const onRefresh = async () => {
    window.location.reload();
  };

  const { isRefreshing } = usePullToRefresh(onRefresh);

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-4">
          <div className="bg-white rounded-full p-2 shadow-lg border border-green-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#0B5D3B] animate-spin" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pr-1">Updating...</span>
          </div>
        </div>
      )}
      <div className={`transition-all duration-300 ${isRefreshing ? 'translate-y-12' : ''}`}>
        {children}
      </div>
    </div>
  );
}
