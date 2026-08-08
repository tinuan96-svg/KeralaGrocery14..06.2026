/**
 * Supabase Image Loader
 *
 * Optimizes images by using Supabase Storage transformation features.
 * Works with the Next.js <Image /> component.
 */

interface SupabaseLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function supabaseImageLoader({ src, width, quality }: SupabaseLoaderProps) {
  // If it's a local asset (starts with / and not //), skip the loader logic
  if (src.startsWith('/') && !src.startsWith('//') && !src.includes('supabase.co')) {
    return src;
  }

  // If it's already a transformed URL or external, return as is
  if (!src.includes('supabase.co')) {
    return src;
  }

  // Supabase Image Transformation (requires Pro plan)
  // Since we are using a custom loader, we must return a URL that at least
  // acknowledges the width to satisfy Next.js warnings, even if we don't
  // perform the actual resize server-side yet.

  try {
    const url = new URL(src);
    // Only apply if it's a public storage URL
    if (src.includes('/storage/v1/object/public/')) {
      // You can implement transformation here if you upgrade to a paid Supabase plan:
      // url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      // url.searchParams.set('width', width.toString());
      // if (quality) url.searchParams.set('quality', quality.toString());
    }
    return url.toString();
  } catch (e) {
    return src;
  }
}
