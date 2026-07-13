import { getSupabase } from '@/lib/supabase/client';

export const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f0f0f0" offset="20%" />
      <stop stop-color="#e0e0e0" offset="50%" />
      <stop stop-color="#f0f0f0" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f0f0f0" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

export const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export const blurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`;

export const getImageProps = (priority: boolean = false) => ({
  placeholder: 'blur' as const,
  blurDataURL,
  ...(priority && { priority: true, fetchPriority: 'high' as const }),
});

type ProductImageFields = {
  image_cdn_url?: string | null;
  image_override?: string | null;
  image_main?: string | null;
  image_medium?: string | null;
  image_thumbnail?: string | null;
  image_large?: string | null;
  enhanced_image_url?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
};

/**
 * Resolves the best available image URL for a product.
 * Priority (processed images first): image_cdn_url → image_override → image_main
 *   → image_medium → enhanced_image_url → image_url
 */
export function resolveProductImage(
  product: ProductImageFields,
  updatedAt?: string | null,
): string | null {
  const candidates = [
    product.image_cdn_url,
    product.image_override,
    product.image_main,
    product.image_medium,
    product.enhanced_image_url,
    product.image_url,
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  for (let url of candidates) {
    if (!url || typeof url !== 'string' || url.trim() === '') continue;

    // Handle absolute URLs
    if (url.startsWith('http')) {
      const ts = updatedAt ?? product.updated_at;
      return ts ? `${url}?v=${new Date(ts).getTime()}` : url;
    }

    // Never use local browser blob URLs
    if (url.startsWith('blob:')) continue;

    // Handle Supabase relative paths (e.g. products/123.jpg or /storage/v1/...)
    if (supabaseUrl && (url.startsWith('products/') || url.startsWith('categories/') || url.startsWith('/storage/v1/'))) {
      let bucket = 'product-images';
      if (url.startsWith('categories/')) {
        bucket = 'category-images';
      }

      const path = url.startsWith('/') ? url : `/storage/v1/object/public/${bucket}/${url}`;
      const fullUrl = `${supabaseUrl}${path}`;
      const ts = updatedAt ?? product.updated_at;
      return ts ? `${fullUrl}?v=${new Date(ts).getTime()}` : fullUrl;
    }
  }
  return null;
}

/**
 * Resolves the thumbnail-sized image (300px) for list/card views.
 * Falls back through the normal priority chain if no dedicated thumbnail.
 */
export function resolveProductThumbnail(
  product: ProductImageFields,
  updatedAt?: string | null,
): string | null {
  const thumb =
    product.image_thumbnail ??
    product.image_cdn_url ??
    product.image_override ??
    product.image_main ??
    product.image_medium ??
    product.enhanced_image_url ??
    product.image_url;
  if (thumb && thumb.startsWith('http')) {
    const ts = updatedAt ?? product.updated_at;
    return ts ? `${thumb}?v=${new Date(ts).getTime()}` : thumb;
  }
  return null;
}

/** Returns a display-safe image src. Falls back to /placeholder.webp. */
export function getProductImageSrc(
  product: ProductImageFields,
  updatedAt?: string | null,
): string {
  return resolveProductImage(product, updatedAt) ?? '/placeholder.webp';
}

/** Returns a display-safe thumbnail src. Falls back to /placeholder.webp. */
export function getProductThumbnailSrc(
  product: ProductImageFields,
  updatedAt?: string | null,
): string {
  return resolveProductThumbnail(product, updatedAt) ?? '/placeholder.webp';
}

/**
 * Returns WebP + JPEG srcset pair for a processed image.
 * If the image is a Supabase transform URL (render/image), derives the JPEG
 * fallback by requesting format=origin. Otherwise returns the original URL
 * for both formats (browser will handle it).
 */
export function getProductSrcSet(product: ProductImageFields): {
  webp: string | null;
  jpeg: string | null;
} {
  const main = resolveProductImage(product);
  if (!main) return { webp: null, jpeg: null };

  // Supabase image transform URLs can serve WebP natively; derive JPEG fallback
  if (main.includes('/render/image/')) {
    const u = new URL(main);
    u.searchParams.set('format', 'jpeg');
    return { webp: main, jpeg: u.toString() };
  }

  // For CDN URLs ending in .webp, generate .jpg fallback
  if (main.match(/\.webp(\?|$)/i)) {
    return { webp: main, jpeg: main.replace(/\.webp(\?|$)/i, '.jpg$1') };
  }

  return { webp: main, jpeg: main };
}

/**
 * Builds a structured storage path for a product image upload.
 * Format: products/{category-slug}/{product-slug}-{timestamp}.{ext}
 */
export function buildProductImagePath(opts: {
  productSlug: string;
  categorySlug?: string;
  filename: string;
}): string {
  const ext = opts.filename.split('.').pop()?.toLowerCase() || 'jpg';
  const category = opts.categorySlug
    ? opts.categorySlug.replace(/[^a-z0-9-]/g, '-')
    : 'uncategorised';
  const slug = opts.productSlug.replace(/[^a-z0-9-]/g, '-').slice(0, 60);
  return `products/${category}/${slug}-${Date.now()}.${ext}`;
}

/**
 * Uploads a product image, stores it in the structured folder, updates the DB,
 * and fires background AI processing. Returns a cache-busted public URL.
 */
export async function replaceProductImage({
  file,
  productId,
  storeId,
  productSlug,
  categorySlug,
  bucket = 'product-images',
}: {
  file: File;
  productId: string;
  storeId: string;
  productSlug?: string;
  categorySlug?: string;
  bucket?: string;
}): Promise<string> {
  const supabase = getSupabase();

  const filePath = buildProductImagePath({
    productSlug: productSlug ?? productId,
    categorySlug,
    filename: file.name,
  });

  // 1) Upload to structured path
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: false,
      cacheControl: '60',
      contentType: file.type || `image/${filePath.split('.').pop()}`,
    });
  if (uploadError) throw uploadError;

  // 2) Build public URL
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = pub.publicUrl;

  // 3) Update DB via RPC
  const { error: rpcError } = await supabase.rpc('replace_product_image', {
    p_product_id: productId,
    p_store_id: storeId,
    p_new_image_url: publicUrl,
  });
  if (rpcError) {
    await supabase.storage.from(bucket).remove([filePath]);
    throw rpcError;
  }

  // 4) Fire background AI image processing (non-blocking)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    fetch(`${supabaseUrl}/functions/v1/process-product-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_path: filePath,
        source_image_url: publicUrl,
        product_id: productId,
        seo_name: productSlug ?? productId,
      }),
    }).catch(() => {/* non-blocking */});
  }

  return `${publicUrl}?v=${Date.now()}`;
}
