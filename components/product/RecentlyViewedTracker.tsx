'use client';

import { useEffect } from 'react';
import { trackProductView, type RecentlyViewedItem } from './RecentlyViewed';

export default function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  useEffect(() => {
    trackProductView(product);
  }, [product.id]);

  return null;
}
