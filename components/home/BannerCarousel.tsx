'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Banner } from '@/lib/types/database';
import HeroSearch from './HeroSearch';

interface BannerCarouselProps {
  banners: Banner[];
}

const AUTOPLAY_DELAY = 5000;

const FALLBACK_SRC = '/placeholder.webp';

function BannerSlide({ banner }: { banner: Banner }) {
  const [imgSrc, setImgSrc] = useState(banner.image_url || FALLBACK_SRC);

  return (
    <div className="relative flex-[0_0_100%] min-w-0 h-full">
      <Image
        src={imgSrc}
        alt={banner.title}
        fill
        sizes="100vw"
        className="object-cover"
        priority
        onError={() => setImgSrc(FALLBACK_SRC)}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8">
          <div className="max-w-lg">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight drop-shadow-md">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <p className="text-sm md:text-base text-white/85 mb-4 leading-relaxed drop-shadow-sm">
                {banner.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {banner.cta_link ? (
                <Link href={banner.cta_link}>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2 rounded-full text-sm shadow-lg">
                    {banner.cta_text || 'Shop Now'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/products">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2 rounded-full text-sm shadow-lg">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-900 h-[280px] md:h-[360px]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-600/10 rounded-full blur-3xl" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 h-full flex items-center">
        <div className="max-w-lg">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
            Fresh Groceries
            <br />
            <span className="text-orange-400">Delivered Fast</span>
          </h1>
          <p className="text-sm md:text-base text-green-100 mb-4">
            Authentic Kerala products delivered to your door across the UK
          </p>
          <HeroSearch />
          <Link href="/products">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2 rounded-full text-sm mt-3">
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  if (banners.length === 0) {
    return <FallbackHero />;
  }

  return <Carousel banners={banners} />;
}

function Carousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHovering = useRef(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  function startAutoplay() {
    stopAutoplay();
    autoplayRef.current = setInterval(() => {
      if (!isHovering.current) {
        emblaApi?.scrollNext();
      }
    }, AUTOPLAY_DELAY);
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });

    startAutoplay();
    return () => stopAutoplay();
  }, [emblaApi]);

  if (banners.length === 1) {
    return (
      <section className="relative overflow-hidden h-[280px] md:h-[360px]">
        <BannerSlide banner={banners[0]} />
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden h-[280px] md:h-[360px] group"
      onMouseEnter={() => { isHovering.current = true; }}
      onMouseLeave={() => { isHovering.current = false; }}
    >
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {banners.map((banner) => (
            <BannerSlide key={banner.id} banner={banner} />
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        aria-label="Previous banner"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={scrollNext}
        aria-label="Next banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Go to banner ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? 'w-5 h-2 bg-white'
                : 'w-2 h-2 bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
