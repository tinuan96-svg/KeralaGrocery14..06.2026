'use client';

import { useEffect, useRef } from 'react';
import { useRealtimeSync } from '@/lib/context/RealtimeSyncContext';
import { useRouter } from 'next/navigation';

/**
 * Attach this hook to any product listing or detail page.
 * It watches productVersion from the realtime sync provider and calls
 * router.refresh() whenever the local products table changes, ensuring
 * server-rendered pages pick up the latest data without a manual reload.
 */
export function useProductSync() {
  const { productVersion } = useRealtimeSync();
  const router = useRouter();
  const prevVersionRef = useRef(productVersion);

  useEffect(() => {
    if (productVersion !== prevVersionRef.current) {
      prevVersionRef.current = productVersion;
      router.refresh();
    }
  }, [productVersion, router]);
}
