import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Sharp from "npm:sharp@0.33.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CANVAS_SIZE = 1200;
// Product fills 80% of canvas height — within the 75-85% occupancy requirement
const PRODUCT_HEIGHT_RATIO = 0.80;
const WATERMARK_TEXT = "KeralaGroceries.com";

// Output sizes: [width, suffix, quality]
const OUTPUT_SIZES: [number, string, number][] = [
  [1200, "xl",  88],  // Master
  [600,  "lg",  85],  // Catalog
  [400,  "md",  82],  // Mobile
  [200,  "sm",  78],  // Thumbnail
];

interface ProcessRequest {
  product_id: string;
  image_url: string;
  triggered_by?: string;
}

// ── Extended quality metrics ──────────────────────────────────────────────────
interface QualityDetails {
  sharpness:            number;  // 0-100  fine detail via luminance stdev
  exposure:             number;  // 0-100  mean luminance proximity to ideal
  background:           number;  // 0-100  background whiteness/cleanliness
  centering:            number;  // 0-100  always high (programmatic centering)
  readability:          number;  // 0-100  entropy proxy for label legibility
  packaging_visibility: number;  // 0-100  contrast / product coverage
  overall:              number;  // 0-100  weighted composite
  resolution:           number;  // 0-100  pixel count vs ideal
}

function computeQualityScore(stats: Sharp.Stats, metadata: Sharp.Metadata): QualityDetails {
  const channels = stats.channels;

  // Sharpness: luminance stdev
  const luma = channels.length >= 3
    ? 0.299 * channels[0].stdev + 0.587 * channels[1].stdev + 0.114 * channels[2].stdev
    : channels[0].stdev;
  const sharpness = Math.min(100, Math.round((luma / 55) * 100));

  // Exposure: mean luminance vs ideal 128
  const lumaMean = channels.length >= 3
    ? 0.299 * channels[0].mean + 0.587 * channels[1].mean + 0.114 * channels[2].mean
    : channels[0].mean;
  const exposure = Math.max(0, Math.round(100 - (Math.abs(lumaMean - 128) / 128) * 100));

  // Background quality: high mean channel value = clean white bg
  const maxMean = Math.max(...channels.slice(0, 3).map((c) => c.mean));
  const background = Math.min(100, Math.round((maxMean / 235) * 100));

  // Centering: always high since we center programmatically
  const centering = 95;

  // Readability: image entropy proxy (higher = more label detail)
  // Sharp entropy range: 0 (uniform) → ~8 (maximum)
  const readability = Math.min(100, Math.round(((stats.entropy ?? 5) / 7.5) * 100));

  // Packaging visibility: channel contrast range (product coverage proxy)
  const avgRange = channels.slice(0, 3).reduce((s, c) => s + (c.max - c.min), 0) / 3;
  const packaging_visibility = Math.min(100, Math.round((avgRange / 220) * 100));

  // Resolution
  const pixels = (metadata.width ?? 0) * (metadata.height ?? 0);
  const resolution = Math.min(100, Math.round((pixels / (CANVAS_SIZE * CANVAS_SIZE)) * 100));

  const overall = Math.round(
    sharpness            * 0.25 +
    exposure             * 0.20 +
    background           * 0.15 +
    centering            * 0.10 +
    readability          * 0.15 +
    packaging_visibility * 0.10 +
    resolution           * 0.05
  );

  return { sharpness, exposure, background, centering, readability, packaging_visibility, overall, resolution };
}

// ── Watermark SVG ─────────────────────────────────────────────────────────────
function buildWatermarkBuffer(size: number): Buffer {
  const fs = Math.round(size * 0.020);
  const pad = Math.round(size * 0.018);
  const approxW = WATERMARK_TEXT.length * fs * 0.55;
  const x = size - approxW - pad;
  const y = size - Math.round(fs * 1.6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold"
      fill="rgba(0,0,0,0.10)" text-anchor="start">${WATERMARK_TEXT}</text>
  </svg>`;
  return Buffer.from(svg);
}

// ── Soft drop shadow beneath product ─────────────────────────────────────────
function buildShadowBuffer(
  productW: number,
  productH: number,
  offsetX: number,
  offsetY: number,
  size: number
): Buffer {
  const rx = Math.round(productW * 0.42);
  const ry = Math.max(8, Math.round(productH * 0.025));
  const cx = offsetX + Math.round(productW / 2);
  const cy = offsetY + productH + ry;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="sh" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(0,0,0,0.28)"/>
        <stop offset="65%" stop-color="rgba(0,0,0,0.10)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh)"/>
  </svg>`;
  return Buffer.from(svg);
}

// ── Studio lighting gradient (subtle centre highlight) ────────────────────────
function buildLightingBuffer(size: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="lg" cx="50%" cy="32%" r="58%">
        <stop offset="0%"   stop-color="rgba(255,255,255,0.16)"/>
        <stop offset="55%"  stop-color="rgba(255,255,255,0.05)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#lg)"/>
  </svg>`;
  return Buffer.from(svg);
}

// ── Fetch image ───────────────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "KeralaGroceries-ImagePipeline/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Main processing pipeline ──────────────────────────────────────────────────
async function processImage(inputBuffer: Buffer): Promise<{
  outputs: Map<string, Buffer>;
  qualityBefore: QualityDetails;
  qualityAfter: QualityDetails;
}> {
  const inputSharp = Sharp(inputBuffer);
  const [metaBefore, statsBefore] = await Promise.all([inputSharp.metadata(), inputSharp.stats()]);
  const qualityBefore = computeQualityScore(statsBefore, metaBefore);

  // 1. Trim near-white / near-transparent borders to isolate product
  //    threshold=20 matches pixels within 20 of the corner pixel value
  let trimmedBuffer: Buffer;
  try {
    trimmedBuffer = await Sharp(inputBuffer)
      .trim({ threshold: 20 })
      .toFormat("png")
      .toBuffer();
  } catch {
    // Some images can't be trimmed (e.g., already transparent) — fall back
    trimmedBuffer = await Sharp(inputBuffer).toFormat("png").toBuffer();
  }

  const trimMeta = await Sharp(trimmedBuffer).metadata();
  const origW = trimMeta.width ?? metaBefore.width ?? CANVAS_SIZE;
  const origH = trimMeta.height ?? metaBefore.height ?? CANVAS_SIZE;

  // 2. Scale product to fill PRODUCT_HEIGHT_RATIO of canvas
  //    withoutEnlargement: false = small products scaled UP to fill canvas
  const targetH = Math.round(CANVAS_SIZE * PRODUCT_HEIGHT_RATIO);
  const scale = targetH / origH;
  const targetW = Math.min(CANVAS_SIZE, Math.round(origW * scale));

  // 3. Enhance product: mild sharpening + slight saturation boost
  const productProcessed = await Sharp(trimmedBuffer)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .modulate({ saturation: 1.06, brightness: 1.02 })
    .sharpen({ sigma: 0.6, m1: 0.4, m2: 2.5 })
    .toFormat("png")
    .toBuffer();

  // Actual resized dims (fit: inside may be smaller than targetW×targetH)
  const productMeta = await Sharp(productProcessed).metadata();
  const actualW = productMeta.width ?? targetW;
  const actualH = productMeta.height ?? targetH;

  const offsetX = Math.round((CANVAS_SIZE - actualW) / 2);
  const offsetY = Math.round((CANVAS_SIZE - actualH) / 2);

  // 4. Build overlays
  const shadowBuffer   = buildShadowBuffer(actualW, actualH, offsetX, offsetY, CANVAS_SIZE);
  const lightingBuffer = buildLightingBuffer(CANVAS_SIZE);
  const watermarkBuffer = buildWatermarkBuffer(CANVAS_SIZE);

  // 5. Composite: transparent canvas → shadow → product → lighting → watermark
  // Changed to channels: 4 and transparent background to support premium "floating" look
  const composited = await Sharp({
    create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadowBuffer,   top: 0,       left: 0 },
      { input: productProcessed, top: offsetY, left: offsetX },
      { input: lightingBuffer, top: 0,       left: 0 },
      { input: watermarkBuffer, top: 0,      left: 0 },
    ])
    .toFormat("png")
    .toBuffer();

  // 6. Quality of final composite
  const [metaAfter, statsAfter] = await Promise.all([
    Sharp(composited).metadata(),
    Sharp(composited).stats(),
  ]);
  const qualityAfter = computeQualityScore(statsAfter, metaAfter);

  // 7. Generate all WebP output sizes
  const outputs = new Map<string, Buffer>();
  for (const [size, suffix, quality] of OUTPUT_SIZES) {
    const buf = await Sharp(composited)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();
    outputs.set(suffix, buf);
  }

  return { outputs, qualityBefore, qualityAfter };
}

// ── HTTP handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startMs = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ProcessRequest = await req.json();
    const { product_id, image_url, triggered_by } = body;

    if (!product_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "product_id and image_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: job, error: jobErr } = await supabase
      .from("image_processing_jobs")
      .insert({
        product_id,
        triggered_by: triggered_by ?? null,
        processing_method: "standard_pipeline",
        status: "processing",
        input_image_url: image_url,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to create processing job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jobId: string = job.id;

    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const inputBuffer = await fetchImageBuffer(image_url);
          const { outputs, qualityBefore, qualityAfter } = await processImage(inputBuffer);

          const bucket = "product-images";
          const uploadedUrls: Record<string, string> = {};

          for (const [suffix, buf] of outputs.entries()) {
            const path = `processed/${product_id}/${suffix}.webp`;
            const { error: uploadErr } = await supabase.storage
              .from(bucket)
              .upload(path, buf, { contentType: "image/webp", upsert: true });
            if (uploadErr) { console.error(`Upload ${suffix} failed:`, uploadErr); continue; }
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            uploadedUrls[suffix] = urlData.publicUrl;
          }

          const primaryUrl = uploadedUrls["xl"] ?? uploadedUrls["lg"] ?? image_url;
          const durationMs = Date.now() - startMs;

          await supabase
            .from("products")
            .update({
              image_url: primaryUrl,
              image_quality_score: qualityAfter.overall,
              processing_method: "standard_pipeline",
              updated_at: new Date().toISOString(),
            })
            .eq("id", product_id);

          await supabase
            .from("image_processing_jobs")
            .update({
              status: "completed",
              quality_score_before: qualityBefore.overall,
              quality_score_after: qualityAfter.overall,
              quality_details: qualityAfter,
              output_image_url: primaryUrl,
              duration_ms: durationMs,
              completed_at: new Date().toISOString(),
            })
            .eq("id", jobId);
        } catch (err) {
          console.error("Pipeline error:", err);
          await supabase
            .from("image_processing_jobs")
            .update({
              status: "failed",
              error_message: err instanceof Error ? err.message : String(err),
              duration_ms: Date.now() - startMs,
              completed_at: new Date().toISOString(),
            })
            .eq("id", jobId);
        }
      })()
    );

    return new Response(
      JSON.stringify({ success: true, job_id: jobId, message: "Processing started" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
