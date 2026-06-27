import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import BrandsClient, { type BrandEntry } from '@/components/brands/BrandsClient';

export const metadata: Metadata = {
  title: 'Our Brands | Authentic Kerala & Indian Grocery Brands UK',
  description:
    'Shop authentic Kerala and Indian grocery brands online in the UK. Discover trusted brands for spices, rice, snacks, pickles, oils, and more. Fast delivery.',
  alternates: {
    canonical: 'https://keralagrocery.com/brands',
  },
  openGraph: {
    title: 'Our Brands | Authentic Kerala & Indian Grocery Brands UK',
    description:
      'Shop authentic Kerala and Indian grocery brands online in the UK. Trusted brands for spices, rice, snacks, pickles, oils, and more.',
    url: 'https://keralagrocery.com/brands',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

async function getBrands(): Promise<BrandEntry[]> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from('products')
    .select('brand, image_url, image_main, approval_status, visibility_status, is_active, is_deleted')
    .eq('is_deleted', false);

  const rows = (data ?? []) as {
    brand: string | null;
    image_url: string | null;
    image_main: string | null;
    approval_status: string;
    visibility_status: boolean;
    is_active: boolean;
  }[];

  const visible = rows.filter(
    (r) => r.approval_status === 'approved' && r.visibility_status && r.is_active
  );

  const brandMap = new Map<string, { count: number; imageUrl: string | null; displayName: string }>();

  for (const row of visible) {
    const raw = row.brand?.trim() ?? '';
    if (!raw) continue;
    const key = raw.toLowerCase();
    const img =
      (row.image_main?.startsWith('http') ? row.image_main : null) ??
      (row.image_url?.startsWith('http') ? row.image_url : null);

    const existing = brandMap.get(key);
    if (existing) {
      existing.count++;
      if (!existing.imageUrl && img) existing.imageUrl = img;
    } else {
      brandMap.set(key, { count: 1, imageUrl: img, displayName: raw });
    }
  }

  return Array.from(brandMap.values())
    .map(({ displayName, count, imageUrl }) => ({
      name: displayName,
      productCount: count,
      imageUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function BrandsPage() {
  const brands = await getBrands();
  return <BrandsClient brands={brands} />;
}
