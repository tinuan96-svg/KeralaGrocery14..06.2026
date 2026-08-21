import { getSupabase } from '@/lib/supabase/client';

export interface SiteFAQ {
  question: string;
  answer: string;
}

export interface SiteSettings {
  homepage_faqs: SiteFAQ[];
  trending_searches: string[];
  free_delivery_threshold: number;
  delivery_notice?: string;
  is_under_maintenance: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  homepage_faqs: [
    {
      question: "Where do you deliver Kerala grocery in the UK?",
      answer: "We deliver authentic Kerala grocery products across the entire United Kingdom, including England, Scotland, Wales, and Northern Ireland."
    },
    {
      question: "Do you offer free delivery?",
      answer: "Yes, we offer free standard delivery on all Kerala grocery orders over £45."
    }
  ],
  trending_searches: ['Matta Rice', 'Coconut Oil', 'Banana Chips', 'Sambar Powder', 'Pickles'],
  free_delivery_threshold: 45,
  is_under_maintenance: false
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }

    return {
      homepage_faqs: data.homepage_faqs || DEFAULT_SETTINGS.homepage_faqs,
      trending_searches: data.trending_searches || DEFAULT_SETTINGS.trending_searches,
      free_delivery_threshold: data.free_delivery_threshold || 45,
      delivery_notice: data.delivery_notice,
      is_under_maintenance: !!data.is_under_maintenance,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
