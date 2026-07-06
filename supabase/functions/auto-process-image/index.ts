/**
 * auto-process-image
 *
 * Receives Supabase Storage webhook events (INSERT on product-images bucket)
 * and fires off background image processing automatically.
 *
 * Also accepts a direct POST body for manual triggering.
 *
 * Webhook payload format (from Supabase Storage webhook):
 * {
 *   type: "INSERT",
 *   table: "objects",
 *   record: { bucket_id: "product-images", name: "some/file.jpg", ... }
 * }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SOURCE_BUCKET = "product-images";

function bucketPublicUrl(bucket: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(name);
}

async function matchProductByImageUrl(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  imagePath: string,
): Promise<string | null> {
  // Try exact image_url match first
  const { data: exact } = await supabase
    .from("products")
    .select("id")
    .eq("image_url", imageUrl)
    .eq("is_active", true)
    .maybeSingle();
  if (exact) return exact.id;

  // Try matching by slug derived from filename
  const filename = imagePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  if (filename) {
    const slug = filename.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const { data: bySlug } = await supabase
      .from("products")
      .select("id")
      .ilike("slug", `%${slug.slice(0, 30)}%`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (bySlug) return bySlug.id;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "No body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Supabase storage webhook format
    let filePaths: { path: string; url: string }[] = [];

    if (body.type === "INSERT" && body.record?.bucket_id === SOURCE_BUCKET) {
      // Storage trigger webhook
      const record = body.record as { name: string; bucket_id: string };
      if (!isImageFile(record.name)) {
        return new Response(JSON.stringify({ status: "skipped", reason: "not an image" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = bucketPublicUrl(SOURCE_BUCKET, record.name);
      filePaths = [{ path: record.name, url }];
    } else if (body.path && body.url) {
      // Direct call: { path, url }
      filePaths = [{ path: body.path, url: body.url }];
    } else if (Array.isArray(body.files)) {
      // Batch: [{ path, url }]
      filePaths = body.files;
    } else {
      return new Response(JSON.stringify({ error: "Unrecognised payload format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const { path, url } of filePaths) {
      // Try to find a matching product
      const productId = await matchProductByImageUrl(supabase, url, path);

      // Fire process-product-image in background (don't await response)
      const processPayload = {
        source_image_path: path,
        source_image_url: url,
        ...(productId ? { product_id: productId } : {}),
        seo_name: path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path,
      };

      // Use waitUntil so the response returns immediately while processing continues
      const processPromise = productId
        ? fetch(`${SUPABASE_URL}/functions/v1/standardize-product-image`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ product_id: productId, image_url: url }),
          }).then((r) => r.json().catch(() => ({}))).catch((e) =>
            console.error("[auto-process-image] standardize error:", e)
          )
        : Promise.resolve();

      EdgeRuntime.waitUntil(processPromise);

      results.push({ path, product_id: productId, queued: true });
    }

    return new Response(
      JSON.stringify({ status: "queued", count: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
