import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getRecipes } from '@/lib/services/recipeService';

// Revalidate every hour so new products/categories appear quickly
export const revalidate = 3600;

const BASE_URL = 'https://keralagrocery.com';

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

function entry(
  path: string,
  changeFrequency: ChangeFreq,
  priority: number,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
  };
}

// Stable reference dates — only update when the page content actually changes.
// Using new Date() for every entry falsely signals "everything updated now" on
// each crawl, which wastes crawl budget and confuses Google's change-detection.
const D = {
  today: new Date('2026-06-24'),
  landing: new Date('2026-06-24'),
  blog: new Date('2026-03-01'),
  legal: new Date('2026-02-01'),
};

// Static entries that are always present regardless of DB state
const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  // Tier 1 – Homepage
  entry('/', 'daily', 1.0, D.today),

  // Tier 2 – High-value commercial keyword landing pages
  entry('/kerala-groceries-uk', 'daily', 0.95, D.landing),
  entry('/indian-grocery-delivery-uk', 'daily', 0.95, D.landing),
  entry('/buy-kerala-spices-uk', 'weekly', 0.90, D.landing),
  entry('/products', 'daily', 0.90, D.today),
  entry('/best-sellers', 'daily', 0.90, D.today),
  entry('/offers', 'daily', 0.88, D.today),
  entry('/recipes', 'weekly', 0.85, D.today),

  // Tier 3 – Category index
  entry('/categories', 'daily', 0.85, D.today),

  // Tier 4 – Brand index
  entry('/brands', 'weekly', 0.75, D.today),

  // Tier 6 – Blog
  entry('/blog', 'weekly', 0.75, D.blog),
  entry('/blog/top-10-kerala-foods-uk', 'monthly', 0.70, D.blog),
  entry('/blog/where-to-buy-curry-leaves-uk', 'monthly', 0.70, D.blog),
  entry('/blog/best-indian-grocery-delivery-london', 'monthly', 0.70, D.blog),

  // Tier 6.5 – Hyper-Local Delivery Pages
  entry('/delivery/london', 'weekly', 0.85, D.today),
  entry('/delivery/birmingham', 'weekly', 0.85, D.today),
  entry('/delivery/manchester', 'weekly', 0.85, D.today),
  entry('/delivery/leicester', 'weekly', 0.85, D.today),
  entry('/delivery/croydon', 'weekly', 0.85, D.today),

  // Tier 7 – Trust / identity
  entry('/about-us', 'monthly', 0.60, D.legal),
  entry('/contact', 'monthly', 0.60, D.legal),

  // Tier 8 – Legal
  entry('/privacy', 'monthly', 0.40, D.legal),
  entry('/terms', 'monthly', 0.40, D.legal),
  entry('/refund-policy', 'monthly', 0.40, D.legal),
  entry('/delivery-policy', 'monthly', 0.40, D.legal),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Safe Supabase client creation ────────────────────────────────────────────
  // Build the client directly here so a missing/broken env var or DB error
  // never throws and returns a 500 — we simply fall back to static entries.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Env vars not available (e.g. during static generation without secrets)
    return STATIC_ENTRIES;
  }

  let products: { slug: string; created_at: string }[] = [];
  let categories: { slug: string }[] = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('slug, created_at')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('slug')
        .eq('is_active', true)
    ]);

    products = productsRes.data ?? [];
    categories = categoriesRes.data ?? [];
  } catch {
    // DB unreachable — return static sitemap so Google never gets a 500
    return STATIC_ENTRIES;
  }

  // ── Category pages (/products?filter=[slug]) ──────────────────────────────
  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) =>
    entry(`/products?filter=${c.slug}`, 'weekly', 0.80)
  );

  // ── Product pages (/products/[slug]) ──────────────────────────────────────
  // Query-string filter pages (?category=, ?brand=) are not canonical URLs
  // and must not appear in the sitemap — they share the /products canonical.
  const productEntries: MetadataRoute.Sitemap = products.map((p) =>
    entry(
      `/products/${p.slug}`,
      'weekly',
      0.70,
      p.created_at ? new Date(p.created_at) : undefined,
    )
  );

  // ── Recipe pages (/recipes/[slug]) ──────────────────────────────────────
  const recipes = await getRecipes();
  const recipeEntries: MetadataRoute.Sitemap = recipes.map((r) =>
    entry(`/recipes/${r.slug}`, 'monthly', 0.80, D.today)
  );

  return [
    ...STATIC_ENTRIES,
    ...categoryEntries,
    ...productEntries,
    ...recipeEntries,
  ];
}
