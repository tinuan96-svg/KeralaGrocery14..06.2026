'use client';

import { WifiOff } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gray-900 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <p className="text-sm font-medium">
        No internet connection. Please check your network and try again.
      </p>
    </div>
  );
}
