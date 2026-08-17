import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { resolveProductImage } from '@/lib/utils/image';

export const revalidate = 3600;

const BASE_URL = 'https://keralagrocery.com';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let rows: any[] = [];

  // 1. Start with homepage entry
  const entries: string[] = [
    `<url><loc>${BASE_URL}/</loc><image:image><image:loc>${BASE_URL}/logo_KG_Trans.png</image:loc><image:title>Kerala Grocery UK</image:title></image:image></url>`
  ];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data } = await supabase
        .from('products')
        .select('slug, image_main, image_url, name, image_cdn_url, image_override, image_medium, updated_at')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('slug', 'is', null)
        .limit(5000);

      rows = data ?? [];
    } catch {
      // fall through
    }
  }

  // 2. Build product entries
  const productEntries = rows
    .map((r) => {
      let image = resolveProductImage(r);

      // Fallback for relative paths if env vars were missing during build
      if (!image) {
        const raw = r.image_main || r.image_url || r.image_cdn_url;
        if (raw && raw.startsWith('http')) {
          image = raw;
        } else if (raw && supabaseUrl) {
          const path = raw.startsWith('/') ? raw : `/storage/v1/object/public/product-images/${raw}`;
          image = `${supabaseUrl}${path}`;
        }
      }

      if (!image || !r.slug) return null;

      const name = r.name || r.slug;
      const loc = `${BASE_URL}/products/${encodeURIComponent(r.slug)}`;

      // Return a compact single-line string for each URL entry
      return `<url><loc>${loc}</loc><image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(name)}</image:title></image:image></url>`;
    })
    .filter(Boolean);

  entries.push(...(productEntries as string[]));

  // 3. Assemble final XML - no extra whitespace/newlines between tags to avoid GSC parsing errors
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
