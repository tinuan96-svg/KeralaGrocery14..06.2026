/**
 * bulk-process-images
 *
 * Finds all active products where image_main IS NULL but image_url exists,
 * then calls process-product-image for each one sequentially.
 *
 * Also seeds app_config so the DB cron trigger can call edge functions.
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
const BATCH_DELAY_MS = 800;

async function seedConfig(supabase: ReturnType<typeof createClient>): Promise<void> {
  try {
    await supabase.from("app_config").upsert([
      { key: "supabase_url", value: SUPABASE_URL },
      { key: "service_role_key", value: SERVICE_ROLE_KEY },
    ], { onConflict: "key" });
  } catch (_) { /* non-critical */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Seed config for DB trigger/cron
    await seedConfig(supabase);

    const body = await req.json().catch(() => ({})) as {
      limit?: number;
      dry_run?: boolean;
      force?: boolean;
      product_ids?: string[];
    };

    const limit = Math.min(body.limit ?? 30, 100);
    const dryRun = body.dry_run ?? false;
    const force = body.force ?? false;

    // Build query: products needing processing
    let query = supabase
      .from("products")
      .select("id, name, brand, slug, image_url")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .not("image_url", "is", null)
      .limit(limit);

    if (body.product_ids?.length) {
      query = query.in("id", body.product_ids);
    } else if (!force) {
      query = query.is("image_main", null);
    }

    const { data: products, error: fetchErr } = await query;

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!products?.length) {
      return new Response(
        JSON.stringify({ message: "All products already have clean images", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          would_process: products.length,
          products: products.map((p) => ({ id: p.id, name: p.name, image_url: p.image_url })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { product_id: string; name: string; status: string; error?: string }[] = [];

    for (const product of products) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/enhance-product-image`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
            imageUrl: product.image_url,
            premium: true,
          }),
        });

        const data = await res.json().catch(() => ({ error: "no json" }));
        results.push({
          product_id: product.id,
          name: product.name,
          status: data.success ? "completed" : "error",
          ...(data.error ? { error: data.error } : {}),
        });
      } catch (err) {
        results.push({
          product_id: product.id,
          name: product.name,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "error" || r.status === "failed").length;

    return new Response(
      JSON.stringify({ processed: results.length, completed, failed, results }),
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
