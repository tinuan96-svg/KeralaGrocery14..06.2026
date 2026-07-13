'use client';

import { useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';

function GoogleAdsRemarketingInner({ tagId }: { tagId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // Fire remarketing events on page changes
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        'send_to': tagId,
      });
    }
  }, [pathname, tagId]);

  return null;
}

export function GoogleAdsRemarketing({ tagId }: { tagId?: string }) {
  if (!tagId) return null;
  return (
    <Suspense fallback={null}>
      <GoogleAdsRemarketingInner tagId={tagId} />
    </Suspense>
  );
}
