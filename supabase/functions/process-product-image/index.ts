/**
 * process-product-image
 *
 * Pipeline:
 * 1. Fetch source image
 * 2. OpenAI gpt-image-1 edit: white background, centred, studio lighting
 *    - Strict prompt forbids altering packaging text/labels
 *    - If OpenAI fails or is unavailable: store original unchanged
 * 3. Upload master to product-images-clean bucket
 * 4. Generate 300/800/2000px URLs via Supabase image transform
 * 5. Update products.image_main + image_processing_jobs
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY   = Deno.env.get("OPENAI_API_KEY") ?? "";
const CLEAN_BUCKET     = "product-images-clean";

const OPENAI_PROMPT = `
Place this product on a pure white background (#FFFFFF).
Add a soft, natural shadow directly beneath the product.
Apply professional studio lighting — clean, bright, even.
Center the product perfectly in the frame.
The product should fill 75–85% of the image area.
Maintain the original product proportions exactly — no stretching or warping.

CRITICAL — DO NOT CHANGE UNDER ANY CIRCUMSTANCES:
- Every letter, word, number, and character on the packaging
- Brand name, logo, font style, font size
- Label design, colors, artwork
- Nutritional information, weight labels, barcodes
- Any text visible on the product

If you cannot preserve ALL packaging text with 100% accuracy, return the image unchanged with only the background replaced.

OUTPUT: Square 1:1 format, high resolution, clean ecommerce-ready white background.
`.trim();

// ─── Helpers ───────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function detectMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return "image/webp";
  return "image/jpeg";
}

// ─── OpenAI gpt-image-1 edit ───────────────────────────────────────────────
async function tryOpenAI(
  imageBytes: Uint8Array,
  mime: string,
): Promise<Uint8Array | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpeg";
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", new Blob([imageBytes], { type: mime }), `product.${ext}`);
    form.append("prompt", OPENAI_PROMPT);
    form.append("size", "1024x1024");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn(`[openai] ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const json = await res.json() as { data?: { b64_json?: string }[] };
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return null;

    const resultBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Safety check: result must be at least 30% the size of the original
    if (resultBytes.length < imageBytes.length * 0.3) {
      console.warn("[openai] result too small, rejecting");
      return null;
    }

    return resultBytes;
  } catch (e) {
    console.warn("[openai] error:", e);
    return null;
  }
}

// ─── Build Supabase image transform URL ───────────────────────────────────
function transformUrl(publicUrl: string, width: number): string {
  const u = new URL(publicUrl);
  u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  u.searchParams.set("width",  String(width));
  u.searchParams.set("height", String(width));
  u.searchParams.set("resize", "contain");
  u.searchParams.set("quality", "88");
  return u.toString();
}

// ─── Upload to clean bucket ────────────────────────────────────────────────
async function uploadClean(
  supabase: ReturnType<typeof createClient>,
  path: string,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(CLEAN_BUCKET)
    .upload(path, data, { upsert: true, contentType });
  if (error) throw new Error(`Upload ${path}: ${error.message}`);
  const { data: pub } = supabase.storage.from(CLEAN_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json() as {
      source_image_path: string;
      source_image_url: string;
      product_id?: string;
      seo_name?: string;
      force?: boolean;
    };

    const { source_image_path, source_image_url, product_id, seo_name, force } = body;

    if (!source_image_path || !source_image_url) {
      return new Response(
        JSON.stringify({ error: "source_image_path and source_image_url required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Skip if already done
    if (!force) {
      const { data: existing } = await supabase
        .from("image_processing_jobs")
        .select("id, status, result_main_url")
        .eq("source_image_path", source_image_path)
        .in("status", ["completed", "approved"])
        .maybeSingle();
      if (existing?.result_main_url) {
        return new Response(
          JSON.stringify({ status: "already_processed", job: existing }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Create/update job record
    const { data: job, error: jobErr } = await supabase
      .from("image_processing_jobs")
      .upsert({
        source_image_path,
        source_image_url,
        product_id: product_id ?? null,
        status: "processing",
        processed_at: null,
        error_message: null,
      }, { onConflict: "source_image_path" })
      .select()
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: jobErr?.message ?? "Failed to create job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Step 1: Fetch source image ─────────────────────────────────────────
    let rawBytes: Uint8Array;
    try {
      const res = await fetch(source_image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rawBytes = new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("image_processing_jobs").update({
        status: "failed", error_message: `Fetch failed: ${msg}`,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = detectMime(rawBytes);
    const slug = toSlug(
      seo_name ?? source_image_path.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "")
    );

    // ── Step 2: OpenAI enhancement ────────────────────────────────────────
    let masterBytes: Uint8Array;
    let masterMime: string;
    let masterPath: string;
    let processingMethod: string;
    let notes: string;

    const aiResult = await tryOpenAI(rawBytes, mime);

    if (aiResult) {
      masterBytes      = aiResult;
      masterMime       = "image/png";
      masterPath       = `${slug}_ai.png`;
      processingMethod = "openai_gpt_image";
      notes            = "Processed by OpenAI gpt-image-1: white background, studio lighting, packaging preserved.";
    } else {
      // OpenAI unavailable — store original, Supabase transform provides white padding
      masterBytes      = rawBytes;
      masterMime       = mime;
      masterPath       = `${slug}_orig.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
      processingMethod = "original";
      notes            = "OpenAI unavailable. Original image stored — white padding applied via Supabase transform.";
    }

    // ── Step 3: Upload master ─────────────────────────────────────────────
    let masterUrl: string;
    try {
      masterUrl = await uploadClean(supabase, masterPath, masterBytes, masterMime);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("image_processing_jobs").update({
        status: "failed", error_message: msg,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 4: Build size URLs via Supabase transform ────────────────────
    const thumbUrl  = transformUrl(masterUrl, 300);
    const mediumUrl = transformUrl(masterUrl, 800);
    const largeUrl  = transformUrl(masterUrl, 2000);
    const mainUrl   = mediumUrl;

    // ── Step 5: Update job ────────────────────────────────────────────────
    await supabase.from("image_processing_jobs").update({
      status:                "completed",
      result_main_url:       mainUrl,
      result_medium_url:     mediumUrl,
      result_large_url:      largeUrl,
      result_thumbnail_url:  thumbUrl,
      result_filename:       masterPath,
      seo_filename:          masterPath,
      bg_removal_method:     processingMethod,
      bg_removal_confidence: null,
      processing_notes:      notes,
      review_required:       false,
      processed_at:          new Date().toISOString(),
      error_message:         null,
    }).eq("id", job.id);

    // ── Step 6: Update product ────────────────────────────────────────────
    if (product_id) {
      await supabase.from("products").update({
        image_main:              mainUrl,
        image_thumbnail:         thumbUrl,
        image_medium:            mediumUrl,
        image_large:             largeUrl,
        image_clean_filename:    masterPath,
        image_processing_job_id: job.id,
        image_review_required:   false,
      }).eq("id", product_id);
    }

    return new Response(
      JSON.stringify({
        status:     "completed",
        job_id:     job.id,
        method:     processingMethod,
        urls:       { main: mainUrl, thumbnail: thumbUrl, medium: mediumUrl, large: largeUrl },
        filename:   masterPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-product-image] uncaught:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
