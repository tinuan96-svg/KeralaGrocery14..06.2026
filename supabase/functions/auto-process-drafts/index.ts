/**
 * auto-process-drafts
 *
 * Batch-processes draft products that are missing pricing, category, or descriptions.
 * Processes up to 30 products per invocation to stay within edge function time limits.
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
  if (!s) return "";
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
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

    const catMap = new Map<string, string>();
    for (const c of categories ?? []) {
      catMap.set(normalize(c.name), c.id);
    }

    // 2. Fetch draft products that need processing
    // Corrected column names: subcategory instead of sub_category
    const { data: drafts, error: draftErr } = await supabase
      .from("products")
      .select("id, name, brand, source_brand, supplier_price, cost_price, selling_price, price, category_id, short_description, description, category, subcategory, department, unit, tags")
      .eq("approval_status", "draft")
      .eq("is_deleted", false)
      .or("category_id.is.null,short_description.is.null,description.is.null,price.eq.0,selling_price.is.null,selling_price.eq.0")
      .order("updated_at", { ascending: true })
      .limit(30);

    if (draftErr) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch drafts: ${draftErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!drafts || drafts.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No draft products to process.", processed: 0, pricesUpdated: 0, categoriesAssigned: 0, descriptionsGenerated: 0, seoOptimized: 0, errors: [] }),
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
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      let changed = false;

      // --- Pricing: 10% markup if price/selling_price is missing ---
      const supPrice = Number(product.supplier_price ?? product.cost_price ?? 0);
      const curPrice = Number(product.selling_price ?? product.price ?? 0);
      if (supPrice > 0 && curPrice <= 0) {
        const markedUp = applyMarkup(supPrice);
        updatePayload.supplier_price = supPrice;
        updatePayload.cost_price = supPrice;
        updatePayload.selling_price = markedUp;
        updatePayload.price = markedUp;
        pricesUpdated++;
        changed = true;
      }

      // --- Category Matching ---
      if (!product.category_id) {
        const candidates = [product.category, product.subcategory, product.department].filter(Boolean);
        for (const candidate of candidates) {
          const norm = normalize(candidate);
          if (catMap.has(norm)) {
            updatePayload.category_id = catMap.get(norm);
            categoriesAssigned++;
            changed = true;
            break;
          }
          // Try partial match if no exact match
          for (const [catNorm, catId] of catMap.entries()) {
            if (norm.includes(catNorm) || catNorm.includes(norm)) {
              updatePayload.category_id = catId;
              categoriesAssigned++;
              changed = true;
              break;
            }
          }
          if (updatePayload.category_id) break;
        }
      }

      // --- OpenAI Description Generation ---
      if (openAiKey && (!product.short_description?.trim() || !product.description?.trim())) {
        try {
          const categoryName = categories?.find(c => c.id === (updatePayload.category_id || product.category_id))?.name ?? "";
          const priceStr = (updatePayload.price || product.price) ? `£${(updatePayload.price || product.price).toFixed(2)}` : "";

          const context = `Product: ${product.name}\nBrand: ${product.brand || product.source_brand || ""}\nCategory: ${categoryName}\nPrice: ${priceStr}`;

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are an expert ecommerce copywriter for a UK Kerala grocery store. Return ONLY a JSON object with keys: shortDescription, fullDescription, seoTitle, seoDescription, seoKeywords. Use British English." },
                { role: "user", content: `Generate content for:\n${context}` }
              ],
              temperature: 0.7
            })
          });

          if (res.ok) {
            const aiData = await res.json();
            const content = aiData.choices?.[0]?.message?.content ?? "";
            const jsonStr = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            const parsed = JSON.parse(jsonStr);

            // Handle various possible key formats from AI
            const getVal = (keys: string[]) => {
              for (const k of keys) {
                if (parsed[k]) return parsed[k];
                // Case insensitive check
                const match = Object.keys(parsed).find(pk => pk.toLowerCase() === k.toLowerCase());
                if (match) return parsed[match];
              }
              return null;
            };

            const sd = getVal(['shortDescription', 'short_description']);
            const fd = getVal(['fullDescription', 'description', 'full_description']);
            const st = getVal(['seoTitle', 'seo_title']);
            const sdes = getVal(['seoDescription', 'seo_description']);
            const sk = getVal(['seoKeywords', 'seo_keywords']);

            if (sd) { updatePayload.short_description = sd; changed = true; }
            if (fd) { updatePayload.description = fd; changed = true; }
            if (st) { updatePayload.seo_title = st; changed = true; }
            if (sdes) { updatePayload.seo_description = sdes; changed = true; }
            if (sk) { updatePayload.seo_keywords = sk; changed = true; }

            if (sd || fd) descriptionsGenerated++;
            if (st || sdes || sk) seoOptimized++;
          } else {
            errors.push(`${product.name}: OpenAI error ${res.status}`);
          }
        } catch (e) {
          errors.push(`${product.name}: AI parsing failed`);
        }
      }

      // Always update at least updated_at to rotate the queue
      await supabase.from("products").update(updatePayload).eq("id", product.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
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
