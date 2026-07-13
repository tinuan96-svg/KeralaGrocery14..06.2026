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
  // If it's already a full URL and not from our Supabase instance, return as is
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!src.includes(supabaseUrl || '') && src.startsWith('http')) {
    return src;
  }

  // Extract bucket and path
  // Expected format: [supabaseUrl]/storage/v1/object/public/[bucket]/[path]
  // We want to transform it to: [supabaseUrl]/storage/v1/render/image/public/[bucket]/[path]?width=[width]&quality=[quality]

  if (src.includes('/storage/v1/object/public/')) {
    const transformedUrl = src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const url = new URL(transformedUrl);
    url.searchParams.set('width', width.toString());
    if (quality) {
      url.searchParams.set('quality', quality.toString());
    }
    return url.toString();
  }

  return src;
}
