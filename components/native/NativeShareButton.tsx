'use client';

import { useNativeShare, useHaptics } from '@/hooks/useNative';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface NativeShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export function NativeShareButton({ title, text, url, className }: NativeShareButtonProps) {
  const { share } = useNativeShare();
  const { trigger } = useHaptics();

  const handleShare = async () => {
    await trigger('light');
    await share({
      title,
      text:  text ?? title,
      url:   url ?? (typeof window !== 'undefined' ? window.location.href : ''),
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleShare}
      className={className}
      aria-label="Share"
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
