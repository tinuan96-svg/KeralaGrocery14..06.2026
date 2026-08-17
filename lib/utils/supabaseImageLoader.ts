/**
 * Supabase Image Loader
 *
 * Uses Supabase Storage's built-in image transformation endpoint to serve
 * appropriately sized images for Next.js <Image /> components. Falls back
 * to the original URL if the URL does not look like a Supabase storage path.
 */

interface SupabaseLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function supabaseImageLoader({ src, width, quality }: SupabaseLoaderProps) {
  // If it's not a Supabase URL, return as-is
  if (!src || !src.includes('supabase.co')) {
    return src;
  }

  // If the URL already has query params for transformation, don't double-transform
  if (src.includes('/render/image/')) {
    return src;
  }

  // For Supabase storage public URLs, use the render/image endpoint for resizing
  // Format: https://<project>.supabase.co/storage/v1/render/image/public/<bucket>/<path>?width=300&quality=75
  try {
    const url = new URL(src);
    if (url.pathname.includes('/storage/v1/object/public/')) {
      // Replace /object/public/ with /render/image/public/ for on-the-fly transforms
      const renderPath = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      url.pathname = renderPath;
      url.searchParams.set('width', String(Math.min(width, 1200)));
      url.searchParams.set('quality', String(quality ?? 80));
      return url.toString();
    }
  } catch {
    // If URL parsing fails, return original
  }

  return src;
}
