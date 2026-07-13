'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  discountPercentage?: number;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isDeal?: boolean;
  stock?: number;
}

function toWebpSrc(src: string): string | null {
  if (!src || src === '/placeholder.webp') return null;
  if (src.includes('/render/image/')) return src;
  if (src.match(/\.webp(\?|$)/i)) return src;
  return null;
}

function toJpegSrc(src: string): string {
  if (!src) return '/placeholder.webp';
  if (src.includes('/render/image/')) {
    try {
      const u = new URL(src);
      u.searchParams.set('format', 'jpeg');
      return u.toString();
    } catch { return src; }
  }
  // If it's a webp, we can use it as is for modern browsers.
  // No need to blindly replace with .jpg which might not exist.
  return src;
}

export default function ProductGallery({
  images,
  productName,
  discountPercentage = 0,
  isBestseller,
  isNewArrival,
  isDeal,
  stock = 0,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [mobileZoomed, setMobileZoomed] = useState(false);
  const [mobileZoomOrigin, setMobileZoomOrigin] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastTapTime = useRef<number>(0);

  const allImages = images.length > 0 ? images : ['/placeholder.webp'];
  const currentImage = allImages[activeIndex];

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

    // Double-tap to zoom
    const now = Date.now();
    if (Math.abs(deltaX) < 10 && deltaY < 10) {
      if (now - lastTapTime.current < 300) {
        // Compute tap position as % of container
        if (imageContainerRef.current) {
          const rect = imageContainerRef.current.getBoundingClientRect();
          const ox = ((e.changedTouches[0].clientX - rect.left) / rect.width) * 100;
          const oy = ((e.changedTouches[0].clientY - rect.top) / rect.height) * 100;
          setMobileZoomOrigin({ x: ox, y: oy });
        }
        setMobileZoomed((z) => !z);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;
    } else {
      lastTapTime.current = 0;
    }

    // Swipe left/right only when not zoomed
    if (!mobileZoomed && Math.abs(deltaX) > 50 && deltaY < 60) {
      if (deltaX < 0 && activeIndex < allImages.length - 1) setActiveIndex((i) => i + 1);
      else if (deltaX > 0 && activeIndex > 0) setActiveIndex((i) => i - 1);
    }
  };

  const prev = () => { setMobileZoomed(false); setActiveIndex((i) => Math.max(0, i - 1)); };
  const next = () => { setMobileZoomed(false); setActiveIndex((i) => Math.min(allImages.length - 1, i + 1)); };

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {/* ── Main image ─────────────────────────────────────────── */}
      <div
        ref={imageContainerRef}
        className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.07)] cursor-zoom-in select-none"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#f9fafb_0%,_#ffffff_70%)] pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <picture className="w-full h-full flex items-center justify-center">
              {toWebpSrc(currentImage) && (
                <source srcSet={toWebpSrc(currentImage)!} type="image/webp" />
              )}
              <source srcSet={toJpegSrc(currentImage)} type="image/jpeg" />
              <img
                src={toJpegSrc(currentImage)}
                alt={productName}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full object-contain scale-[1.12] transition-transform duration-500 group-hover:scale-[1.20]"
                style={
                  isZoomed
                    ? {
                        transform: 'scale(2.3)',
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        transition: 'transform 0.08s ease-out',
                      }
                    : mobileZoomed
                    ? {
                        transform: 'scale(2.5)',
                        transformOrigin: `${mobileZoomOrigin.x}% ${mobileZoomOrigin.y}%`,
                        transition: 'transform 0.22s ease-out',
                      }
                    : { transition: 'transform 0.25s ease' }
                }
              />
            </picture>
          </motion.div>
        </AnimatePresence>

        {/* Badges */}
        {discountPercentage > 0 && (
          <Badge className="absolute top-3 left-3 bg-[#FF7A00] hover:bg-[#FF7A00] text-white text-xs font-bold px-2.5 py-1 shadow-sm">
            {discountPercentage}% OFF
          </Badge>
        )}
        {isBestseller && !discountPercentage && (
          <Badge className="absolute top-3 left-3 bg-[#0B5D3B] hover:bg-[#0B5D3B] text-white text-xs font-bold px-2.5 py-1">
            Bestseller
          </Badge>
        )}
        {isNewArrival && !isBestseller && !discountPercentage && (
          <Badge className="absolute top-3 left-3 bg-blue-600 hover:bg-blue-600 text-white text-xs font-bold px-2.5 py-1">
            New
          </Badge>
        )}
        {isDeal && (
          <Badge className="absolute top-3 right-3 bg-red-600 hover:bg-red-600 text-white text-xs font-bold px-2.5 py-1">
            Deal
          </Badge>
        )}
        {stock > 0 && stock <= 5 && (
          <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            Only {stock} left
          </div>
        )}

        {!isZoomed && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm pointer-events-none opacity-70">
            <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
          </div>
        )}

        {allImages.length > 1 && (
          <>
            {activeIndex > 0 && (
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all z-10 border border-gray-100"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
            )}
            {activeIndex < allImages.length - 1 && (
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all z-10 border border-gray-100"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </>
        )}

        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'bg-[#0B5D3B] w-5' : 'bg-gray-300 w-1.5'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnails ─────────────────────────────────────────── */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 overflow-hidden bg-white transition-all duration-200 ${
                i === activeIndex
                  ? 'border-[#0B5D3B] shadow-md shadow-green-100'
                  : 'border-gray-100 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#f9fafb_0%,_#ffffff_70%)]" />
              <picture className="absolute inset-0 flex items-center justify-center z-10">
                {toWebpSrc(img) && <source srcSet={toWebpSrc(img)!} type="image/webp" />}
                <source srcSet={toJpegSrc(img)} type="image/jpeg" />
                <img
                  src={toJpegSrc(img)}
                  alt={`${productName} ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain p-2"
                />
              </picture>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
