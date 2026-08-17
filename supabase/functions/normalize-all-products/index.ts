import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    // limit: max products to process per call (default 20, max 50)
    const limit = Math.min(Number(body.limit ?? 20), 50);
    // force: reprocess even already-normalized images
    const force = Boolean(body.force ?? false);

    // Fetch products with an image_url that need normalization
    let query = supabase
      .from("products")
      .select("id, image_url, image_processing_status, image_quality_score")
      .not("image_url", "is", null)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .limit(limit);

    if (!force) {
      // Skip products that already have a quality score (already normalized)
      query = query.is("image_quality_score", null);
    }

    const { data: products, error: fetchErr } = await query;
    if (fetchErr) throw new Error(`Failed to fetch products: ${fetchErr.message}`);
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "All products are already normalized." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Array<{ id: string; status: string; error?: string }> = [];

    // Process products sequentially to avoid overwhelming OpenAI rate limits
    for (const product of products) {
      if (!product.image_url) continue;

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/enhance-product-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            productId: product.id,
            imageUrl:  product.image_url,
          }),
          signal: AbortSignal.timeout(240_000), // 4 min per product
        });

        const data = await res.json().catch(() => ({ success: false, error: "Non-JSON response" }));

        results.push({
          id:     product.id,
          status: data.success ? "normalized" : "failed",
          error:  data.success ? undefined : (data.error ?? data.ocrMessage ?? "Unknown error"),
        });
      } catch (err) {
        results.push({
          id:     product.id,
          status: "failed",
          error:  err instanceof Error ? err.message : String(err),
        });
      }
    }

    const normalized = results.filter(r => r.status === "normalized").length;
    const failed     = results.filter(r => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        normalized,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[normalize-all-products]", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
