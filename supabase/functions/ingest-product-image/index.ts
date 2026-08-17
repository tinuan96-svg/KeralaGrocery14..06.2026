import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Categories mapping: keywords → category_id
const CATEGORY_MAP: Record<string, string> = {
  "snack|chip|crisp|biscuit|cookie|wafer|popcorn|fryum|papad|papadum": "c7e78bd5-fea5-43ec-bb7d-b7f3405daf44",
  "ready|instant|noodle|pasta|soup|meal|curry paste|masala paste": "7db8ad5a-9ca5-43b4-a7fd-0f76b6abe633",
  "tea|chai": "207bd931-b16b-44b0-acae-e1459da0691b",
  "dessert|sweet|halwa|payasam|kheer|pudding|ladoo|burfi|mithai": "c4d58b93-ea46-423f-84a9-e025feba7c35",
  "masala|spice mix|curry powder|garam masala|sambar|rasam|biryani masala|fish curry": "ef145412-79c5-4360-98cc-0efb44f5965e",
  "pepper|cumin|coriander|turmeric|cardamom|clove|cinnamon|fennel|mustard|fenugreek|star anise|bay leaf|dried ginger|chilli powder": "7f9cf242-0687-4640-aab8-dfe657486ca9",
  "pickle|chutney|jam|preserve|sauce|ketchup|vinegar": "43c52a7b-0440-4bf4-820d-9760e2ff67ff",
  "dal|lentil|bean|chickpea|pea|pulse|moong|chana|urad|toor": "5c22d9e2-4125-46af-9fb4-73e1faf24032",
  "salt|sugar|soy sauce|oyster sauce|fish sauce|tamarind|coconut milk|condiment": "1c49ca6c-5b4a-4004-a92f-1e2888d7bcf5",
  "rice|basmati|ponni|matta|jeerakasala": "024097d8-6eac-459c-8d4d-63bf7a89b57b",
  "fryum|appalam|vadam": "cdb41251-e172-437f-8b1b-f7d8740f5165",
  "cleaning|detergent|soap|shampoo|toothpaste|wash|liquid|hygiene|floor cleaner": "71aa5607-c7a8-4bbc-8442-1db41e9232b7",
  "flour|atta|maida|semolina|rava|suji|corn flour|gram flour|besan|powder": "8f7836d9-a3ec-4953-9f4f-ca6f69c4640e",
  "health|vitamin|supplement|ayurvedic|herbal|cream|lotion|moisturizer|personal care": "88ae2a58-d503-481a-b819-1d23e5710a08",
  "oil|ghee|butter|coconut oil|sunflower|mustard oil|palm oil": "08a2392b-edb5-47a4-9673-4dcec4875740",
};

// Brands mapping: brand name → brand_id
const BRAND_MAP: Record<string, string> = {
  "double horse": "40bb04e7-1734-41a8-812f-8080a609bc59",
  "melam": "71b4214b-8dda-4f63-b077-a21c815d4e53",
  "periyar": "94ea832e-ed57-4669-a56a-3a0399e0c7eb",
  "tasty nibbles": "f44bb6fe-fffb-4cc9-85d7-99944e5c8d38",
  "chakra": "c3eaa2a5-ffae-4c94-8237-59badfc32b68",
  "homely": "f24037fa-1358-4f78-a0b6-f7bc5df7f3eb",
  "malabar taste": "d8de7796-dd24-49f4-8bb0-aba34f3fa4e1",
  "ajmi": "315c5b92-bccd-417e-97fc-f87796ce4ee3",
  "maggi": "e0f39f0f-aac8-4f5a-82cb-1ba58714c622",
  "pringles": "857825d1-131b-4749-a87f-e6bb3062b935",
  "oreo": "1ac631ca-62af-4464-9a08-bb9242027063",
  "ariel": "cc4999fa-f9ba-4be4-a775-7bd1cd6c15ed",
  "bold": "810ca929-b930-43c6-8ef6-bfc28d3499ab",
  "britannia": "03fd075f-358b-41d7-8199-52d93992bb79",
  "brittania": "03fd075f-358b-41d7-8199-52d93992bb79",
  "nescafe": "15e43033-173b-46f9-8b04-86f230ebb74a",
  "aashirvaad": "0de3bd99-55b5-4dd4-922f-7b89d7150f70",
  "annapoorna": "f0f26bd1-60c8-4e53-b4df-57b56468b81c",
  "haldirams": "39871ab3-5fa5-4681-8274-3d347fbf7bf4",
  "natco": "c3f78572-18ec-4dcb-ad69-7bfdfbd2a890",
  "trs": "1538ec39-40a9-4864-932e-93a0aba4eb59",
  "tata salt": "5017f1b4-fceb-46a4-9606-c27f0afa2074",
  "tata tea": "ab452486-574e-4eff-9d40-673fa1007d41",
  "tetley": "8e12d699-1a3e-4264-8149-aaae3c14c918",
  "stf": "7afe90b1-0ade-47e2-84ff-5e8c0b3cf380",
  "ktc": "a6d12cbd-94c6-4cd3-a85e-33c9233e5e27",
  "pg tips": "be9dc81e-c5ef-4c5c-a17c-3232859c1f7a",
  "dove": "09e021d6-baed-4b14-bc28-a615770eac33",
  "dettol": "19a2f503-ba5a-45cd-afa2-df9617226d3d",
  "colgate": "d2c4a150-2b78-4c13-bfc0-e7736372f3f1",
  "shan": "bc513e2d-3ef0-4879-8751-46cb9a27344b",
  "rajah": "e223ab47-d636-4f6d-aef5-f44fa0e545a6",
  "sunfeast": "becb080a-acd9-4945-924e-a095eb6a29ee",
  "sakthi": "2ee3edd2-abc4-4728-8a9d-1d858f8be7d5",
};

const KERALAGROCERIES_STORE_ID = "a2e4d9f9-6b51-4071-97eb-decf72485b5a";
const POCKETGROCERY_STORE_ID = "17de3460-a9f4-4784-b669-d742642e15b2";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function detectCategoryId(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [pattern, id] of Object.entries(CATEGORY_MAP)) {
    const keywords = pattern.split("|");
    if (keywords.some((kw) => lower.includes(kw))) return id;
  }
  return null;
}

function detectBrandId(brandName: string): string | null {
  if (!brandName) return null;
  const lower = brandName.toLowerCase().trim();
  for (const [key, id] of Object.entries(BRAND_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  return null;
}

function detectStoreId(categoryText: string, brandText: string): string {
  const combined = `${categoryText} ${brandText}`.toLowerCase();
  // Kerala-specific products → KeralaGroceries
  const keralaKeywords = ["tasty nibbles", "melam", "double horse", "homely", "malabar taste", "chakra", "periyar", "ajmi", "stf", "kerala", "kappa", "puttu", "appam", "idiyappam", "matta", "pathiri"];
  if (keralaKeywords.some((k) => combined.includes(k))) return KERALAGROCERIES_STORE_ID;
  return KERALAGROCERIES_STORE_ID; // default to keralagroceries
}

async function generateUniqueSlug(supabase: ReturnType<typeof createClient>, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
}

async function checkDuplicate(supabase: ReturnType<typeof createClient>, productName: string): Promise<string | null> {
  // Simple fuzzy: check if a product with very similar name exists
  const words = productName.toLowerCase().split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return null;

  // Check for close match using trigram-like approach — query first 3 significant words
  const searchTerm = words.slice(0, 3).join(" ");
  const { data } = await supabase
    .from("products")
    .select("id, name")
    .ilike("name", `%${words[0]}%`)
    .eq("is_deleted", false)
    .limit(20);

  if (!data) return null;

  for (const p of data) {
    const existingWords = p.name.toLowerCase().split(" ").filter((w: string) => w.length > 3);
    const matchCount = words.filter((w) => existingWords.some((ew: string) => ew.includes(w) || w.includes(ew))).length;
    const similarity = matchCount / Math.max(words.length, existingWords.length);
    if (similarity >= 0.7) return p.id;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json() as { image_path: string; image_url: string; job_id?: string; store_id?: string };
    const { image_path, image_url, store_id } = body;

    if (!image_path || !image_url) {
      return new Response(JSON.stringify({ error: "image_path and image_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert job record as processing
    const { data: job, error: jobError } = await supabase
      .from("ingestion_jobs")
      .upsert({ image_path, image_url, status: "processing", store_id: store_id ?? KERALAGROCERIES_STORE_ID }, { onConflict: "image_path" })
      .select()
      .single();

    if (jobError) {
      return new Response(JSON.stringify({ error: jobError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI Vision API
    const openaiPayload = {
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image_url, detail: "low" },
            },
            {
              type: "text",
              text: `Analyze this grocery/food product image and extract information. Return ONLY valid JSON with these exact fields:
{
  "product_name": "clean product name without brand, e.g. 'Basmati Rice'",
  "brand": "brand name if visible, else null",
  "weight_size": "weight or size if visible, e.g. '500g', '1kg', '250ml', else null",
  "category": "one of: Snacks & Sweets, Ready to Eat, Tea, Desserts, Curry Masalas, Whole & Ground Spices, Pickles & Preserves, Pulses & Beans, Seasonings & Condiments, Rices, Fryums, Household & Cleaning, Flour & Grains, Health & Personal Care, Oils & Fats, Other",
  "full_name": "complete product name including brand, e.g. 'Double Horse Basmati Rice 500g'",
  "description": "1-2 sentence SEO-friendly product description for UK Indian grocery shoppers",
  "seo_keywords": "comma-separated keywords for UK shoppers, e.g. 'buy basmati rice uk, indian rice online uk'"
}
If the image is not a product or is unclear, return {"error": "not a product"}.`,
            },
          ],
        },
      ],
    };

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      await supabase.from("ingestion_jobs").update({
        status: "failed",
        error_message: `OpenAI error ${openaiRes.status}: ${errText.slice(0, 500)}`,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ error: "OpenAI API failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (handle markdown code fences)
    let extracted: Record<string, string | null>;
    try {
      const jsonStr = rawContent.replace(/```json\n?|\n?```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      await supabase.from("ingestion_jobs").update({
        status: "failed",
        raw_ai_response: openaiData,
        error_message: `Failed to parse AI response: ${rawContent.slice(0, 300)}`,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ error: "Failed to parse AI JSON", raw: rawContent }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (extracted.error) {
      await supabase.from("ingestion_jobs").update({
        status: "skipped",
        raw_ai_response: openaiData,
        extracted_data: extracted,
        error_message: extracted.error,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ status: "skipped", reason: extracted.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build full product name
    const brandText = extracted.brand ?? "";
    const fullName = extracted.full_name ||
      [brandText, extracted.product_name, extracted.weight_size].filter(Boolean).join(" ");

    // Check for duplicates
    const duplicateId = await checkDuplicate(supabase, fullName);
    if (duplicateId) {
      await supabase.from("ingestion_jobs").update({
        status: "duplicate",
        raw_ai_response: openaiData,
        extracted_data: extracted,
        product_id: duplicateId,
        error_message: `Duplicate of product ${duplicateId}`,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ status: "duplicate", existing_product_id: duplicateId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve IDs
    const categoryId = detectCategoryId(`${extracted.category ?? ""} ${extracted.product_name ?? ""} ${extracted.full_name ?? ""}`);
    const brandId = detectBrandId(brandText);
    const resolvedStoreId = store_id ?? detectStoreId(extracted.category ?? "", brandText);

    // Generate slug
    const baseSlug = slugify(fullName);
    const uniqueSlug = await generateUniqueSlug(supabase, baseSlug);

    // Build product record
    const productData = {
      name: fullName,
      slug: uniqueSlug,
      description: extracted.description ?? null,
      image_url: image_url,
      category_id: categoryId,
      brand_id: brandId,
      brand: brandText || null,
      price: 0,
      stock: 0,
      is_active: false, // inactive until reviewed
      review_required: true,
      ingestion_job_id: job.id,
      seo_title: extracted.full_name ?? fullName,
      seo_meta_title: `${fullName} | Kerala Grocery UK`,
      seo_meta_description: extracted.description ?? `Buy ${fullName} online. Authentic Indian groceries delivered across the UK.`,
      admin_notes: `Auto-ingested from ${image_path}. AI category: ${extracted.category ?? "unknown"}. Keywords: ${extracted.seo_keywords ?? ""}`,
    };

    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert(productData)
      .select("id, name, slug")
      .single();

    if (insertError) {
      await supabase.from("ingestion_jobs").update({
        status: "failed",
        raw_ai_response: openaiData,
        extracted_data: extracted,
        error_message: insertError.message,
        processed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return new Response(JSON.stringify({ error: "Product insert failed", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link to store via store_products
    await supabase.from("store_products").insert({
      store_id: resolvedStoreId,
      product_id: newProduct.id,
      is_active: false,
      image_override: null,
    });

    // Update job as completed
    await supabase.from("ingestion_jobs").update({
      status: "completed",
      raw_ai_response: openaiData,
      extracted_data: extracted,
      product_id: newProduct.id,
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(
      JSON.stringify({
        status: "completed",
        product: { id: newProduct.id, name: newProduct.name, slug: newProduct.slug },
        extracted,
      }),
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
