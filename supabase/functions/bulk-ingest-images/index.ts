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
const BATCH_DELAY_MS = 1500; // rate limit buffer between calls

function bucketUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${encoded}`;
}

async function listFolder(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<{ name: string; path: string; url: string }[]> {
  const files: { name: string; path: string; url: string }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from("product-images")
      .list(prefix, { limit: 200, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data || data.length === 0) break;
    for (const f of data) {
      if (f.name === ".emptyFolderPlaceholder" || f.metadata == null) continue;
      const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
      files.push({ name: f.name, path: fullPath, url: bucketUrl(fullPath) });
    }
    if (data.length < 200) break;
    offset += 200;
  }
  return files;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({})) as {
      store_id?: string;
      limit?: number;
      folder?: string;
      dry_run?: boolean;
    };

    const limit = Math.min(body.limit ?? 20, 50);
    const dryRun = body.dry_run ?? false;
    const storeId = body.store_id;
    const folder = body.folder; // undefined = all folders

    // List all bucket files
    const folders = folder ? [folder] : ["", "uploads"];
    const allFiles: { name: string; path: string; url: string }[] = [];
    for (const f of folders) {
      const files = await listFolder(supabase, f);
      allFiles.push(...files);
    }

    // Get already-processed image paths
    const { data: existingJobs } = await supabase
      .from("ingestion_jobs")
      .select("image_path, status");

    const processedPaths = new Set(
      (existingJobs ?? []).map((j: { image_path: string }) => j.image_path),
    );

    // Filter to only unprocessed files
    const unprocessed = allFiles.filter((f) => !processedPaths.has(f.path));

    if (dryRun) {
      return new Response(
        JSON.stringify({
          total_in_bucket: allFiles.length,
          already_processed: processedPaths.size,
          pending: unprocessed.length,
          next_batch: unprocessed.slice(0, limit).map((f) => f.path),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const batch = unprocessed.slice(0, limit);

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ message: "All images already processed", total: allFiles.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process batch — call ingest-product-image for each file sequentially
    const results: { path: string; status: string; product_id?: string; error?: string }[] = [];

    for (const file of batch) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/ingest-product-image`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_path: file.path,
              image_url: file.url,
              store_id: storeId,
            }),
          },
        );

        const data = await res.json();
        results.push({
          path: file.path,
          status: data.status ?? (res.ok ? "ok" : "error"),
          product_id: data.product?.id,
          error: data.error,
        });
      } catch (err) {
        results.push({
          path: file.path,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Small delay to avoid hammering OpenAI rate limits
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    const summary = {
      processed: results.length,
      completed: results.filter((r) => r.status === "completed").length,
      duplicate: results.filter((r) => r.status === "duplicate").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "error" || r.status === "failed").length,
      remaining: unprocessed.length - batch.length,
      results,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
