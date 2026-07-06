'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import BannerCarousel from '@/components/home/BannerCarousel';
import type { Banner } from '@/lib/types/database';

export default function HomeBannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    supabase
      .from('carousel_banners')
      .select('id, title, subtitle, image_url, cta_text, cta_link, is_active, display_order, created_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[HomeBannerCarousel] fetch error:', error.message);
          return;
        }
        if (data) {
          setBanners(data.filter((b: any) => b.image_url && b.image_url.trim() !== '') as Banner[]);
        }
      });
  }, []);

  if (banners.length === 0) return null;

  return <BannerCarousel banners={banners} />;
}
