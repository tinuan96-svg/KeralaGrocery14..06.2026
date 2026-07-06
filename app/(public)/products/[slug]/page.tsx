import type { Metadata } from 'next';
import KeralaProductDetailPage from '@/components/product/KeralaProductDetailPage';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ProductSchema,
  BreadcrumbSchema,
  MerchantReturnPolicySchema,
  ShippingPolicySchema,
} from '@/components/seo/StructuredData';

interface ProductPageProps {
  params: { slug: string };
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  image_main: string | null;
  price: number;
  selling_price: number | null;
  brand: string | null;
  source_brand: string | null;
  centralhub_product_id: string | null;
  categories: { name: string } | null;
}

async function fetchProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = createServerSupabaseClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let query = supabase
    .from('products')
    .select('id, name, slug, description, short_description, image_url, image_main, price, selling_price, brand, source_brand, centralhub_product_id, categories(name)')
    .eq('approval_status', 'approved')
    .eq('visibility_status', true);

  if (isUuid) {
    query = query.or(`id.eq.${slug},slug.eq.${slug}`);
  } else {
    query = query.eq('slug', slug);
  }

  const { data } = await query.maybeSingle();
  return (data as unknown as ProductRow) ?? null;
}

export async function generateStaticParams() {
  const supabase = createServerSupabaseClient();
  const { data: products } = await supabase
    .from('products')
    .select('slug')
    .eq('approval_status', 'approved')
    .eq('visibility_status', true);

  return (products || []).map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const p = await fetchProductBySlug(params.slug);

  if (!p) {
    return {
      title: params.slug.replace(/-/g, ' '),
      robots: { index: false, follow: false },
    };
  }

  const name = p.name;
  const brand = p.brand ?? p.source_brand ?? null;
  const category = (p.categories as { name: string } | null)?.name ?? null;
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fallbackDesc = `Buy ${name}${brand ? ` by ${brand}` : ''}${category ? ` — ${category}` : ''} online in the UK. Authentic Kerala grocery delivered fast by Tasty Kerala Ltd.`;
  const rawDesc = p.short_description?.trim()
    || (p.description && p.description !== 'No description' ? stripHtml(p.description).substring(0, 200) : null)
    || fallbackDesc;
  const description = rawDesc.substring(0, 200);
  const title = `${name}${brand ? ` | ${brand}` : ''} | Kerala Groceries UK`;
  const canonicalUrl = `https://keralagrocery.com/products/${params.slug}`;
  const effectiveImage = p.image_main ?? p.image_url;
  const ogImage = effectiveImage
    ? [{ url: effectiveImage, width: 800, height: 800, alt: name }]
    : [{ url: 'https://keralagrocery.com/logo_KG_Trans.png', alt: 'Kerala Groceries UK' }];

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Kerala Groceries UK',
      locale: 'en_GB',
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage.map(i => i.url),
    },
    other: {
      ...(p.price > 0 ? {
        'product:price:amount': p.price.toFixed(2),
        'product:price:currency': 'GBP',
        'product:availability': 'in stock',
        'product:brand': brand ?? '',
        'product:category': category ?? '',
      } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const p = await fetchProductBySlug(params.slug);

  const name        = p?.name ?? params.slug.replace(/-/g, ' ');
  const brand       = p?.brand ?? p?.source_brand ?? 'Kerala Groceries UK';
  const category    = (p?.categories as { name: string } | null)?.name ?? null;
  const price       = Number(p?.selling_price ?? p?.price ?? 0);
  const image       = p?.image_main ?? p?.image_url ?? 'https://keralagrocery.com/image.png';
  const description = (p?.description && p.description !== 'No description')
    ? p.description
    : `${name} — authentic Kerala grocery.`;
  const canonicalUrl = `https://keralagrocery.com/products/${params.slug}`;

  const breadcrumbs = [
    { name: 'Home',     url: 'https://keralagrocery.com'          },
    { name: 'Products', url: 'https://keralagrocery.com/products' },
    ...(category ? [{ name: category, url: `https://keralagrocery.com/products?filter=${encodeURIComponent(category)}` }] : []),
    { name: name, url: canonicalUrl },
  ];

  return (
    <>
      {p && (
        <>
          <MerchantReturnPolicySchema />
          <ShippingPolicySchema />
          <ProductSchema
            name={name}
            description={description}
            image={image}
            price={price}
            brand={brand}
            availability="InStock"
            url={canonicalUrl}
          />
          <BreadcrumbSchema items={breadcrumbs} />
        </>
      )}
      <KeralaProductDetailPage slug={params.slug} />
    </>
  );
}
