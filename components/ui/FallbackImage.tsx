'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { blurDataURL } from '@/lib/utils/image';

interface FallbackImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
}

export function FallbackImage({ src, fallbackSrc = '/placeholder.webp', alt, ...props }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    if (!errored) {
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
      placeholder={props.placeholder ?? 'blur'}
      blurDataURL={props.blurDataURL ?? blurDataURL}
    />
  );
}
