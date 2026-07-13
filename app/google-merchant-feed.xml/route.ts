import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

const BASE_URL = 'https://keralagrocery.com';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let products: any[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Fetch products with necessary fields for Google Merchant Center
      const { data } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          short_description,
          image_url,
          image_main,
          price,
          selling_price,
          original_price,
          brand,
          category_id,
          stock,
          stock_quantity,
          created_at
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .neq('is_deleted', true)
        .neq('visibility_status', false)
        .not('slug', 'is', null)
        .limit(5000);

      products = data ?? [];

      // Map categories
      const { data: catData } = await supabase.from('categories').select('id, name');
      const catMap = new Map((catData ?? []).map(c => [c.id, c.name]));

      products = products.map(p => ({
        ...p,
        category_name: p.category_id ? catMap.get(p.category_id) : 'Grocery'
      }));

    } catch (err) {
      console.error('[merchant-feed] Error:', err);
    }
  }

  const items = products.map((p) => {
    const title = p.name;
    const description = p.short_description || p.description || title;
    const link = `${BASE_URL}/products/${p.slug || p.id}`;
    const imageLink = p.image_main || p.image_url || `${BASE_URL}/placeholder.webp`;
    const price = p.selling_price || p.price || 0;
    const availability = (p.stock > 0 || p.stock_quantity > 0) ? 'in_stock' : 'out_of_stock';
    const condition = 'new';
    const brand = p.brand || 'Kerala Grocery';
    const googleProductCategory = 'Food, Beverages & Tobacco > Food Items';

    return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} GBP</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:google_product_category>${escapeXml(googleProductCategory)}</g:google_product_category>
      <g:product_type>${escapeXml(p.category_name)}</g:product_type>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Kerala Grocery UK Product Feed</title>
    <link>${BASE_URL}</link>
    <description>Authentic Kerala and Indian groceries delivered across the UK.</description>
    <language>en-GB</language>
${items}
  </channel>
</rss>`;

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
