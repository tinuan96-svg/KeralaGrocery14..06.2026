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

export default function supabaseImageLoader({ src }: SupabaseLoaderProps) {
  // Return the src as-is so the browser fetches the original Supabase storage URL.
  // The Supabase image transformation endpoint (/render/image/) requires a paid
  // plan and silently returns a broken image when unavailable, so we skip it.
  return src;
}
