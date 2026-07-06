import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

const BASE_URL = 'https://keralagrocery.com';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let rows: { slug: string; image_main: string | null; image_url: string | null; product_display_name: string | null; product_title: string | null }[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase
        .from('v_storefront_products')
        .select('product_slug, image_main, image_url, product_display_name, product_title')
        .not('product_slug', 'is', null)
        .limit(5000);

      rows = (data ?? []).map((r: Record<string, unknown>) => ({
        slug: r.product_slug as string,
        image_main: r.image_main as string | null,
        image_url: r.image_url as string | null,
        product_display_name: r.product_display_name as string | null,
        product_title: r.product_title as string | null,
      }));
    } catch {
      // fall through to empty sitemap
    }
  }

  const urlEntries = rows
    .filter((r) => r.slug && (r.image_main || r.image_url))
    .map((r) => {
      const image = r.image_main || r.image_url!;
      const name = r.product_display_name || r.product_title || r.slug;
      return `  <url>
    <loc>${BASE_URL}/products/${encodeURIComponent(r.slug)}</loc>
    <image:image>
      <image:loc>${escapeXml(image)}</image:loc>
      <image:title>${escapeXml(name)}</image:title>
    </image:image>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
