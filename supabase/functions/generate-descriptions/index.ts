import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  productId: string;
  mode: "short" | "full" | "both";
}

interface GeneratedContent {
  shortDescription?: string;
  fullDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
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

    // Auth check — admin only
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authErr || !user || user.app_metadata?.is_admin !== true) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateRequest = await req.json();
    const { productId, mode } = body;

    if (!productId || !mode) {
      return new Response(
        JSON.stringify({ error: "productId and mode are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch product + related data
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, price, brand, source_brand, tags, categories(name)")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) {
      console.error("[generate-descriptions] product fetch error:", pErr, "productId:", productId);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productName = product.name ?? "";
    const brand = (product.brand as string | null) ?? (product.source_brand as string | null) ?? "";
    const category = (product.categories as any)?.name ?? "";
    const price = product.price ? `£${Number(product.price).toFixed(2)}` : "";
    const tags = Array.isArray(product.tags) ? product.tags.join(", ") : "";

    // Extract weight/size from name (e.g. "500g", "1kg", "2L")
    const weightMatch = productName.match(/\b(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|lb|oz|pc|pcs|pack|pieces?))\b/i);
    const weight = weightMatch ? weightMatch[0] : "";

    const contextBlock = [
      `Product Title: ${productName}`,
      brand ? `Brand: ${brand}` : "",
      category ? `Category: ${category}` : "",
      weight ? `Weight/Size: ${weight}` : "",
      price ? `Price: ${price}` : "",
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

    let userPrompt = "";

    if (mode === "short") {
      userPrompt = `Generate a SHORT DESCRIPTION for the following product.

${contextBlock}

Requirements:
- 20–40 words
- Natural, engaging language
- Mention the brand if relevant
- Mention the category/use case
- Conversion-focused for UK Kerala shoppers
- Do NOT include HTML tags

Return ONLY the short description text. No labels, no quotes, no extra commentary.`;
    } else if (mode === "full") {
      userPrompt = `Generate a FULL PRODUCT DESCRIPTION for the following product.

${contextBlock}

Requirements:
- 300–700 words
- HTML formatted (use <h2>, <h3>, <ul>, <li>, <p> only — no <html>, <body>, or <div>)
- Start with an <h2> using the product name
- Include sections: Overview, Key Benefits (as <ul>), Usage/How to Use, Storage (if relevant)
- Mention the brand naturally
- Category-relevant keywords woven in naturally
- Written for UK-based Kerala / South Indian shoppers
- No keyword stuffing
- Unique content — do not use generic templates

Return ONLY the HTML description. No markdown, no extra commentary.`;
    } else {
      // both
      userPrompt = `Generate product content for the following product.

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
    }

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
        max_tokens: mode === "both" ? 1500 : mode === "full" ? 1200 : 200,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${openAiRes.status} — ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAiData = await openAiRes.json();
    const rawContent = openAiData.choices?.[0]?.message?.content ?? "";

    let result: GeneratedContent = {};

    if (mode === "short") {
      result = { shortDescription: rawContent.trim() };
    } else if (mode === "full") {
      result = { fullDescription: rawContent.trim() };
    } else {
      // Parse JSON — strip markdown fences if present
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        result = {
          shortDescription: parsed.shortDescription?.trim() ?? "",
          fullDescription: parsed.fullDescription?.trim() ?? "",
          seoTitle: parsed.seoTitle?.trim() ?? "",
          seoDescription: parsed.seoDescription?.trim() ?? "",
          seoKeywords: parsed.seoKeywords?.trim() ?? "",
        };
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response as JSON. Try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
