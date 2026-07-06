import { getSupabase } from '@/lib/supabase/client';

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  cta_text: string;
  cta_link: string;
  bg_color: string;
  bg_gradient: string | null;
  text_color: 'light' | 'dark';
  banner_type: BannerType;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BannerType =
  | 'product_promotion'
  | 'flash_deal'
  | 'cashback_promotion'
  | 'free_delivery'
  | 'seasonal'
  | 'new_arrivals'
  | 'brand_promotion';

export const BANNER_TYPE_META: Record<BannerType, { label: string; color: string; bg: string }> = {
  product_promotion: { label: 'Product',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  flash_deal:        { label: 'Flash Deal', color: 'text-red-700',    bg: 'bg-red-100'    },
  cashback_promotion:{ label: 'Cashback',   color: 'text-amber-700',  bg: 'bg-amber-100'  },
  free_delivery:     { label: 'Delivery',   color: 'text-green-700',  bg: 'bg-green-100'  },
  seasonal:          { label: 'Seasonal',   color: 'text-orange-700', bg: 'bg-orange-100' },
  new_arrivals:      { label: 'New',        color: 'text-teal-700',   bg: 'bg-teal-100'   },
  brand_promotion:   { label: 'Brand',      color: 'text-gray-700',   bg: 'bg-gray-100'   },
};

// ── Public queries ────────────────────────────────────────────────────────────

export async function fetchActiveBanners(): Promise<PromoBanner[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('promotional_banners')
    .select('*')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[bannerService] fetchActiveBanners:', error.message);
    return [];
  }
  return (data ?? []) as PromoBanner[];
}

// ── Analytics ─────────────────────────────────────────────────────────────────

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = typeof window !== 'undefined'
      ? (sessionStorage.getItem('kg_sid') ?? (() => {
          const id = crypto.randomUUID();
          sessionStorage.setItem('kg_sid', id);
          return id;
        })())
      : 'ssr';
  }
  return sessionId;
}

export async function trackBannerView(bannerId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('banner_analytics').insert({
      banner_id:  bannerId,
      event_type: 'view',
      session_id: getSessionId(),
      user_id:    user?.id ?? null,
    });
  } catch { /* non-blocking */ }
}

export async function trackBannerClick(bannerId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('banner_analytics').insert({
      banner_id:  bannerId,
      event_type: 'click',
      session_id: getSessionId(),
      user_id:    user?.id ?? null,
    });
  } catch { /* non-blocking */ }
}

// ── Admin queries ─────────────────────────────────────────────────────────────

export interface BannerStats {
  banner_id: string;
  views: number;
  clicks: number;
  ctr: number;
}

export async function fetchAllBanners(): Promise<PromoBanner[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('promotional_banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('[bannerService] fetchAllBanners:', error.message);
    return [];
  }
  return (data ?? []) as PromoBanner[];
}

export async function fetchBannerStats(): Promise<BannerStats[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('banner_analytics')
    .select('banner_id, event_type');

  if (error || !data) return [];

  const statsMap = new Map<string, { views: number; clicks: number }>();
  for (const row of data) {
    if (!statsMap.has(row.banner_id)) statsMap.set(row.banner_id, { views: 0, clicks: 0 });
    const s = statsMap.get(row.banner_id)!;
    if (row.event_type === 'view')  s.views++;
    if (row.event_type === 'click') s.clicks++;
  }

  return Array.from(statsMap.entries()).map(([banner_id, { views, clicks }]) => ({
    banner_id,
    views,
    clicks,
    ctr: views > 0 ? parseFloat(((clicks / views) * 100).toFixed(1)) : 0,
  }));
}

export async function upsertBanner(banner: Partial<PromoBanner> & { title: string; cta_text: string; cta_link: string }): Promise<PromoBanner | null> {
  const supabase = getSupabase();
  const payload = { ...banner, updated_at: new Date().toISOString() };

  if (banner.id) {
    const { data, error } = await supabase
      .from('promotional_banners')
      .update(payload)
      .eq('id', banner.id)
      .select()
      .single();
    if (error) { console.error('[bannerService] upsertBanner update:', error.message); return null; }
    return data as PromoBanner;
  }

  const { data, error } = await supabase
    .from('promotional_banners')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('[bannerService] upsertBanner insert:', error.message); return null; }
  return data as PromoBanner;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.from('promotional_banners').delete().eq('id', id);
  return !error;
}

export async function uploadBannerImage(file: File): Promise<string | null> {
  const supabase = getSupabase();
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('banner-images')
    .upload(path, file, { upsert: false, cacheControl: '3600', contentType: file.type });

  if (error) { console.error('[bannerService] uploadBannerImage:', error.message); return null; }

  const { data } = supabase.storage.from('banner-images').getPublicUrl(path);
  return data.publicUrl;
}
