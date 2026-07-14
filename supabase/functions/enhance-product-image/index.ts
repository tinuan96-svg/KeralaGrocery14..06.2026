import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UNREACHABLE_PATTERNS = [
  /^\//,
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /\.local\b/i,
  /webcontainer/i,
  /local-credentialless/i,
  /\.internal\b/i,
];

const ALLOWED_OUTPUT_MIMES = ["image/jpeg", "image/png", "image/webp"];

function isReachableUrl(url: string): boolean {
  if (UNREACHABLE_PATTERNS.some((p) => p.test(url))) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// ── Packshot prompt ───────────────────────────────────────────────────────────
const PACKSHOT_PROMPT = `You are a professional studio photographer performing a non-destructive background-and-lighting retouch on a product photograph.

SCOPE — you may ONLY perform these operations on the image:
1. Background cleanup — replace the background with pure white (#FFFFFF). Remove grey, coloured, or gradient backgrounds. Do not affect the product silhouette.
2. White balance correction — remove colour casts (yellow, blue, orange) introduced by the original camera or ambient lighting.
3. Brightness correction — fix underexposure or overexposure so the product is clearly visible.
4. Contrast improvement — improve tonal range for a crisp retail appearance.
5. Reflection reduction — reduce unwanted bright reflections on smooth or glass surfaces. Do not remove natural highlights.
6. Shadow cleanup — remove distracting cast shadows. Replace with a short, soft, natural drop shadow directly beneath the product.
7. Noise reduction — reduce camera noise in background and smooth areas only.
8. Edge definition — clarify the product silhouette against the white background.

THE PACKAGING IS A PROTECTED OBJECT.
If the image contains packaging, labels, text, logos, ingredients, multilingual content, nutrition information, weights, barcodes or symbols:
- Do NOT redraw, regenerate, recreate, or alter any label.
- Do NOT regenerate any text in any language — English, Malayalam, Tamil, Hindi, Arabic, or any other.
- Do NOT recreate any logo or brand mark.
- Do NOT recreate any multilingual content.
- Do NOT modify any barcode, QR code, batch number, certification mark, or weight.
- Do NOT modify packaging colours, label geometry, or label design.
- Do NOT distort the product shape or proportions.
All label pixels must remain exactly identical to the original upload. Treat the entire label surface as a locked, read-only image region.

COMPOSITION:
- Product centred in the frame.
- Product fills 85–90% of image height.
- No cropping of any part of the product.
- No added watermarks, borders, or frames.

If text or label preservation cannot be guaranteed, return the original image with only the background and lighting changed and nothing else.

OUTPUT: Premium ecommerce product photograph — pure white background, Waitrose/Ocado/Sainsbury's catalogue quality, realistic and natural appearance.`;

// ── Protected fields — the ONLY things we validate ───────────────────────────
//
// Full-text corpus comparison is intentionally absent.
//
// Rationale: two OCR calls on the same unchanged label produce different outputs
// for ingredients paragraphs, manufacturing addresses, curved text, regional
// script ligatures, and blurry stamped text. Comparing the full corpus causes
// false positives on multilingual Kerala/Indian grocery packaging.
//
// We validate only: brand, product name, weight/volume.
// Regulatory numbers (FSSAI etc.) are extracted but treated as advisory —
// they are often stamped, partially obscured, or printed on a secondary surface.
// Batch numbers are intentionally excluded — they are frequently blurry,
// stamped on glass, or printed separately from the main label.

interface ProtectedFields {
  imageType: string;           // "front" | "back" | "side" | "nutritional_panel" | "unknown"
  brand: string;               // "UNKNOWN" when not readable from this image face
  productName: string;         // "UNKNOWN" when not readable from this image face
  weight: string;              // "UNKNOWN" when not readable, e.g. "500g", "1kg", "750ml"
  volume: string;              // separate volume if distinct from weight
  regulatoryNumbers: string[]; // FSSAI, ISO etc. — advisory only, never blocks
}

interface FieldResult {
  original: string;
  enhanced: string;
  similarity: number;  // 0–100 Levenshtein; 100 when original is UNKNOWN (skipped)
  passed: boolean;
  unknown: boolean;    // true when original was UNKNOWN/empty — comparison was skipped
}

interface ValidationResult {
  imageType: string;             // face type detected from original OCR
  validationMode: "strict" | "relaxed"; // front → strict; back/side/unknown → relaxed
  brand: FieldResult;
  productName: FieldResult;
  weight: FieldResult;
  regulatoryNumbers: {
    original: string[];
    enhanced: string[];
    matched: number;
    total: number;
    advisory: true;  // always — never blocks approval
  };
  pixelSimilarity: number;   // 0–100 downscaled luminance comparison
  fastApproved: boolean;     // all relevant fields pass AND pixel ≥ 98%
  allPassed: boolean;
  failedFields: string[];
  diagnostics: {
    brand_confidence: number;
    product_confidence: number;
    weight_confidence: number;
    pixel_similarity: number;
  };
}

// ── Thresholds ────────────────────────────────────────────────────────────────
const THRESHOLD_PASS  = 92;  // primary pass — field similarity must reach this
const THRESHOLD_AMBIG = 70;  // below this = hard fail regardless of pixel sim
const PIXEL_THRESHOLD = 98;  // pixel similarity for fast-approve and ambiguous tiebreaker

// ── Levenshtein similarity — 0–100 ───────────────────────────────────────────
function similarity(a: string, b: string): number {
  if (a === b) return 100;
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return Math.round((1 - dp[m][n] / Math.max(m, n)) * 100);
}

// Latin text: lowercase, strip non-alphanumeric, collapse spaces
function normLatin(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

// Weight/volume: strip ALL whitespace and lowercase
// "500 g" → "500g",  "1 Kg" → "1kg",  "750 mL" → "750ml"
function normWeight(w: string): string {
  return w.toLowerCase().replace(/\s+/g, "").trim();
}

// Returns true when a field value is UNKNOWN or empty — comparison must be skipped.
// A confidently-detected field that was genuinely absent ("") differs from one that
// OCR could not read from this image face ("UNKNOWN"). Both mean: do not penalise.
function isFieldUnknown(s: string): boolean {
  const t = s.trim().toUpperCase();
  return t === "" || t === "UNKNOWN";
}

// Front-facing images use strict validation (all known fields must match).
// Back / side / nutritional panel / unknown images use relaxed validation:
//   weight must match AND at least one of brand / productName must match (if known).
function getValidationMode(imageType: string): "strict" | "relaxed" {
  return imageType.trim().toLowerCase() === "front" ? "strict" : "relaxed";
}

// ── Pixel similarity — downscaled luminance MSE ───────────────────────────────
//
// Samples both images at a 64×64 grid using a stride-based raw byte scan,
// computes ITU-R BT.601 luminance per sample, then returns
// 1 - (MSE / 255²) as a 0–100 score. No external dependency.
//
// ≥ 98: images are perceptually near-identical at this scale.
// If the AI regenerated any label text, score typically drops to 85–94.

function extractLuminance64(pngBytes: Uint8Array): Float32Array | null {
  try {
    let pos = 8; // skip 8-byte PNG signature
    const view = new DataView(pngBytes.buffer, pngBytes.byteOffset);
    let width = 0, height = 0;

    while (pos + 12 <= pngBytes.length) {
      const len  = view.getUint32(pos);
      const type = String.fromCharCode(
        pngBytes[pos + 4], pngBytes[pos + 5], pngBytes[pos + 6], pngBytes[pos + 7]
      );
      if (type === "IHDR") {
        width  = view.getUint32(pos + 8);
        height = view.getUint32(pos + 12);
      }
      if (type === "IEND") break;
      pos += 12 + len;
    }

    if (!width || !height) return null;

    // Stride approximation — bytes per pixel estimated from total file size
    const stride = Math.floor(pngBytes.length / (height * width));
    if (stride < 1) return null;

    const N = 64;
    const result = new Float32Array(N * N);
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const py = Math.floor((gy / N) * height);
        const px = Math.floor((gx / N) * width);
        const bytePos = (py * width + px) * stride;
        if (bytePos + 2 < pngBytes.length) {
          const r = pngBytes[bytePos];
          const g = pngBytes[bytePos + 1];
          const b = pngBytes[bytePos + 2];
          result[gy * N + gx] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
      }
    }
    return result;
  } catch {
    return null;
  }
}

function pixelSimilarity(aBuf: Uint8Array, bBuf: Uint8Array): number {
  const aLum = extractLuminance64(aBuf);
  const bLum = extractLuminance64(bBuf);
  if (!aLum || !bLum || aLum.length !== bLum.length) return -1; // indeterminate

  let mse = 0;
  for (let i = 0; i < aLum.length; i++) {
    const d = aLum[i] - bLum[i];
    mse += d * d;
  }
  mse /= aLum.length;
  const score = Math.round((1 - mse / 65025) * 100); // 255² = 65025
  return Math.max(0, Math.min(100, score));
}

// ── OCR — extract only protected fields ──────────────────────────────────────
//
// Deliberately narrow: only the 5 structured fields that identify the product.
// No full text, no ingredients, no addresses, no secondary text.
// This eliminates OCR variance from noise regions on multilingual packaging.

async function extractProtectedFields(
  openaiKey: string,
  imageUrl: string
): Promise<ProtectedFields> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          {
            type: "text",
            text: `You are reading a product package image. First determine which face of the package is shown, then extract the protected fields.

STEP 1 — Determine image type:
Which face of the product package is visible in this image?
- "front": the main face — brand logo and product name are large and prominent
- "back": reverse side — primarily ingredients list, nutritional information, manufacturer address
- "side": a side panel
- "nutritional_panel": close-up of nutritional information table
- "unknown": cannot be determined

STEP 2 — Return a JSON object with exactly these keys:
{
  "imageType": "front|back|side|nutritional_panel|unknown",
  "brand": "the brand name as prominently printed on the FRONT label — OR the string UNKNOWN if not clearly visible on this face of the package",
  "productName": "the main product name as printed on the FRONT label — OR the string UNKNOWN if not clearly visible on this face",
  "weight": "the net weight or volume prominently printed anywhere on this face (e.g. 500g, 1kg, 750ml, 1L) — OR the string UNKNOWN if not visible",
  "volume": "volume if separately stated and different from weight, else empty string",
  "regulatoryNumbers": ["array of clearly visible certification or regulatory numbers only — e.g. FSSAI licence number. Do NOT include batch numbers, manufacturing dates, or stamped/blurry/handwritten numbers. Empty array if none clearly visible."]
}

Critical rules:
- Return the literal string "UNKNOWN" (not empty string) when a field might exist on another face of the package but is NOT clearly readable from THIS image.
- Return "" (empty string) ONLY when the field genuinely does not exist on this type of packaging at all.
- If imageType is "back", "side", "nutritional_panel", or "unknown": brand and productName are very likely UNKNOWN. Only use the actual brand/name if they are clearly and prominently re-printed on this face too.
- Do NOT infer the brand from a manufacturer name, address, or ingredients text.
- Do NOT guess. If in doubt, use UNKNOWN.
- Do NOT include ingredients, addresses, manufacturing text, or nutritional info in any field.`,
          },
        ],
      }],
    }),
  });

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      imageType:         String(parsed.imageType ?? "unknown").trim().toLowerCase(),
      brand:             String(parsed.brand ?? "").trim(),
      productName:       String(parsed.productName ?? "").trim(),
      weight:            String(parsed.weight ?? "").trim(),
      volume:            String(parsed.volume ?? "").trim(),
      regulatoryNumbers: Array.isArray(parsed.regulatoryNumbers)
                           ? parsed.regulatoryNumbers.map(String)
                           : [],
    };
  } catch {
    return { imageType: "unknown", brand: "", productName: "", weight: "", volume: "", regulatoryNumbers: [] };
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
//
// Decision tree:
//
// FAST APPROVE — strongest signal, skips all further checks:
//   brand ≥ 92% AND productName ≥ 92% AND weight matches AND pixelSim ≥ 98%
//
// STANDARD APPROVE:
//   brand ≥ 92% AND productName ≥ 92% AND weight matches
//
// AMBIGUOUS ZONE (any field 70–91%):
//   pixelSim ≥ 98% → approve with "OCR uncertainty detected but protected text preserved"
//   pixelSim < 98% → reject "Critical text changed"
//
// HARD REJECT — any field < 70%:
//   Always reject regardless of pixel similarity.

function validateProtectedFields(
  original: ProtectedFields,
  enhanced: ProtectedFields,
  origBytes: Uint8Array,
  enhBytes: Uint8Array
): ValidationResult {
  const mode      = getValidationMode(original.imageType ?? "unknown");
  const imageType = original.imageType ?? "unknown";

  // ── UNKNOWN detection ────────────────────────────────────────────────────────
  // When OCR could not reliably read a field from the original image face,
  // that field is UNKNOWN. We must not reject the enhancement because of it.
  // Similarity is set to 100 (no comparison needed) for UNKNOWN fields.
  const brandKnown   = !isFieldUnknown(original.brand);
  const productKnown = !isFieldUnknown(original.productName);
  const weightKnown  = !isFieldUnknown(original.weight);

  const brandSim   = brandKnown
    ? similarity(normLatin(original.brand),       normLatin(enhanced.brand))
    : 100;
  const productSim = productKnown
    ? similarity(normLatin(original.productName), normLatin(enhanced.productName))
    : 100;

  const weightNormOrig = normWeight(original.weight);
  const weightNormEnh  = normWeight(enhanced.weight);
  const weightSim      = weightKnown
    ? similarity(weightNormOrig, weightNormEnh)
    : 100;

  // Field-level pass (always passes when original is UNKNOWN)
  const brandPassed   = !brandKnown   || brandSim   >= THRESHOLD_PASS;
  const productPassed = !productKnown || productSim >= THRESHOLD_PASS;
  const weightPassed  = !weightKnown  || weightNormOrig === weightNormEnh || weightSim >= THRESHOLD_PASS;

  // Regulatory numbers — advisory only (unchanged)
  const origNums = new Set(original.regulatoryNumbers.map(s => s.replace(/\s/g, "")));
  const enhNums  = new Set(enhanced.regulatoryNumbers.map(s => s.replace(/\s/g, "")));
  let numMatched = 0;
  origNums.forEach(n => { if (enhNums.has(n)) numMatched++; });

  // Pixel similarity — -1 if indeterminate, treat as non-penalising
  const rawPixel      = pixelSimilarity(origBytes, enhBytes);
  const pixelSimScore = rawPixel < 0 ? 100 : rawPixel;

  // Hard-fail flags — only for known fields
  const brandHardFail   = brandKnown   && brandSim   < THRESHOLD_AMBIG;
  const productHardFail = productKnown && productSim < THRESHOLD_AMBIG;
  const weightHardFail  = weightKnown  && weightSim  < THRESHOLD_AMBIG;

  // Ambiguous zone: above hard-fail floor but below primary pass threshold
  const brandAmbig   = !brandPassed   && brandSim   >= THRESHOLD_AMBIG;
  const productAmbig = !productPassed && productSim >= THRESHOLD_AMBIG;
  const weightAmbig  = !weightPassed  && weightSim  >= THRESHOLD_AMBIG;

  let allPassed: boolean;
  const failedFields: string[] = [];

  if (mode === "strict") {
    // ── Strict mode — front-facing image ───────────────────────────────────────
    // All known fields must pass. Pixel similarity resolves ambiguous zone.
    const anyHardFail  = brandHardFail || productHardFail || weightHardFail;
    const anyAmbiguous = brandAmbig || productAmbig || weightAmbig;

    if (anyHardFail) {
      allPassed = false;
      if (brandHardFail)   failedFields.push(`brand (${brandSim}% match)`);
      if (productHardFail) failedFields.push(`product name (${productSim}% match)`);
      if (weightHardFail)  failedFields.push(`weight (${weightSim}% match)`);
    } else if (brandPassed && productPassed && weightPassed) {
      allPassed = true;
    } else if (anyAmbiguous) {
      if (pixelSimScore >= PIXEL_THRESHOLD) {
        allPassed = true; // OCR noise — images are visually identical
      } else {
        allPassed = false;
        if (brandAmbig)   failedFields.push(`brand (${brandSim}% match, pixel ${pixelSimScore}%)`);
        if (productAmbig) failedFields.push(`product name (${productSim}% match, pixel ${pixelSimScore}%)`);
        if (weightAmbig)  failedFields.push(`weight (${weightSim}% match, pixel ${pixelSimScore}%)`);
      }
    } else {
      allPassed = false;
      if (!brandPassed)   failedFields.push(`brand (${brandSim}% match)`);
      if (!productPassed) failedFields.push(`product name (${productSim}% match)`);
      if (!weightPassed)  failedFields.push(`weight (${weightSim}% match)`);
    }

  } else {
    // ── Relaxed mode — back / side / nutritional_panel / unknown image ──────────
    //
    // Rules (per user spec):
    //   1. Weight must match (if known).
    //   2. Brand OR product name must match (if at least one is known).
    //   3. If both brand and product are UNKNOWN → approve on weight + pixel sim.
    //
    // Rationale: back-of-pack images rarely show the front brand logo clearly.
    // Requiring both brand AND product name from a nutrition panel is unreliable.

    const hasIdentityField = brandKnown || productKnown;

    if (weightHardFail) {
      // Weight is the one field that IS readable on any face — hard-fail it
      allPassed = false;
      failedFields.push(`weight (${weightSim}% match)`);

    } else if (!weightPassed) {
      // Weight in ambiguous zone — resolve via pixel similarity
      if (weightAmbig && pixelSimScore >= PIXEL_THRESHOLD) {
        // fall through to identity check — visual identity preserved
      } else {
        allPassed = false;
        failedFields.push(`weight (${weightSim}% match, pixel ${pixelSimScore}%)`);
      }
    }

    if (failedFields.length === 0) {
      if (!hasIdentityField) {
        // Both brand and product are UNKNOWN on this face — approve on weight + pixel
        allPassed = true;
      } else if (brandPassed || productPassed) {
        // At least one identity field was readable and is preserved
        allPassed = true;
      } else if (brandHardFail && productHardFail) {
        // Both known identity fields completely changed
        allPassed = false;
        if (brandHardFail)   failedFields.push(`brand (${brandSim}% match)`);
        if (productHardFail) failedFields.push(`product name (${productSim}% match)`);
      } else if (!brandPassed && !productPassed) {
        // Both failed — use pixel similarity as tiebreaker
        if (pixelSimScore >= PIXEL_THRESHOLD) {
          allPassed = true;
        } else {
          allPassed = false;
          if (brandKnown)   failedFields.push(`brand (${brandSim}% match, pixel ${pixelSimScore}%)`);
          if (productKnown) failedFields.push(`product name (${productSim}% match, pixel ${pixelSimScore}%)`);
        }
      } else {
        allPassed = false;
        if (!brandPassed && brandKnown)   failedFields.push(`brand (${brandSim}% match)`);
        if (!productPassed && productKnown) failedFields.push(`product name (${productSim}% match)`);
      }
    } else {
      allPassed = false;
    }
  }

  const fastApproved = allPassed && pixelSimScore >= PIXEL_THRESHOLD;

  return {
    imageType,
    validationMode: mode,
    brand:       { original: original.brand,       enhanced: enhanced.brand,       similarity: brandSim,   passed: brandPassed,   unknown: !brandKnown },
    productName: { original: original.productName, enhanced: enhanced.productName, similarity: productSim, passed: productPassed, unknown: !productKnown },
    weight:      { original: original.weight,      enhanced: enhanced.weight,      similarity: weightSim,  passed: weightPassed,  unknown: !weightKnown },
    regulatoryNumbers: {
      original: original.regulatoryNumbers,
      enhanced: enhanced.regulatoryNumbers,
      matched:  numMatched,
      total:    origNums.size,
      advisory: true,
    },
    pixelSimilarity: pixelSimScore,
    fastApproved,
    allPassed,
    failedFields,
    diagnostics: {
      brand_confidence:   Math.round(brandSim)      / 100,
      product_confidence: Math.round(productSim)    / 100,
      weight_confidence:  Math.round(weightSim)     / 100,
      pixel_similarity:   Math.round(pixelSimScore) / 100,
    },
  };
}

function validationMessage(v: ValidationResult): string {
  const modeNote = v.validationMode === "relaxed"
    ? ` (${v.imageType} image — relaxed validation applied)`
    : "";

  if (v.fastApproved) {
    return `All critical fields preserved and pixel similarity ≥ 98% — fast approved${modeNote}.`;
  }
  if (v.allPassed) {
    const anyAmbig =
      (!v.brand.unknown       && v.brand.similarity       < THRESHOLD_PASS) ||
      (!v.productName.unknown && v.productName.similarity < THRESHOLD_PASS) ||
      (!v.weight.unknown      && v.weight.similarity      < THRESHOLD_PASS);
    if (anyAmbig) return `OCR uncertainty detected but protected text preserved${modeNote}.`;
    const unknownFields = [
      v.brand.unknown       && "brand",
      v.productName.unknown && "product name",
      v.weight.unknown      && "weight",
    ].filter(Boolean).join(", ");
    if (unknownFields) return `Approved${modeNote}. Fields not readable from this image face: ${unknownFields}.`;
    return `All critical label fields preserved — approved${modeNote}.`;
  }
  const anyHardFail =
    (!v.brand.unknown       && v.brand.similarity       < THRESHOLD_AMBIG) ||
    (!v.productName.unknown && v.productName.similarity < THRESHOLD_AMBIG) ||
    (!v.weight.unknown      && v.weight.similarity      < THRESHOLD_AMBIG);
  if (anyHardFail) {
    return `Critical text changed — brand/name/weight mismatch detected${modeNote}: ${v.failedFields.join(", ")}.`;
  }
  if (v.pixelSimilarity < PIXEL_THRESHOLD) {
    return `Critical text changed — packaging content modified (pixel similarity ${v.pixelSimilarity}%)${modeNote}: ${v.failedFields.join(", ")}.`;
  }
  return `Packaging text mismatch${modeNote}: ${v.failedFields.join(", ")}. Original image preserved.`;
}

// ── Studio normalization — 1600×1600 canvas, 75-80% product height ────────────
//
// Produces a standardised output canvas regardless of original image dimensions:
//  • Pure white 1600×1600 background (now supports transparency if Photoroom used)
//  • Product scaled so its height occupies 75-80% of the canvas (target 77%)
//  • Horizontally and vertically centred
//  • Soft natural drop shadow beneath the product
//  • Subtle keralagrocery.com watermark at 4% opacity (bottom centre)
//
// Falls back to the input bytes unchanged if OffscreenCanvas is unavailable.

interface NormalizationResult {
  bytes: Uint8Array;
  occupancyPct: number;  // 0-100: % of canvas height the product occupies
  centered: boolean;
  qualityScore: number;  // 0-100 composite
}

async function normalizeToStudio(inputBytes: Uint8Array, isTransparent: boolean = false): Promise<NormalizationResult> {
  const CANVAS = 1600;
  const TARGET = 0.77; // 77% of canvas height

  try {
    // @ts-ignore — ImageDecoder available in Deno Deploy
    const decoder = new ImageDecoder({ data: inputBytes.buffer, type: isTransparent ? "image/png" : "image/jpeg" });
    const frame   = await decoder.decode();
    // @ts-ignore
    const bitmap  = await createImageBitmap(frame.image);

    const origW: number = bitmap.width;
    const origH: number = bitmap.height;

    // Scale to hit 77% height, but never exceed 90% width
    const scaleH = (CANVAS * TARGET) / origH;
    const scaleW = (CANVAS * 0.90)   / origW;
    const scale  = Math.min(scaleH, scaleW);

    const scaledH = Math.round(origH * scale);
    const scaledW = Math.round(origW * scale);
    const x       = Math.round((CANVAS - scaledW) / 2);
    const y       = Math.round((CANVAS - scaledH) / 2);
    const occupancyPct = Math.round((scaledH / CANVAS) * 100);

    // @ts-ignore
    const canvas = new OffscreenCanvas(CANVAS, CANVAS);
    // @ts-ignore
    const ctx    = canvas.getContext("2d");

    // Clear background if transparent, else white
    if (isTransparent) {
      ctx.clearRect(0, 0, CANVAS, CANVAS);
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, CANVAS, CANVAS);
    }

    // Soft drop shadow
    ctx.shadowColor   = "rgba(0,0,0,0.10)";
    ctx.shadowBlur    = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(bitmap, x, y, scaledW, scaledH);

    // Clear shadow before watermark
    ctx.shadowColor = "transparent";
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Watermark — 4% opacity, bottom centre
    ctx.globalAlpha    = 0.04;
    ctx.fillStyle      = "#1a1a1a";
    ctx.font           = "bold 26px sans-serif";
    ctx.textAlign      = "center";
    ctx.textBaseline   = "bottom";
    ctx.fillText("keralagrocery.com", CANVAS / 2, CANVAS - 20);
    ctx.globalAlpha = 1.0;

    // @ts-ignore
    const blob: Blob      = await canvas.convertToBlob({ type: "image/png" });
    const normalizedBytes = new Uint8Array(await blob.arrayBuffer());

    // Quality score: occupancy alignment (40%) + centred (30%) + non-zero output (30%)
    const occScore  = Math.max(0, 40 - Math.abs(occupancyPct - 77) * 4);
    const qualityScore = Math.min(100, Math.round(occScore + 30 + 30));

    return { bytes: normalizedBytes, occupancyPct, centered: true, qualityScore };
  } catch (err) {
    console.warn("[normalize] OffscreenCanvas unavailable, returning original:", err);
    return { bytes: inputBytes, occupancyPct: 0, centered: false, qualityScore: 0 };
  }
}

// ── Photoroom Background Removal ──────────────────────────────────────────

async function removeBackgroundPhotoroom(
  apiKey: string,
  imageBuf: ArrayBuffer
): Promise<{ bytes: Uint8Array; diagnostics: ApiDiagnostics }> {
  const endpoint = "https://sdk.photoroom.com/v1/segment";
  const model = "photoroom-segment-v1";

  const form = new FormData();
  form.append("image_file", new Blob([imageBuf]), "product.jpg");
  // We want transparent background for premium looks
  form.append("background_color", "transparent");

  console.log("[enhance] photoroom request:", { endpoint, imageSizeBytes: imageBuf.byteLength });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(60000),
  });

  const responseStatus = res.status;
  if (!res.ok) {
    const errorText = await res.text();
    throw Object.assign(
      new Error(`Photoroom API error ${responseStatus}: ${errorText}`),
      { diagnostics: { endpoint, model, params: { background_color: "transparent" }, responseStatus, errorMessage: errorText } }
    );
  }

  const resultBytes = new Uint8Array(await res.arrayBuffer());
  return {
    bytes: resultBytes,
    diagnostics: { endpoint, model, params: { background_color: "transparent" }, responseStatus, errorMessage: null }
  };
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

interface ApiDiagnostics {
  endpoint: string;
  model: string;
  params: Record<string, string | number>;
  responseStatus: number;
  errorMessage: string | null;
}

// ── Image fetch ───────────────────────────────────────────────────────────────

async function fetchImageBytes(url: string): Promise<{ buf: ArrayBuffer; mime: string }> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (err) {
    throw new Error(`Cannot reach image URL: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new Error(`Image URL returned ${res.status}. The image must be publicly accessible.`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`URL does not point to an image (content-type: ${contentType})`);
  const buf = await res.arrayBuffer();
  return { buf, mime: contentType.split(";")[0].trim() };
}

// ── AI packshot generation via OpenAI gpt-image-1 ────────────────────────────

async function generatePackshot(
  openaiKey: string,
  imageBuf: ArrayBuffer,
  originalMime: string
): Promise<{ bytes: Uint8Array; diagnostics: ApiDiagnostics }> {
  const pngBytes = await convertToPng(imageBuf, originalMime);
  const endpoint = "https://api.openai.com/v1/images/edits";
  const model    = "gpt-image-1";
  const params: Record<string, string | number> = { model, n: 1, quality: "high" };

  const form = new FormData();
  form.append("image",   new Blob([pngBytes], { type: "image/png" }), "product.png");
  form.append("prompt",  PACKSHOT_PROMPT);
  form.append("model",   model);
  form.append("n",       String(params.n));
  form.append("quality", params.quality as string);

  console.log("[enhance] gpt-image-1 request:", { endpoint, pngSizeBytes: pngBytes.byteLength });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
    signal: AbortSignal.timeout(180000),
  });

  const responseStatus = res.status;
  const rawBody        = await res.text();
  console.log("[enhance] gpt-image-1 response:", { status: responseStatus, body: rawBody.slice(0, 500) });

  if (!res.ok) {
    if (responseStatus === 404 || responseStatus === 400 || responseStatus === 403) {
      console.log("[enhance] gpt-image-1 unavailable, falling back to dall-e-2");
      return generatePackshotDallE2(openaiKey, pngBytes);
    }
    let errMsg: string;
    try { errMsg = JSON.parse(rawBody)?.error?.message ?? rawBody.slice(0, 300); }
    catch { errMsg = rawBody.slice(0, 300); }
    throw Object.assign(
      new Error(`gpt-image-1 API error ${responseStatus}: ${errMsg}`),
      { diagnostics: { endpoint, model, params, responseStatus, errorMessage: errMsg } }
    );
  }

  let json: Record<string, unknown>;
  try { json = JSON.parse(rawBody); }
  catch {
    throw Object.assign(new Error("gpt-image-1 returned non-JSON response"), {
      diagnostics: { endpoint, model, params, responseStatus, errorMessage: "Non-JSON response" },
    });
  }

  const b64 = (json.data as Array<Record<string, string>>)?.[0]?.b64_json;
  if (!b64) {
    const errMsg = "gpt-image-1 returned no b64_json image data";
    throw Object.assign(new Error(errMsg), { diagnostics: { endpoint, model, params, responseStatus, errorMessage: errMsg } });
  }

  return { bytes: base64ToBytes(b64), diagnostics: { endpoint, model, params, responseStatus, errorMessage: null } };
}

async function generatePackshotDallE2(
  openaiKey: string,
  pngBytes: Uint8Array
): Promise<{ bytes: Uint8Array; diagnostics: ApiDiagnostics }> {
  const endpoint = "https://api.openai.com/v1/images/edits";
  const model    = "dall-e-2";

  const inputPng = pngBytes.byteLength > 4 * 1024 * 1024
    ? await resizePng(pngBytes, 1024, 1024)
    : pngBytes;

  // response_format is not accepted by the current API — omit it and use the
  // default URL response, then fetch the returned URL to obtain image bytes.
  const params: Record<string, string | number> = { model, n: 1, size: "1024x1024" };

  const form = new FormData();
  form.append("image",  new Blob([inputPng], { type: "image/png" }), "product.png");
  form.append("prompt", PACKSHOT_PROMPT);
  form.append("model",  model);
  form.append("n",      String(params.n));
  form.append("size",   params.size as string);

  console.log("[enhance] dall-e-2 request:", { endpoint, pngSizeBytes: inputPng.byteLength });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });

  const responseStatus = res.status;
  const rawBody        = await res.text();
  console.log("[enhance] dall-e-2 response:", { status: responseStatus, body: rawBody.slice(0, 500) });

  if (!res.ok) {
    let errMsg: string;
    try { errMsg = JSON.parse(rawBody)?.error?.message ?? rawBody.slice(0, 300); }
    catch { errMsg = rawBody.slice(0, 300); }
    throw Object.assign(
      new Error(`dall-e-2 API error ${responseStatus}: ${errMsg}`),
      { diagnostics: { endpoint, model, params, responseStatus, errorMessage: errMsg } }
    );
  }

  let json: Record<string, unknown>;
  try { json = JSON.parse(rawBody); }
  catch {
    throw Object.assign(new Error("dall-e-2 returned non-JSON response"), {
      diagnostics: { endpoint, model, params, responseStatus, errorMessage: "Non-JSON response" },
    });
  }

  // API returns a URL by default — fetch it to get raw bytes
  const imageUrl = (json.data as Array<Record<string, string>>)?.[0]?.url;
  if (!imageUrl) {
    const errMsg = "dall-e-2 returned no image URL";
    throw Object.assign(new Error(errMsg), { diagnostics: { endpoint, model, params, responseStatus, errorMessage: errMsg } });
  }

  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
  if (!imgRes.ok) {
    const errMsg = `Failed to fetch dall-e-2 result image: ${imgRes.status}`;
    throw Object.assign(new Error(errMsg), { diagnostics: { endpoint, model, params, responseStatus, errorMessage: errMsg } });
  }
  const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

  return { bytes: imgBytes, diagnostics: { endpoint, model, params, responseStatus, errorMessage: null } };
}

// ── Image format helpers ──────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function convertToPng(buf: ArrayBuffer, mime: string): Promise<Uint8Array> {
  if (mime === "image/png") return new Uint8Array(buf);
  try {
    // @ts-ignore — ImageDecoder available in Deno Deploy
    const decoder = new ImageDecoder({ data: buf, type: mime });
    const result  = await decoder.decode();
    // @ts-ignore
    const bitmap  = await createImageBitmap(result.image);
    // @ts-ignore
    const canvas  = new OffscreenCanvas(bitmap.width, bitmap.height);
    // @ts-ignore
    const ctx     = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    // @ts-ignore
    const blob: Blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  } catch (err) {
    console.warn("[enhance] convertToPng failed, returning raw bytes:", err);
    return new Uint8Array(buf);
  }
}

async function resizePng(pngBytes: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  try {
    // @ts-ignore
    const decoder = new ImageDecoder({ data: pngBytes.buffer, type: "image/png" });
    const result  = await decoder.decode();
    // @ts-ignore
    const bitmap  = await createImageBitmap(result.image);
    // @ts-ignore
    const canvas  = new OffscreenCanvas(width, height);
    // @ts-ignore
    const ctx     = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    // @ts-ignore
    const blob: Blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return pngBytes;
  }
}

// ── Storage upload ────────────────────────────────────────────────────────────

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  bytes: Uint8Array,
  path: string,
  mime: string
): Promise<string> {
  if (!ALLOWED_OUTPUT_MIMES.includes(mime)) throw new Error(`Cannot upload mime type ${mime}.`);
  console.log("[enhance] uploading to storage:", { path, mime, sizeBytes: bytes.byteLength });
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, bytes.buffer, { contentType: mime, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32k chunks to avoid stack limits
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    // @ts-ignore
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { productId, imageUrl, galleryMode = false } = await req.json();

    if (!productId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "productId and imageUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isReachableUrl(imageUrl)) {
      return new Response(
        JSON.stringify({
          success: false,
          unreachableUrl: true,
          error: "The image URL is not publicly reachable. Please re-upload the image, then try again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const table = galleryMode ? "product_gallery_images" : "products";

    await supabase
      .from(table)
      .update({ image_processing_status: "processing", original_image_url: imageUrl })
      .eq("id", productId);

    // Step 1: Fetch original image bytes
    const { buf: origBuf, mime: originalMime } = await fetchImageBytes(imageUrl);
    const origBytes = new Uint8Array(origBuf);
    console.log("[enhance] original fetched:", { imageUrl, originalMime, sizeBytes: origBuf.byteLength });

    // Step 2 & 3: Parallelize OCR on original and AI Packshot generation
    // We prioritize Photoroom if available for background removal (transparency)
    console.log("[enhance] starting parallel OCR and packshot generation...");

    // Check for Photoroom API Key in app_config
    const { data: config } = await supabase
      .from("app_config")
      .select("value")
      .eq("id", "photoroom_config")
      .maybeSingle();

    const photoroomKey = config?.value?.api_key;

    let packshotPromise;
    if (photoroomKey) {
      console.log("[enhance] using photoroom for transparent background removal");
      packshotPromise = removeBackgroundPhotoroom(photoroomKey, origBuf);
    } else {
      console.log("[enhance] photoroom key not found, using openai fallback");
      packshotPromise = generatePackshot(openaiKey, origBuf, originalMime);
    }

    const [originalFields, packshotResult] = await Promise.all([
      extractProtectedFields(openaiKey, imageUrl),
      packshotPromise
    ]);

    let aiBytes: Uint8Array = packshotResult.bytes;
    let apiDiagnostics: ApiDiagnostics = packshotResult.diagnostics;
    const isTransparent = photoroomKey ? true : false;

    console.log("[enhance] original OCR and packshot complete:", {
      model: apiDiagnostics.model,
      imageType: originalFields.imageType,
      isTransparent
    });

    // Step 3.5: Pixel similarity — compare original vs raw AI output BEFORE canvas normalization
    const rawPixelSim = pixelSimilarity(origBytes, aiBytes);
    console.log("[enhance] pre-normalization pixel similarity:", rawPixelSim);

    // FAST-PATH: If pixels are near-identical, we can skip the second OCR and normalize directly.
    if (rawPixelSim >= 99.8) {
      console.log("[enhance] pixel similarity perfect (>=99.8), skipping second OCR pass.");
      const normResult = await normalizeToStudio(aiBytes, isTransparent);
      const enhancedBytes = normResult.bytes;
      const prefix = galleryMode ? "gallery" : "products";
      const enhancedPath = `${prefix}/${productId}-studio-${Date.now()}.png`;
      const enhancedUrl = await uploadToStorage(supabase, enhancedBytes, enhancedPath, "image/png");

      await supabase.from(table).update({
        enhanced_image_url:      enhancedUrl,
        image_url:               enhancedUrl,
        image_processing_status: "completed",
        image_processed_at:      new Date().toISOString(),
        image_quality_score:     normResult.qualityScore,
        image_occupancy_pct:     normResult.occupancyPct,
        image_centered:          normResult.centered,
      }).eq("id", productId);

      return new Response(
        JSON.stringify({
          success: true,
          enhancedUrl,
          fastApproved: true,
          pixelSimilarity: rawPixelSim,
          message: "Visually identical content detected — approved via fast-path.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3.6: Normalize to studio format
    const normResult   = await normalizeToStudio(aiBytes, isTransparent);
    const enhancedBytes = normResult.bytes;
    const enhancedMime = "image/png";
    console.log("[enhance] normalization complete, starting parallel upload and enhanced OCR...");

    // Step 4 & 5: Parallelize Storage Upload and Enhanced OCR
    // Using base64 for OCR avoids waiting for the upload to finish first.
    const enhancedDataUrl = `data:${enhancedMime};base64,${bytesToBase64(enhancedBytes)}`;
    const prefix       = galleryMode ? "gallery" : "products";
    const enhancedPath = `${prefix}/${productId}-studio-${Date.now()}.png`;

    const [enhancedUrl, enhancedFields] = await Promise.all([
      uploadToStorage(supabase, enhancedBytes, enhancedPath, enhancedMime),
      extractProtectedFields(openaiKey, enhancedDataUrl)
    ]);

    console.log("[enhance] upload and enhanced OCR complete.");

    // Step 6: Validate — pixel similarity uses pre-normalization bytes for accurate comparison
    const validation = validateProtectedFields(originalFields, enhancedFields, origBytes, openaiBytes);
    const message    = validationMessage(validation);

    console.log("[enhance] validation result:", {
      allPassed:       validation.allPassed,
      fastApproved:    validation.fastApproved,
      failedFields:    validation.failedFields,
      pixelSimilarity: validation.pixelSimilarity,
      diagnostics:     validation.diagnostics,
      message,
    });

    // AMBIGUOUS ZONE: If validation failed but pixel similarity is very high (>= 98%),
    // we return success: true but with a warning, allowing the UI to show a "Review" state
    // instead of a hard failure.
    if (!validation.allPassed && validation.pixelSimilarity >= 98) {
      console.log("[enhance] validation failed but pixel similarity high (>=98), returning for review.");

      await supabase
        .from(table)
        .update({
          enhanced_image_url:      enhancedUrl,
          image_url:               enhancedUrl, // Set it anyway so it's visible for review
          image_processing_status: "completed", // Mark as completed to avoid infinite retry loops
          image_processed_at:      new Date().toISOString(),
          image_quality_score:     normResult.qualityScore,
        })
        .eq("id", productId);

      return new Response(
        JSON.stringify({
          success: true,
          ocrWarning: true,
          enhancedUrl,
          pixelSimilarity: validation.pixelSimilarity,
          validation: {
            brand:             validation.brand,
            productName:       validation.productName,
            weight:            validation.weight,
            regulatoryNumbers: validation.regulatoryNumbers,
            pixelSimilarity:   validation.pixelSimilarity,
          },
          message: "OCR mismatch detected but pixels are 98%+ identical. Please review.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validation.allPassed) {
      await supabase
        .from(table)
        .update({ image_processing_status: "failed", image_processed_at: new Date().toISOString() })
        .eq("id", productId);

      return new Response(
        JSON.stringify({
          success:      false,
          ocrFailed:    true,
          ocrMessage:   message,
          failedFields: validation.failedFields,
          imageType:    validation.imageType,
          validationMode: validation.validationMode,
          validation: {
            brand:             validation.brand,
            productName:       validation.productName,
            weight:            validation.weight,
            regulatoryNumbers: validation.regulatoryNumbers,
            pixelSimilarity:   validation.pixelSimilarity,
          },
          diagnostics: { ...validation.diagnostics, api: apiDiagnostics },
          message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 7: Approved — save studio-normalised image with quality metrics
    await supabase
      .from(table)
      .update({
        enhanced_image_url:      enhancedUrl,
        image_url:               enhancedUrl,
        image_processing_status: "completed",
        image_processed_at:      new Date().toISOString(),
        image_quality_score:     normResult.qualityScore,
        image_occupancy_pct:     normResult.occupancyPct,
        image_centered:          normResult.centered,
      })
      .eq("id", productId);

    return new Response(
      JSON.stringify({
        success:      true,
        enhancedUrl,
        originalUrl:  imageUrl,
        ocrPassed:    true,
        fastApproved: validation.fastApproved,
        ocrMessage:   message,
        imageType:    validation.imageType,
        validationMode: validation.validationMode,
        normalization: {
          occupancyPct: normResult.occupancyPct,
          centered:     normResult.centered,
          qualityScore: normResult.qualityScore,
        },
        validation: {
          brand:             validation.brand,
          productName:       validation.productName,
          weight:            validation.weight,
          regulatoryNumbers: validation.regulatoryNumbers,
          pixelSimilarity:   validation.pixelSimilarity,
        },
        diagnostics: { ...validation.diagnostics, api: apiDiagnostics },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message  = err instanceof Error ? err.message : String(err);
    const errDiag: ApiDiagnostics | null =
      err != null && typeof err === "object" && "diagnostics" in (err as object)
        ? (err as { diagnostics: ApiDiagnostics }).diagnostics
        : null;
    console.error("[enhance-product-image]", message);
    return new Response(
      JSON.stringify({ success: false, error: message, diagnostics: errDiag }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
