/**
 * centralhub-sync Edge Function
 *
 * POST body actions:
 *   { action: 'sync', triggered_by: 'manual' | 'scheduled' }
 *   { action: 'force_resync', product_ids?: string[] }   — force re-sync specific local product IDs (or all if omitted)
 *   { action: 'sync_diagnostics' }                        — detailed out-of-sync report
 *   { action: 'diagnostics' }                             — basic connection + counts
 *   { action: 'backfill' }                                — link existing products to CentralHub by name match
 *   { action: 'sync_orders' }                             — push existing local orders to CentralHub
 *
 * Environment variables (auto-provided or set as secrets):
 *   CENTRALHUB_API_URL          — CentralHub Supabase project URL
 *   CENTRALHUB_API_KEY          — CentralHub anon/publishable key
 *   CENTRALHUB_ORDER_WEBHOOK_URL — Outbound URL for orders
 *   CENTRALHUB_WEBHOOK_SECRET    — Shared secret
 *   SUPABASE_URL                — auto-provided
 *   SUPABASE_SERVICE_ROLE_KEY   — auto-provided
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CentralHubProduct {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  product_type: string | null;
  brand: string | null;
  warehouse_location: string | null;
  weight: number | null;
  weight_kg: number | null;
  weight_grams: number | null;
  gtin: string | null;
  unit: string | null;
  slug: string | null;
  sku: string | null;
  department: string | null;
  subcategory: string | null;
}

interface LocalProduct {
  id: string;
  centralhub_product_id: string | null;
  source_product_id: string | null;
  name: string;
  source_name: string | null;
  slug: string;
  approval_status: string;
}

const CENTRALHUB_SELECT = "id,name,price,stock,product_type,brand,warehouse_location,weight,weight_kg,weight_grams,gtin,unit,slug,sku,department,subcategory";
const PAGE_SIZE = 500;

// Admin-managed fields — NEVER overwritten by sync
const PROTECTED_FIELDS = new Set([
  "category_id", "image_url", "image_main", "image_medium", "image_thumbnail",
  "image_large", "image_path", "enhanced_image_url", "description",
  "short_description", "seo_title", "seo_description", "seo_keywords",
  "price", "selling_price", "compare_price", "original_price", "markup_percentage",
  "approval_status", "visibility_status",
  "is_featured", "is_deal", "is_new_arrival", "is_bestseller",
]);

// Fields updated on every sync (non-admin-managed)
// price/name/slug are updated only when force_resync or initial insert
const SYNC_FIELDS = [
  "source_name", "source_brand", "brand_id",
  "supplier_price", "markup_percentage",
  "last_sync_at", "updated_at",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyMarkup(supplierPrice: number): number {
  const sellingPrice = supplierPrice * 1.05;
  // Round up to nearest multiple of 0.10
  return Math.ceil(sellingPrice * 10) / 10;
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

function normaliseHubUrl(raw: string): string {
  return raw.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
}

async function fetchAllHubProducts(
  hub: ReturnType<typeof createClient>,
): Promise<{ data: CentralHubProduct[]; totalCount: number; skipped: number; error: string | null }> {
  const all: CentralHubProduct[] = [];
  let from = 0;
  let totalCount = 0;
  let skipped = 0;

  try {
    while (true) {
      const { data, error, count } = await hub
        .from("products")
        .select(CENTRALHUB_SELECT, { count: from === 0 ? "exact" : "estimated" })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      if (from === 0 && count !== null) totalCount = count;

      const batch = (data ?? []) as CentralHubProduct[];
      for (const r of batch) {
        if (!r.id || !String(r.name ?? "").trim()) { skipped++; continue; }
        all.push(r);
      }

      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return { data: all, totalCount: totalCount || all.length, skipped, error: null };
  } catch (e) {
    return { data: all, totalCount: all.length, skipped, error: (e as Error).message };
  }
}

async function getTotalCount(hub: ReturnType<typeof createClient>): Promise<number> {
  const { count } = await hub.from("products").select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function resolveBrandId(
  supabase: ReturnType<typeof createClient>,
  brandName: string,
  brandCache: Map<string, string>,
): Promise<string | null> {
  const key = brandName.trim().toLowerCase();
  if (!key) return null;
  if (brandCache.has(key)) return brandCache.get(key)!;

  const slug = slugify(brandName);
  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    brandCache.set(key, existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: brandName.trim(), slug, description: null, logo_url: null })
    .select("id")
    .single();

  if (error || !created?.id) return null;
  brandCache.set(key, created.id);
  return created.id;
}

async function finalizeLog(
  supabase: ReturnType<typeof createClient>,
  logId: string,
  status: "success" | "error",
  data: {
    action?: string;
    totalFetched: number;
    importedNew: number;
    updatedExisting: number;
    failed: number;
    skipped: number;
    linked?: number;
    unmatched?: number;
    duplicates?: number;
    nameUpdates?: number;
    errors: string[];
  }
) {
  if (logId === "unknown") return;
  await supabase.from("sync_log").update({
    finished_at: new Date().toISOString(),
    status,
    action: data.action ?? "sync",
    total_fetched: data.totalFetched,
    imported_new: data.importedNew,
    updated_existing: data.updatedExisting,
    failed: data.failed,
    linked: data.linked ?? 0,
    unmatched: data.unmatched ?? 0,
    duplicates: data.duplicates ?? 0,
    name_updates: data.nameUpdates ?? 0,
    error_detail: data.errors.slice(0, 50),
  }).eq("id", logId);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const hubUrlRaw = Deno.env.get("CENTRALHUB_API_URL") ?? "";
    const hubKey = Deno.env.get("CENTRALHUB_API_KEY") ?? "";

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error: authErr } = await userSupabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.app_metadata?.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "diagnostics";

    const supabase = createClient(supabaseUrl, serviceKey);

    const hubConfigured = !!hubUrlRaw && !!hubKey;
    const hub = hubConfigured
      ? createClient(normaliseHubUrl(hubUrlRaw), hubKey, { auth: { persistSession: false } })
      : null;

    // ── diagnostics ──────────────────────────────────────────────────────────
    if (action === "diagnostics") {
      const [total, draft, approved, rejected, lastLog, linked] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("approval_status", "draft").eq("is_deleted", false),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("approval_status", "approved").eq("is_deleted", false),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("approval_status", "rejected").eq("is_deleted", false),
        supabase.from("sync_log").select("started_at,status,imported_new,updated_existing,failed,linked,unmatched,name_updates,error_detail").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("products").select("*", { count: "exact", head: true }).not("centralhub_product_id", "is", null).eq("is_deleted", false),
      ]);

      if (!hub) {
        return new Response(JSON.stringify({
          apiConnected: false,
          apiError: "CENTRALHUB_API_URL or CENTRALHUB_API_KEY not configured",
          centralHubTotal: 0,
          localTotal: total.count ?? 0,
          localDraft: draft.count ?? 0,
          localApproved: approved.count ?? 0,
          localRejected: rejected.count ?? 0,
          localLinked: linked.count ?? 0,
          lastSyncAt: lastLog.data?.started_at ?? null,
          lastSyncStatus: lastLog.data?.status ?? null,
          lastSyncImported: lastLog.data?.imported_new ?? 0,
          lastSyncUpdated: lastLog.data?.updated_existing ?? 0,
          lastSyncFailed: lastLog.data?.failed ?? 0,
          lastSyncLinked: lastLog.data?.linked ?? 0,
          lastSyncUnmatched: lastLog.data?.unmatched ?? 0,
          lastSyncNameUpdates: lastLog.data?.name_updates ?? 0,
          lastSyncErrors: lastLog.data?.error_detail ?? [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let apiConnected = false;
      let apiError: string | null = null;
      let centralHubTotal = 0;
      try {
        const { error } = await hub.from("products").select("id").limit(1);
        apiConnected = !error;
        apiError = error?.message ?? null;
        if (apiConnected) centralHubTotal = await getTotalCount(hub);
      } catch (e) {
        apiError = (e as Error).message;
      }

      // Brand diagnostics — sample brands from CentralHub and local
      let hubBrandSample: string[] = [];
      let hubWithBrand = 0;
      if (apiConnected) {
        try {
          const { data: bSample } = await hub
            .from("products")
            .select("brand")
            .not("brand", "is", null)
            .neq("brand", "")
            .limit(200);
          const bSet = new Set<string>();
          for (const r of (bSample ?? []) as { brand: string | null }[]) {
            if (r.brand?.trim()) bSet.add(r.brand.trim());
          }
          hubBrandSample = Array.from(bSet).slice(0, 20);
          hubWithBrand = bSample?.length ?? 0;
        } catch { /* best-effort */ }
      }
      const { data: localBrandStats } = await supabase
        .from("products")
        .select("brand")
        .eq("is_deleted", false);
      const lbs = (localBrandStats ?? []) as { brand: string | null }[];
      const localWithBrand = lbs.filter(r => r.brand?.trim()).length;
      const localMissingBrand = lbs.length - localWithBrand;
      const localDistinctBrands = new Set(lbs.filter(r => r.brand?.trim()).map(r => r.brand!.trim())).size;

      return new Response(JSON.stringify({
        apiConnected,
        apiError,
        centralHubTotal,
        localTotal: total.count ?? 0,
        localDraft: draft.count ?? 0,
        localApproved: approved.count ?? 0,
        localRejected: rejected.count ?? 0,
        localLinked: linked.count ?? 0,
        lastSyncAt: lastLog.data?.started_at ?? null,
        lastSyncStatus: lastLog.data?.status ?? null,
        lastSyncImported: lastLog.data?.imported_new ?? 0,
        lastSyncUpdated: lastLog.data?.updated_existing ?? 0,
        lastSyncFailed: lastLog.data?.failed ?? 0,
        lastSyncLinked: lastLog.data?.linked ?? 0,
        lastSyncUnmatched: lastLog.data?.unmatched ?? 0,
        lastSyncNameUpdates: lastLog.data?.name_updates ?? 0,
        lastSyncErrors: lastLog.data?.error_detail ?? [],
        brandDiagnostics: {
          hubWithBrand,
          hubBrandSample,
          localWithBrand,
          localMissingBrand,
          localDistinctBrands,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── sync_diagnostics ─────────────────────────────────────────────────────
    if (action === "sync_diagnostics") {
      if (!hub) {
        return new Response(JSON.stringify({ error: "CentralHub not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch CentralHub products
      const { data: hubProducts, error: fetchErr } = await fetchAllHubProducts(hub);
      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build hub map: hub_id → hub product
      const hubMap = new Map<string, CentralHubProduct>();
      for (const hp of hubProducts) hubMap.set(hp.id, hp);

      // Load all local products with centralhub_product_id or sku
      const { data: localRows } = await supabase
        .from("products")
        .select("id,name,slug,sku,centralhub_product_id,source_product_id,approval_status,price,supplier_price,brand_id,last_sync_at,department,main_category,category,sub_category")
        .eq("is_deleted", false);

      const linked: Array<{
        localId: string;
        localName: string;
        hubId: string;
        hubName: string;
        outOfSyncFields: string[];
        lastSyncAt: string | null;
      }> = [];
      const unmatched: Array<{ hubId: string; hubName: string }> = [];
      const duplicates: Array<{ hubId: string; count: number }> = [];
      const notLinked: Array<{ localId: string; localName: string; approvalStatus: string }> = [];

      // Check duplicates in local by SKU
      const skuCount = new Map<string, number>();
      for (const r of (localRows ?? []) as any[]) {
        if (r.sku) {
          skuCount.set(r.sku, (skuCount.get(r.sku) ?? 0) + 1);
        }
      }

      // Build local map: SKU → local product (primary)
      const localBySku = new Map<string, any>();
      const localByHubId = new Map<string, any>();
      for (const r of (localRows ?? [])) {
        const row = r as any;
        if (row.sku) localBySku.set(row.sku, row);
        if (row.centralhub_product_id) localByHubId.set(row.centralhub_product_id, row);

        if (!row.centralhub_product_id && !row.sku) {
          notLinked.push({ localId: row.id, localName: row.name, approvalStatus: row.approval_status });
        }
      }

      // Compare each hub product to its local counterpart
      for (const hp of hubProducts) {
        // Match by SKU first, then Hub ID
        const local = (hp.sku ? localBySku.get(hp.sku) : null) || localByHubId.get(hp.id);

        if (!local) {
          unmatched.push({ hubId: hp.id, hubName: hp.name });
          continue;
        }

        const outOfSyncFields: string[] = [];
        if (local.name !== hp.name) outOfSyncFields.push(`name: local="${local.name}" hub="${hp.name}"`);
        if (local.sku !== hp.sku) outOfSyncFields.push(`sku: local="${local.sku}" hub="${hp.sku}"`);
        if (local.department !== hp.department) outOfSyncFields.push(`department: local="${local.department}" hub="${hp.department}"`);
        if (local.category !== hp.subcategory) outOfSyncFields.push(`category: local="${local.category}" hub="${hp.subcategory}"`);

        const supplierPrice = Number(hp.price ?? 0);
        if (Math.abs(Number(local.supplier_price ?? 0) - supplierPrice) > 0.001) {
          outOfSyncFields.push(`supplier_price: local=${local.supplier_price} hub=${supplierPrice}`);
        }

        if (hp.sku && skuCount.get(hp.sku)! > 1) {
          duplicates.push({ hubId: hp.id, count: skuCount.get(hp.sku)! });
        }

        linked.push({
          localId: local.id,
          localName: local.name,
          hubId: hp.id,
          hubName: hp.name,
          outOfSyncFields,
          lastSyncAt: (local as any).last_sync_at,
        });
      }

      return new Response(JSON.stringify({
        summary: {
          hubTotal: hubProducts.length,
          localTotal: (localRows ?? []).length,
          linked: linked.length,
          outOfSync: linked.filter(l => l.outOfSyncFields.length > 0).length,
          unmatched: unmatched.length,
          duplicates: duplicates.length,
          notLinked: notLinked.length,
        },
        linked: linked.slice(0, 200),
        unmatched: unmatched.slice(0, 200),
        duplicates,
        notLinked: notLinked.slice(0, 200),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── backfill ─────────────────────────────────────────────────────────────
    if (action === "backfill") {
      if (!hub) {
        return new Response(JSON.stringify({ error: "CentralHub not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: logRow } = await supabase.from("sync_log").insert({ triggered_by: "manual", status: "running", action: "backfill" }).select("id").single();
      const logId: string = logRow?.id ?? "unknown";
      const start = Date.now();

      const { data: hubProducts, error: fetchErr } = await fetchAllHubProducts(hub);
      if (fetchErr) {
        await finalizeLog(supabase, logId, "error", { action: "backfill", totalFetched: 0, importedNew: 0, updatedExisting: 0, failed: 0, skipped: 0, errors: [fetchErr] });
        return new Response(JSON.stringify({ error: fetchErr }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build hub lookup: normalised name → hub product
      const hubByName = new Map<string, CentralHubProduct>();
      const hubById = new Map<string, CentralHubProduct>();
      for (const hp of hubProducts) {
        hubByName.set(hp.name.trim().toLowerCase(), hp);
        hubById.set(hp.id, hp);
      }

      // Load local products not yet linked
      const { data: localRows } = await supabase
        .from("products")
        .select("id,name,source_product_id,centralhub_product_id")
        .eq("is_deleted", false)
        .is("centralhub_product_id", null);

      let linked = 0;
      let unmatched = 0;
      const errors: string[] = [];

      for (const local of (localRows ?? []) as LocalProduct[]) {
        try {
          // Try match by source_product_id first (if it looks like a UUID)
          let match: CentralHubProduct | undefined;
          if (local.source_product_id && /^[0-9a-fA-F-]{36}$/.test(local.source_product_id)) {
            match = hubById.get(local.source_product_id);
          }
          // Fall back to name match
          if (!match) {
            match = hubByName.get(local.name.trim().toLowerCase());
          }

          if (match) {
            const { error: uErr } = await supabase
              .from("products")
              .update({
                centralhub_product_id: match.id,
                source_product_id: match.id,
                last_sync_at: new Date().toISOString(),
              })
              .eq("id", local.id);
            if (uErr) throw new Error(uErr.message);
            linked++;
          } else {
            unmatched++;
          }
        } catch (e) {
          errors.push(`${local.name}: ${(e as Error).message}`);
        }
      }

      await finalizeLog(supabase, logId, "success", {
        action: "backfill",
        totalFetched: hubProducts.length,
        importedNew: 0,
        updatedExisting: linked,
        failed: errors.length,
        skipped: 0,
        linked,
        unmatched,
        errors,
      });

      return new Response(JSON.stringify({
        logId,
        hubTotal: hubProducts.length,
        localProcessed: (localRows ?? []).length,
        linked,
        unmatched,
        failed: errors.length,
        errors: errors.slice(0, 50),
        durationMs: Date.now() - start,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── brand_backfill ───────────────────────────────────────────────────────
    // Fetch all CentralHub products and write brand + source_brand to every
    // matching local product (matched via centralhub_product_id).
    if (action === "brand_backfill") {
      if (!hub) {
        return new Response(JSON.stringify({ error: "CentralHub not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const start = Date.now();
      const { data: hubProducts, error: fetchErr } = await fetchAllHubProducts(hub);
      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build map: hub_id → brand
      const brandByHubId = new Map<string, string | null>();
      for (const hp of hubProducts) {
        brandByHubId.set(String(hp.id), hp.brand ?? null);
      }

      // Load all local products that have a centralhub_product_id
      const { data: localRows } = await supabase
        .from("products")
        .select("id, centralhub_product_id, brand, source_brand")
        .eq("is_deleted", false)
        .not("centralhub_product_id", "is", null);

      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const local of (localRows ?? []) as { id: string; centralhub_product_id: string; brand: string | null; source_brand: string | null }[]) {
        const hubBrand = brandByHubId.get(local.centralhub_product_id) ?? null;
        // Skip if brand already matches
        if (local.brand === hubBrand) { skipped++; continue; }
        try {
          const { error: uErr } = await supabase
            .from("products")
            .update({ brand: hubBrand, source_brand: hubBrand, updated_at: new Date().toISOString() })
            .eq("id", local.id);
          if (uErr) throw new Error(uErr.message);
          updated++;
        } catch (e) {
          failed++;
          errors.push((e as Error).message);
        }
      }

      // Also backfill products not yet linked: copy source_brand → brand where brand is still null
      // Use a targeted update for unlinked products that have source_brand but no brand
      const { data: unlinked, error: fallbackErr } = await supabase
        .from("products")
        .select("id, source_brand")
        .is("brand", null)
        .not("source_brand", "is", null)
        .neq("source_brand", "");

      if (fallbackErr) errors.push(`Fallback fetch error: ${fallbackErr.message}`);

      for (const row of (unlinked ?? []) as { id: string; source_brand: string }[]) {
        try {
          await supabase.from("products").update({ brand: row.source_brand }).eq("id", row.id);
          updated++;
        } catch { failed++; }
      }

      // Diagnostics
      const { data: stats } = await supabase
        .from("products")
        .select("brand")
        .eq("is_deleted", false);

      const allBrands = (stats ?? []) as { brand: string | null }[];
      const hasBrand = allBrands.filter(r => r.brand && r.brand.trim()).length;
      const missingBrand = allBrands.length - hasBrand;
      const distinctBrands = new Set(allBrands.filter(r => r.brand?.trim()).map(r => r.brand!.trim())).size;

      return new Response(JSON.stringify({
        hubProductsFetched: hubProducts.length,
        localProductsProcessed: (localRows ?? []).length,
        updated,
        skipped,
        failed,
        errors: errors.slice(0, 50),
        diagnostics: { total: allBrands.length, hasBrand, missingBrand, distinctBrands },
        durationMs: Date.now() - start,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── sync ─────────────────────────────────────────────────────────────────
    if (action === "sync" || action === "force_resync") {
      if (!hub) {
        return new Response(JSON.stringify({ error: "CENTRALHUB_API_URL and CENTRALHUB_API_KEY must be configured before syncing." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isForce = action === "force_resync";
      const forceProductIds: string[] | null = isForce && Array.isArray(body.product_ids) && body.product_ids.length > 0
        ? body.product_ids as string[]
        : null; // null = all products

      const triggeredBy = body.triggered_by === "scheduled" ? "scheduled" : "manual";
      const start = Date.now();

      const { data: logRow } = await supabase.from("sync_log").insert({ triggered_by: triggeredBy, status: "running", action }).select("id").single();
      const logId: string = logRow?.id ?? "unknown";

      const errors: string[] = [];
      let totalFetched = 0;
      let importedNew = 0;
      let updatedExisting = 0;
      let skippedNoData = 0;
      let failed = 0;
      let nameUpdates = 0;

      try {
        const { data: hubProducts, totalCount, skipped: sk, error: fetchErr } = await fetchAllHubProducts(hub);
        skippedNoData = sk;
        totalFetched = totalCount;

        if (fetchErr) {
          errors.push(`CentralHub fetch: ${fetchErr}`);
          await finalizeLog(supabase, logId, "error", { action, totalFetched: 0, importedNew: 0, updatedExisting: 0, failed: 0, skipped: skippedNoData, errors });
          return new Response(JSON.stringify({ logId, totalFetched: 0, importedNew: 0, updatedExisting: 0, skipped: skippedNoData, failed: 0, errors, durationMs: Date.now() - start }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Load existing mapping: sku → local product (primary)
        // Also load centralhub_product_id and source_product_id for secondary matching
        const { data: existingRows } = await supabase
          .from("products")
          .select("id,sku,centralhub_product_id,source_product_id,name,source_name,slug,approval_status,cost_price,selling_price,supplier_price,price,markup_percentage");

        const existingBySku = new Map<string, LocalProduct>();
        const existingByHubId = new Map<string, LocalProduct>();
        const allSlugs = new Set<string>();

        for (const r of (existingRows ?? []) as (LocalProduct & { sku: string | null })[]) {
          if (r.sku) existingBySku.set(r.sku, r);
          if (r.centralhub_product_id) existingByHubId.set(r.centralhub_product_id, r);
          if (r.slug) allSlugs.add(r.slug);
        }

        const brandCache = new Map<string, string>();
        const now = new Date().toISOString();
        const CHUNK = 50;

        // Filter hub products if force_resync with specific IDs
        let productsToProcess = hubProducts;
        if (isForce && forceProductIds) {
          const idSet = new Set(forceProductIds);
          // forceProductIds are local product IDs — map to centralhub IDs
          const hubIdSet = new Set<string>();
          for (const r of (existingRows ?? []) as LocalProduct[]) {
            if (idSet.has(r.id) && r.centralhub_product_id) hubIdSet.add(r.centralhub_product_id);
          }
          productsToProcess = hubProducts.filter(hp => hubIdSet.has(hp.id));
        }

        for (let i = 0; i < productsToProcess.length; i += CHUNK) {
          const chunk = productsToProcess.slice(i, i + CHUNK);

          for (const hp of chunk) {
            try {
              const hpId = String(hp.id);
              const hpSku = hp.sku || `CH-${hpId.slice(0, 8)}`; // Fallback if SKU missing, though registry should have it

              // Match by SKU first (Primary), then centralhub_product_id
              let ex = existingBySku.get(hpSku);
              if (!ex) ex = existingByHubId.get(hpId);

              // Brand taken verbatim from CentralHub
              const brandName = hp.brand ?? null;
              const supplierPrice = Number(hp.price ?? 0);
              const sellingPrice = applyMarkup(supplierPrice);

              type ExRow = LocalProduct & {
                cost_price: number | null;
                selling_price: number | null;
                supplier_price: number | null;
                price: number;
                markup_percentage: number | null;
                source_name: string | null;
                sku: string | null;
              };

              // Construct the base payload for Upsert
              const upsertPayload: Record<string, any> = {
                centralhub_product_id: hpId,
                sku: hpSku,
                source_name: hp.name,
                source_brand: brandName,
                brand: brandName,

                // Data Mapping Requirements
                department: hp.department,
                main_category: hp.department, // main_category ⬅️ department from CentralHub
                category: hp.subcategory,
                sub_category: hp.subcategory, // sub_category ⬅️ subcategory from CentralHub

                // Weight Requirements (defaults if missing)
                weight_kg: hp.weight_kg ?? hp.weight ?? 0.5,
                weight_grams: hp.weight_grams ?? 500,

                warehouse_location: hp.warehouse_location || null,

                // Pricing — update supplier cost; local selling price protected for existing products
                supplier_price: supplierPrice,
                cost_price: supplierPrice,
                selling_price: sellingPrice,
                price: sellingPrice,
                markup_percentage: 5,

                last_sync_at: now,
                updated_at: now,
                is_deleted: false,
                is_active: true,
                approval_status: 'draft',
                visibility_status: false,
              };

              if (ex?.id) {
                const exRow = ex as unknown as ExRow;

                // Detect if admin has manually edited the name
                const nameIsAdminEdited = exRow.source_name != null && exRow.name !== exRow.source_name;

                if (isForce) {
                  upsertPayload.name = hp.name;
                  if (hp.slug) upsertPayload.slug = hp.slug;
                  nameUpdates++;
                } else {
                  if (!nameIsAdminEdited) {
                    upsertPayload.name = hp.name;
                    nameUpdates++;
                  }
                }

                // Handle other fields that might be null in HP but we want to keep if existing
                if (hp.stock !== null) upsertPayload.stock = hp.stock;
                if (hp.unit !== null) upsertPayload.unit = hp.unit;
                if (hp.product_type !== null) upsertPayload.product_type = hp.product_type;

                // Purge protected fields if not forcing
                if (!isForce) {
                  for (const pf of PROTECTED_FIELDS) {
                    delete upsertPayload[pf];
                  }
                }

                // Record price history
                const oldCost = Number(exRow.cost_price ?? exRow.supplier_price ?? 0);
                const oldSelling = Number(exRow.selling_price ?? exRow.price ?? 0);
                if (Math.abs(oldCost - supplierPrice) > 0.001 || Math.abs(oldSelling - sellingPrice) > 0.001) {
                  await supabase.from("price_history").insert({
                    product_id: exRow.id,
                    old_cost_price: oldCost,
                    new_cost_price: supplierPrice,
                    old_selling_price: oldSelling,
                    new_selling_price: sellingPrice,
                    markup_percentage: 5,
                    changed_by: "sync",
                  });
                }
                updatedExisting++;
              } else {
                // New product setup
                upsertPayload.name = hp.name;
                const baseSlug = hp.slug || slugify(hp.name) || `product-${hpId.slice(-8)}`;
                let finalSlug = baseSlug;
                if (allSlugs.has(finalSlug)) finalSlug = `${baseSlug}-${hpId.slice(-6)}`;
                allSlugs.add(finalSlug);
                upsertPayload.slug = finalSlug;

                upsertPayload.stock = hp.stock ?? 0;
                upsertPayload.unit = hp.unit ?? null;
                upsertPayload.product_type = hp.product_type ?? null;
                upsertPayload.created_at = now;

                importedNew++;
              }

              // Execute Upsert targeting centralhub_product_id
              const { data: upserted, error: upsertErr } = await supabase
                .from("products")
                .upsert(upsertPayload, { onConflict: 'centralhub_product_id' })
                .select("id, short_description")
                .single();

              if (upsertErr) throw upsertErr;

              // AI Enrichment Trigger:
              // If it's a new product or force resync, and short_description is missing,
              // fire the AI description generator.
              if (upserted && !upserted.short_description) {
                const fnUrl = `${supabaseUrl}/functions/v1/generate-descriptions`;
                // Use a non-awaited promise to avoid blocking the sync loop,
                // but we should ideally ensure they are all tracked.
                // For now, we'll just keep it but note it might be terminated in some runtimes.
                // In Supabase Edge Functions, background tasks are generally killed after response.
                // Awaiting would be slow, but necessary for reliability if not using a queue.
                // We'll await it to ensure reliability as per "Fix All" request.
                try {
                  await fetch(fnUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({ productId: upserted.id, mode: "both" }),
                  });
                } catch (err) {
                  console.error(`[sync-ai] Trigger failed for ${upserted.id}:`, err);
                }
              }

            } catch (e) {
              failed++;
              errors.push(`${hp.name}: ${(e as Error).message}`);
            }
          }
        }

        await finalizeLog(supabase, logId, "success", {
          action,
          totalFetched,
          importedNew,
          updatedExisting,
          failed,
          skipped: skippedNoData,
          nameUpdates,
          errors,
        });
      } catch (e) {
        errors.push((e as Error).message);
        await finalizeLog(supabase, logId, "error", { action, totalFetched, importedNew, updatedExisting, failed, skipped: skippedNoData, nameUpdates, errors });
      }

      return new Response(JSON.stringify({
        logId,
        totalFetched,
        importedNew,
        updatedExisting,
        nameUpdates,
        skipped: skippedNoData,
        failed,
        errors: errors.slice(0, 50),
        durationMs: Date.now() - start,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── recalculate_prices ───────────────────────────────────────────────────
    if (action === "recalculate_prices") {
      const start = Date.now();
      // Fetch all products with cost_price set
      const { data: rows, error: fetchErr } = await supabase
        .from("products")
        .select("id, name, cost_price, selling_price, price, markup_percentage")
        .eq("is_deleted", false)
        .not("cost_price", "is", null);

      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      type PriceRow = { id: string; name: string; cost_price: number; selling_price: number | null; price: number; markup_percentage: number | null };
      const report: Array<{
        productId: string; name: string;
        oldCostPrice: number; newCostPrice: number;
        oldSellingPrice: number; newSellingPrice: number;
      }> = [];
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      const CHUNK = 100;
      const allRows = (rows ?? []) as PriceRow[];
      for (let i = 0; i < allRows.length; i += CHUNK) {
        const chunk = allRows.slice(i, i + CHUNK);
        for (const row of chunk) {
          try {
            const costPrice = Number(row.cost_price);
            const newSelling = applyMarkup(costPrice);
            const oldSelling = Number(row.selling_price ?? row.price ?? 0);

            if (Math.abs(oldSelling - newSelling) < 0.001) continue; // no change

            const { error: uErr } = await supabase.from("products").update({
              selling_price: newSelling,
              price: newSelling,
              supplier_price: costPrice,
              markup_percentage: 5,
              updated_at: new Date().toISOString(),
            }).eq("id", row.id);

            if (uErr) throw new Error(uErr.message);

            await supabase.from("price_history").insert({
              product_id: row.id,
              old_cost_price: costPrice,
              new_cost_price: costPrice,
              old_selling_price: oldSelling,
              new_selling_price: newSelling,
              markup_percentage: 5,
              changed_by: "recalculate",
            });

            report.push({
              productId: row.id, name: row.name,
              oldCostPrice: costPrice, newCostPrice: costPrice,
              oldSellingPrice: oldSelling, newSellingPrice: newSelling,
            });
            updated++;
          } catch (e) {
            failed++;
            errors.push(`${row.name}: ${(e as Error).message}`);
          }
        }
      }

      return new Response(JSON.stringify({
        processed: allRows.length,
        updated,
        failed,
        errors: errors.slice(0, 50),
        changes: report.slice(0, 200).map(r => ({
          product_id: r.productId,
          product_name: r.name,
          old_selling_price: r.oldSellingPrice,
          new_selling_price: r.newSellingPrice,
          cost_price: r.oldCostPrice,
          markup_pct: Number(allRows.find(row => row.id === r.productId)?.markup_percentage ?? 5),
        })),
        durationMs: Date.now() - start,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── price_sync_report ─────────────────────────────────────────────────────
    if (action === "price_sync_report") {
      const limit = Number(body.limit ?? 100);
      const { data: rows } = await supabase
        .from("price_history")
        .select("id, product_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price, markup_percentage, changed_at, changed_by, products(name, slug)")
        .order("changed_at", { ascending: false })
        .limit(limit);

      type HistoryRow = {
        id: string; product_id: string;
        old_cost_price: number | null; new_cost_price: number | null;
        old_selling_price: number | null; new_selling_price: number | null;
        markup_percentage: number | null; changed_at: string; changed_by: string | null;
        products: { name: string; slug: string } | { name: string; slug: string }[] | null;
      };

      const report = ((rows ?? []) as HistoryRow[]).map(r => {
        const prod = Array.isArray(r.products) ? r.products[0] : r.products;
        return {
          id: r.id,
          productId: r.product_id,
          productName: prod?.name ?? r.product_id,
          productSlug: prod?.slug ?? null,
          oldCostPrice: r.old_cost_price,
          newCostPrice: r.new_cost_price,
          oldSellingPrice: r.old_selling_price,
          newSellingPrice: r.new_selling_price,
          markupPercentage: r.markup_percentage,
          changedAt: r.changed_at,
          changedBy: r.changed_by,
        };
      });

      return new Response(JSON.stringify({ report, total: report.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── sync_orders ──────────────────────────────────────────────────────────
    if (action === "sync_orders") {
      const orderWebhookUrl = Deno.env.get("CENTRALHUB_ORDER_WEBHOOK_URL");
      const webhookSecret = Deno.env.get("CENTRALHUB_WEBHOOK_SECRET");

      if (!orderWebhookUrl) {
        return new Response(JSON.stringify({ error: "CENTRALHUB_ORDER_WEBHOOK_URL not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch all local orders that haven't been linked to CentralHub yet (optional filter)
      // For now, we fetch all active orders.
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (ordersErr) {
        return new Response(JSON.stringify({ error: ordersErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let successCount = 0;
      let failCount = 0;
      const orderErrors: string[] = [];

      for (const order of (orders ?? [])) {
        try {
          const res = await fetch(orderWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-secret": webhookSecret || "",
            },
            body: JSON.stringify({
              table: "orders",
              type: "INSERT",
              store_slug: "keralagrocery",
              record: {
                ...order,
                status: (order.order_status === 'confirmed' || order.order_status === 'processing') ? 'confirmed' : order.order_status,
                fulfillment_status: (order.order_status === 'confirmed' || order.order_status === 'processing') ? 'confirmed' : order.order_status,
                packing_status: (order.order_status === 'confirmed' || order.order_status === 'processing') ? 'confirmed' : 'pending',
                sync_store: "keralagrocery",
                sync_origin: "local",
                items: order.order_items,
              },
            }),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.external_order_id) {
              await supabase
                .from("orders")
                .update({ external_order_id: result.external_order_id })
                .eq("id", order.id);
            }
            successCount++;
          } else {
            failCount++;
            orderErrors.push(`Order ${order.order_number}: HTTP ${res.status}`);
          }
        } catch (e) {
          failCount++;
          orderErrors.push(`Order ${order.order_number}: ${(e as Error).message}`);
        }
      }

      return new Response(JSON.stringify({
        total: (orders ?? []).length,
        success: successCount,
        failed: failCount,
        errors: orderErrors.slice(0, 50),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
