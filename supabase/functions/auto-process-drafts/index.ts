/**
 * auto-process-drafts
 *
 * Batch-processes draft products that are missing pricing, category, or descriptions.
 * For each eligible draft product:
 *   1. Pricing: Sets selling_price and price to supplier_price + 10% markup
 *   2. Category: Auto-assigns category by matching CentralHub category/sub_category/department
 *      against existing categories in the database (case-insensitive fuzzy match)
 *   3. Descriptions: Calls OpenAI to generate short description, full HTML description,
 *      SEO title, SEO description, and SEO keywords
 *
 * Products remain in draft status after processing — admin must still upload an image
 * and click Approve before the product appears on the storefront.
 *
 * Processes up to 10 products per invocation to stay within edge function time limits.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function applyMarkup(supplierPrice: number): number {
  return Math.ceil(supplierPrice * 1.10 * 10) / 10;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured. Please add it in Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check — admin user or service role
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    let isAuthorized = false;

    if (token === serviceKey) {
      isAuthorized = true;
    } else {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const { data: { user } } = await userClient.auth.getUser(token);
      if (user?.app_metadata?.is_admin === true) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load all categories for matching
    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug");

    if (catErr) {
      return new Response(
        JSON.stringify({ error: `Failed to load categories: ${catErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build normalized lookup: normalized name -> category id
    const catMap = new Map<string, string>();
    for (const c of categories ?? []) {
      catMap.set(normalize(c.name), c.id);
    }

    // 2. Fetch draft products that need processing (missing price, category, or descriptions)
    const { data: drafts, error: draftErr } = await supabase
      .from("products")
      .select("id, name, brand, source_brand, supplier_price, cost_price, selling_price, price, category_id, short_description, description, category, sub_category, main_category, department, unit, tags")
      .eq("approval_status", "draft")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(10);

    if (draftErr) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch drafts: ${draftErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!drafts || drafts.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No draft products to process.",
          processed: 0,
          pricesUpdated: 0,
          categoriesAssigned: 0,
          descriptionsGenerated: 0,
          errors: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pricesUpdated = 0;
    let categoriesAssigned = 0;
    let descriptionsGenerated = 0;
    let seoOptimized = 0;
    const errors: string[] = [];

    // 3. Process each draft product
    for (const product of drafts) {
      const updatePayload: Record<string, unknown> = {};
      let needsUpdate = false;
      let hasDescription = false;
      let hasSeo = false;

      // --- Pricing: apply 10% markup if selling price is missing or zero ---
      const supplierPrice = Number(product.supplier_price ?? product.cost_price ?? 0);
      if (supplierPrice > 0) {
        const currentSelling = Number(product.selling_price ?? product.price ?? 0);
        if (currentSelling <= 0) {
          const sellingPrice = applyMarkup(supplierPrice);
          updatePayload.supplier_price = supplierPrice;
          updatePayload.cost_price = supplierPrice;
          updatePayload.selling_price = sellingPrice;
          updatePayload.price = sellingPrice;
          needsUpdate = true;
          pricesUpdated++;
        }
      }

      // --- Category auto-assignment ---
      if (!product.category_id) {
        const candidates = [
          product.category,
          product.sub_category,
          product.main_category,
          product.department,
        ].filter((c): c is string => Boolean(c) && typeof c === "string");

        let matchedCatId: string | null = null;
        for (const candidate of candidates) {
          const norm = normalize(candidate);
          if (catMap.has(norm)) {
            matchedCatId = catMap.get(norm)!;
            break;
          }
        }

        if (matchedCatId) {
          updatePayload.category_id = matchedCatId;
          needsUpdate = true;
          categoriesAssigned++;
        }
      }

      // --- Description generation via OpenAI ---
      if (!product.short_description?.trim() || !product.description?.trim()) {
        try {
          const productName = product.name ?? "";
          const brand = product.brand ?? product.source_brand ?? "";
          const category = categories?.find((c) => c.id === updatePayload.category_id ?? product.category_id)?.name ?? "";
          const price = updatePayload.price ?? product.price;
          const priceStr = price ? `£${Number(price).toFixed(2)}` : "";
          const tags = Array.isArray(product.tags) ? product.tags.join(", ") : "";

          const weightMatch = productName.match(/\b(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|lb|oz|pc|pcs|pack|pieces?))\b/i);
          const weight = weightMatch ? weightMatch[0] : "";

          const contextBlock = [
            `Product Title: ${productName}`,
            brand ? `Brand: ${brand}` : "",
            category ? `Category: ${category}` : "",
            weight ? `Weight/Size: ${weight}` : "",
            priceStr ? `Price: ${priceStr}` : "",
            tags ? `Tags: ${tags}` : "",
          ].filter(Boolean).join("\n");

          const systemPrompt = `You are an expert ecommerce copywriter for a UK-based Kerala grocery store (keralagrocery.com).
You write product content that is:
- Optimised for Google Search and Google Merchant Center
- Targeted at UK-based South Indian / Kerala shoppers
- Natural, conversational, and benefit-focused
- Never keyword-stuffed
- Schema-friendly (for structured data)
- Unique per product

Always use British English spelling.`;

          const userPrompt = `Generate product content for the following product.

${contextBlock}

Return a JSON object with exactly these keys:
{
  "shortDescription": "20–40 word natural description, no HTML",
  "fullDescription": "300–700 word HTML description using <h2>, <h3>, <ul>, <li>, <p> only",
  "seoTitle": "50–60 character SEO title including brand and key product term",
  "seoDescription": "140–160 character meta description, benefit-focused, no keyword stuffing",
  "seoKeywords": "6–10 comma-separated keywords relevant to UK Kerala grocery shoppers"
}

Requirements for all fields:
- British English
- Targeted at UK Kerala / South Indian shoppers
- Google SEO and Google Merchant Center friendly
- Unique content per product
- Brand and category relevant

Return ONLY the JSON object. No markdown, no code fences, no extra text.`;

          const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 1500,
            }),
          });

          if (openAiRes.ok) {
            const openAiData = await openAiRes.json();
            const rawContent = openAiData.choices?.[0]?.message?.content ?? "";
            const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

            try {
              const parsed = JSON.parse(cleaned);
              if (parsed.shortDescription?.trim()) {
                updatePayload.short_description = parsed.shortDescription.trim();
                needsUpdate = true;
                hasDescription = true;
              }
              if (parsed.fullDescription?.trim()) {
                updatePayload.description = parsed.fullDescription.trim();
                needsUpdate = true;
                hasDescription = true;
              }
              if (parsed.seoTitle?.trim()) {
                updatePayload.seo_title = parsed.seoTitle.trim();
                needsUpdate = true;
                hasSeo = true;
              }
              if (parsed.seoDescription?.trim()) {
                updatePayload.seo_description = parsed.seoDescription.trim();
                needsUpdate = true;
                hasSeo = true;
              }
              if (parsed.seoKeywords?.trim()) {
                updatePayload.seo_keywords = parsed.seoKeywords.trim();
                needsUpdate = true;
                hasSeo = true;
              }
              if (hasDescription) descriptionsGenerated++;
              if (hasSeo) seoOptimized++;
            } catch {
              errors.push(`${product.name}: Failed to parse AI response as JSON`);
            }
          } else {
            const errText = await openAiRes.text().catch(() => "");
            errors.push(`${product.name}: OpenAI error ${openAiRes.status} — ${errText.slice(0, 100)}`);
          }
        } catch (err) {
          errors.push(`${product.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // --- Save updates to database ---
      if (needsUpdate) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("products")
          .update(updatePayload)
          .eq("id", product.id);

        if (updateErr) {
          errors.push(`${product.name}: Update failed — ${updateErr.message}`);
          if (hasDescription) descriptionsGenerated--;
          if (hasSeo) seoOptimized--;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Processed ${drafts.length} draft product(s). ${pricesUpdated} price(s) updated, ${categoriesAssigned} categor(ies) assigned, ${descriptionsGenerated} description(s) generated, ${seoOptimized} SEO optimized.`,
        processed: drafts.length,
        pricesUpdated,
        categoriesAssigned,
        descriptionsGenerated,
        seoOptimized,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
