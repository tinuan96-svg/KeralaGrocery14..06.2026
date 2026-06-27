'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface FallbackImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
}

export function FallbackImage({ src, fallbackSrc = '/placeholder.webp', alt, ...props }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    if (!errored) {
      console.warn('[FallbackImage] Image failed to load, using fallback:', src);
      setImgSrc(fallbackSrc);
      setErrored(true);
    }
  };

  return (
    <Image
      {...props}
      src={imgSrc || fallbackSrc}
      alt={alt}
      onError={handleError}
    />
  );
}
