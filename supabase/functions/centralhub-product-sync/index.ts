/**
 * centralhub-product-sync
 *
 * Pulls products from CentralHub's Supabase project and upserts them
 * into KeralaGrocery's products table. Called by:
 *   1. pg_cron job every 5 minutes (action: "poll")
 *   2. Admin sync monitor "Request Sync Now" button (action: "poll")
 *   3. Admin sync monitor "Test Connection" button (action: "diagnose")
 *
 * Optimized: fetches all products in one query, loads existing data in one
 * query, then batches upserts in groups of 50 to stay within edge function
 * time limits.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

function applyMarkup(supplierPrice: number): number {
  return Math.ceil(supplierPrice * 1.05 * 10) / 10;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "poll";

    // ── Diagnose ──────────────────────────────────────────────────────────
    if (action === "diagnose") {
      const chUrlRaw = Deno.env.get("CENTRALHUB_API_URL") || "https://icnvrpnzjjcbvgcqgiua.supabase.co";
      const chUrl = chUrlRaw.replace(/\/rest\/v1\/?$/, "");
      const chKey = Deno.env.get("CENTRALHUB_API_KEY") || "";

      if (!chKey) {
        return new Response(
          JSON.stringify({ ok: false, message: "CENTRALHUB_API_KEY secret not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${chUrl}/rest/v1/products?select=id&limit=1`, {
        headers: { apikey: chKey, Authorization: `Bearer ${chKey}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return new Response(
          JSON.stringify({ ok: false, message: `CentralHub API returned ${res.status}: ${text.slice(0, 200)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json().catch(() => []);
      return new Response(
        JSON.stringify({ ok: true, message: `CentralHub reachable. Sample query returned ${Array.isArray(data) ? data.length : 0} row(s).` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "poll") {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Poll (full sync) ────────────────────────────────────────────────

    const kgUrl = Deno.env.get("SUPABASE_URL") || "";
    const kgKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!kgUrl || !kgKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const kg = createClient(kgUrl, kgKey);

    const chUrlRaw = Deno.env.get("CENTRALHUB_API_URL") || "https://icnvrpnzjjcbvgcqgiua.supabase.co";
    const chUrl = chUrlRaw.replace(/\/rest\/v1\/?$/, "");
    const chKey = Deno.env.get("CENTRALHUB_API_KEY") || "";
    if (!chKey) {
      return new Response(
        JSON.stringify({ error: "CENTRALHUB_API_KEY secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ch = createClient(chUrl, chKey, { auth: { persistSession: false } });

    // 1. Fetch all products from CentralHub (only columns that exist)
    const { data: hubProducts, error: fetchErr } = await ch
      .from("products")
      .select("id,name,slug,brand,price,cost_price,stock,unit,weight,gtin,warehouse_location,department,category,subcategory,main_category,sub_category,weight_grams,sku,product_type,pack_size,pack_unit")
      .order("name", { ascending: true })
      .limit(500);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: `CentralHub fetch failed: ${fetchErr.message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const products = hubProducts ?? [];
    const now = new Date().toISOString();

    // 2. Load existing products (with CH link) + all slugs + all active products for name+brand fallback
    const [existingRes, allSlugsRes, allActiveRes] = await Promise.all([
      kg.from("products").select("id,centralhub_product_id,sku,name,source_name,brand,cost_price,selling_price,supplier_price,price").not("centralhub_product_id", "is", null).eq("is_deleted", false),
      kg.from("products").select("slug"),
      kg.from("products").select("id,centralhub_product_id,name,brand").eq("is_deleted", false),
    ]);

    const existingByChId = new Map<string, Record<string, unknown>>();
    for (const row of (existingRes.data ?? []) as Record<string, unknown>[]) {
      if (row.centralhub_product_id) existingByChId.set(row.centralhub_product_id as string, row);
    }

    // Fallback map: lower(name) + lower(brand) -> existing product (for when CH regenerates IDs)
    const existingByNameBrand = new Map<string, Record<string, unknown>>();
    for (const row of (allActiveRes.data ?? []) as Record<string, unknown>[]) {
      const key = `${String(row.name ?? "").toLowerCase()}||${String(row.brand ?? "").toLowerCase()}`;
      if (!existingByNameBrand.has(key)) {
        existingByNameBrand.set(key, row);
      }
    }

    const usedSlugs = new Set<string>();
    for (const row of (allSlugsRes.data ?? []) as Record<string, unknown>[]) {
      if (row.slug) usedSlugs.add(row.slug as string);
    }

    // 3. Build update and insert batches
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; payload: Record<string, unknown> }[] = [];
    const priceHistoryEntries: Record<string, unknown>[] = [];

    let importedNew = 0;
    let updatedExisting = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const hp of products as Record<string, unknown>[]) {
      try {
        const chId = String(hp.id);
        const supplierPrice = Number(hp.price ?? hp.cost_price ?? 0);
        const sellingPrice = applyMarkup(supplierPrice);

        // Primary match: by centralhub_product_id
        let exRow = existingByChId.get(chId) as
          | { id: string; name: string; source_name: string | null; cost_price: number | null; selling_price: number | null; supplier_price: number | null; price: number | null }
          | undefined;

        // Fallback match: by name+brand (case-insensitive) when CH regenerated its IDs
        let chIdUpdate: string | null = null;
        if (!exRow) {
          const nameKey = `${String(hp.name ?? "").toLowerCase()}||${String(hp.brand ?? "").toLowerCase()}`;
          const fallbackRow = existingByNameBrand.get(nameKey) as
            | { id: string; centralhub_product_id: string | null; name: string; source_name: string | null; cost_price: number | null; selling_price: number | null; supplier_price: number | null; price: number | null }
            | undefined;
          if (fallbackRow) {
            exRow = fallbackRow as typeof exRow;
            // Need to update the CH ID on the existing product
            chIdUpdate = chId;
          }
        }

        const commonFields = {
          source_name: hp.name,
          source_brand: hp.brand ?? null,
          brand: hp.brand ?? null,
          supplier_price: supplierPrice,
          cost_price: supplierPrice,
          selling_price: sellingPrice,
          price: sellingPrice,
          stock: hp.stock ?? 0,
          in_stock: Number(hp.stock ?? 0) > 0,
          unit: hp.unit ?? "",
          weight: hp.weight ?? null,
          weight_grams: hp.weight_grams ?? null,
          warehouse_location: hp.warehouse_location ?? "",
          department: hp.department ?? null,
          main_category: hp.main_category ?? hp.department ?? null,
          category: hp.category ?? hp.subcategory ?? null,
          sub_category: hp.sub_category ?? hp.subcategory ?? null,
          is_active: true,
          is_deleted: false,
          product_type: (hp.product_type as string) || "simple",
          last_sync_at: now,
          updated_at: now,
        };

        if (exRow) {
          // UPDATE
          const updatePayload: Record<string, unknown> = { ...commonFields };

          // Update CH ID if this was a fallback match (CH regenerated its ID)
          if (chIdUpdate) {
            updatePayload.centralhub_product_id = chIdUpdate;
          }

          const nameIsAdminEdited = exRow.source_name != null && exRow.name !== exRow.source_name;
          if (!nameIsAdminEdited) updatePayload.name = hp.name;

          toUpdate.push({ id: exRow.id, payload: updatePayload });

          // Price history
          const oldCost = Number(exRow.cost_price ?? exRow.supplier_price ?? 0);
          const oldSelling = Number(exRow.selling_price ?? exRow.price ?? 0);
          if (Math.abs(oldCost - supplierPrice) > 0.001 || Math.abs(oldSelling - sellingPrice) > 0.001) {
            priceHistoryEntries.push({
              product_id: exRow.id,
              old_cost_price: oldCost,
              new_cost_price: supplierPrice,
              old_selling_price: oldSelling,
              new_selling_price: sellingPrice,
              markup_percentage: 5,
              changed_by: "centralhub-sync",
            });
          }
          updatedExisting++;
        } else {
          // INSERT
          let slug = (hp.slug as string)?.trim() || slugify(hp.name as string) || `product-${chId.slice(-8)}`;
          if (usedSlugs.has(slug)) slug = `${slug}-${chId.slice(-6)}`;
          if (usedSlugs.has(slug)) slug = `${slug}-${Date.now()}`;
          usedSlugs.add(slug);

          toInsert.push({
            centralhub_product_id: chId,
            sku: (hp.sku as string) || `CH-${chId.slice(0, 8)}`,
            ...commonFields,
            name: hp.name,
            slug,
            is_featured: false,
            is_deal: false,
            is_new_arrival: false,
            is_bestseller: false,
            discount_percentage: 0,
            sold_count: 0,
            rating: 4.5,
            review_count: 0,
            approval_status: "approved",
            visibility_status: true,
            created_at: now,
          });
          importedNew++;
        }
      } catch (err) {
        failed++;
        errors.push(`${hp.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Batch insert (50 at a time)
    const BATCH = 50;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error: batchErr } = await kg.from("products").insert(batch);
      if (batchErr) {
        failed += batch.length;
        errors.push(`Insert batch ${Math.floor(i / BATCH) + 1}: ${batchErr.message}`);
        importedNew -= batch.length;
      }
    }

    // 5. Batch update (50 at a time via individual calls but parallelized)
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((item) => kg.from("products").update(item.payload).eq("id", item.id))
      );
      for (const r of results) {
        if (r.error) {
          failed++;
          errors.push(`Update: ${r.error.message}`);
        }
      }
    }

    // 6. Batch insert price history
    for (let i = 0; i < priceHistoryEntries.length; i += BATCH) {
      const batch = priceHistoryEntries.slice(i, i + BATCH);
      await kg.from("price_history").insert(batch).then();
    }

    // 7. Log sync result
    await kg.from("sync_log").insert({
      triggered_by: "scheduled",
      status: failed === products.length && products.length > 0 ? "error" : "success",
      started_at: now,
      finished_at: new Date().toISOString(),
      total_fetched: products.length,
      imported_new: importedNew,
      updated_existing: updatedExisting,
      failed,
      error_detail: errors.slice(0, 50),
    }).then();

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Sync complete: ${products.length} fetched, ${importedNew} new, ${updatedExisting} updated, ${failed} failed`,
        totalFetched: products.length,
        importedNew,
        updatedExisting,
        failed,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
