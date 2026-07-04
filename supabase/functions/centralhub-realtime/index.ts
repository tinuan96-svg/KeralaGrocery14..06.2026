/**
 * centralhub-realtime Edge Function
 *
 * Receives webhook POST calls from CentralHub when products change,
 * and applies those changes to the local KeralaGroceries products table.
 *
 * Also handles { action: 'poll' } to trigger a full sync (fallback for
 * environments where webhooks aren't configured).
 *
 * POST body (webhook mode):
 *   { type: 'INSERT' | 'UPDATE' | 'DELETE', record: CentralHubProduct, old_record?: CentralHubProduct }
 *
 * POST body (poll mode):
 *   { action: 'poll' }
 *
 * POST body (status mode):
 *   { action: 'status' }
 *
 * Environment variables:
 *   SUPABASE_URL                — auto-provided
 *   SUPABASE_SERVICE_ROLE_KEY   — auto-provided
 *   CENTRALHUB_API_URL          — CentralHub Supabase project URL
 *   CENTRALHUB_API_KEY          — CentralHub anon/publishable key
 *   CENTRALHUB_WEBHOOK_SECRET   — optional secret to verify webhook origin
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret",
};

interface CentralHubProduct {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  product_type: string | null;
  brand: string | null;
  weight: number | null;
  unit: string | null;
  slug: string | null;
  gtin: string | null;
  warehouse_location: string | null;
}

interface WebhookBody {
  type?: "INSERT" | "UPDATE" | "DELETE";
  record?: CentralHubProduct;
  old_record?: CentralHubProduct;
  action?: string;
}

// Protected fields — never overwritten by sync
const PROTECTED_FIELDS = new Set([
  "category_id", "image_url", "image_main", "image_medium", "image_thumbnail",
  "image_large", "image_path", "enhanced_image_url", "description",
  "short_description", "seo_title", "seo_description", "seo_keywords",
  "compare_price", "original_price", "approval_status", "visibility_status",
  "is_featured", "is_deal", "is_new_arrival", "is_bestseller",
]);

function applyMarkup(supplierPrice: number, markupPct = 5): number {
  return Math.round(supplierPrice * (1 + markupPct / 100) * 100) / 100;
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

async function logSyncEvent(
  supabase: ReturnType<typeof createClient>,
  centralhub_product_id: string | null,
  event_type: string,
  status: "success" | "failed" | "pending",
  payload: Record<string, unknown> | null,
  error_message?: string,
): Promise<void> {
  try {
    await supabase.from("realtime_sync_events").insert({
      centralhub_product_id,
      event_type,
      status,
      payload,
      error_message: error_message ?? null,
      processed_at: new Date().toISOString(),
    });
  } catch {
    // Best-effort logging — don't let logging failures block sync
  }
}

async function applyProductUpdate(
  supabase: ReturnType<typeof createClient>,
  hp: CentralHubProduct,
): Promise<{ action: "updated" | "inserted" | "skipped"; error?: string }> {
  const hpId = String(hp.id);
  const now = new Date().toISOString();

  // Find local product by centralhub_product_id
  const { data: localProduct } = await supabase
    .from("products")
    .select("id, name, source_name, slug, approval_status, markup_percentage, cost_price, selling_price, price")
    .eq("centralhub_product_id", hpId)
    .maybeSingle();

  // Store brand exactly as received from CentralHub — no transformation
  const brandName = hp.brand ?? null;
  const supplierPrice = Number(hp.price ?? 0);

  if (localProduct) {
    const markupPct = Number(localProduct.markup_percentage ?? 5);
    const newSellingPrice = applyMarkup(supplierPrice, markupPct);

    // Only update name if admin hasn't customised it
    const nameIsAdminEdited = localProduct.source_name != null && localProduct.name !== localProduct.source_name;

    const updatePayload: Record<string, unknown> = {
      source_name: hp.name,
      source_brand: brandName,
      brand: brandName,
      supplier_price: supplierPrice,
      cost_price: supplierPrice,
      selling_price: newSellingPrice,
      price: newSellingPrice,
      markup_percentage: markupPct,
      last_sync_at: now,
      updated_at: now,
    };

    if (!nameIsAdminEdited && localProduct.name !== hp.name) {
      updatePayload.name = hp.name;
    }
    if (hp.weight !== null) updatePayload.weight = hp.weight;
    if (hp.stock !== null) updatePayload.stock = hp.stock;
    if (hp.unit !== null) updatePayload.unit = hp.unit;
    if (hp.product_type !== null) updatePayload.product_type = hp.product_type;

    // Strip protected fields
    for (const pf of PROTECTED_FIELDS) delete updatePayload[pf];
    // Re-allow pricing fields
    updatePayload.supplier_price = supplierPrice;
    updatePayload.cost_price = supplierPrice;
    updatePayload.selling_price = newSellingPrice;
    updatePayload.price = newSellingPrice;

    // Record price change in history if cost changed
    const oldCost = Number(localProduct.cost_price ?? 0);
    if (Math.abs(oldCost - supplierPrice) > 0.001) {
      await supabase.from("price_history").insert({
        product_id: localProduct.id,
        old_cost_price: oldCost,
        new_cost_price: supplierPrice,
        old_selling_price: Number(localProduct.selling_price ?? localProduct.price ?? 0),
        new_selling_price: newSellingPrice,
        markup_percentage: markupPct,
        changed_by: "realtime_sync",
      });
    }

    const { error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", localProduct.id);

    if (error) return { action: "skipped", error: error.message };
    return { action: "updated" };
  } else {
    // Insert new draft product
    const { data: existingSlugs } = await supabase
      .from("products")
      .select("slug")
      .not("slug", "is", null);

    const allSlugs = new Set((existingSlugs ?? []).map((r: { slug: string }) => r.slug));
    const baseSlug = slugify(hp.name) || `product-${hpId.slice(-8)}`;
    let finalSlug = baseSlug;
    if (allSlugs.has(finalSlug)) finalSlug = `${baseSlug}-${hpId.slice(-6)}`;
    if (allSlugs.has(finalSlug)) finalSlug = `${baseSlug}-${Date.now()}`;

    const newSellingPrice = applyMarkup(supplierPrice);

    const { error } = await supabase.from("products").insert({
      centralhub_product_id: hpId,
      source_product_id: hpId,
      source_name: hp.name,
      source_brand: brandName,
      brand: brandName,
      name: hp.name,
      slug: finalSlug,
      description: null,
      short_description: null,
      image_url: null,
      category_id: null,
      supplier_price: supplierPrice,
      cost_price: supplierPrice,
      selling_price: newSellingPrice,
      price: newSellingPrice,
      markup_percentage: 5,
      original_price: null,
      weight: hp.weight ?? null,
      unit: hp.unit ?? null,
      stock: hp.stock ?? 0,
      product_type: hp.product_type ?? null,
      is_active: true,
      is_deleted: false,
      is_featured: false,
      is_deal: false,
      is_new_arrival: true,
      is_bestseller: false,
      discount_percentage: 0,
      sold_count: 0,
      rating: 4.5,
      review_count: 0,
      approval_status: "draft",
      visibility_status: false,
      last_sync_at: now,
      created_at: now,
    });

    if (error) return { action: "skipped", error: error.message };
    return { action: "inserted" };
  }
}

async function applyProductDelete(
  supabase: ReturnType<typeof createClient>,
  hpId: string,
): Promise<{ action: "archived" | "skipped"; error?: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("products")
    .update({
      is_active: false,
      visibility_status: false,
      approval_status: "rejected",
      updated_at: now,
    })
    .eq("centralhub_product_id", hpId)
    .eq("is_deleted", false);

  if (error) return { action: "skipped", error: error.message };
  return { action: "archived" };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookSecret = Deno.env.get("CENTRALHUB_WEBHOOK_SECRET") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify webhook secret if configured (for POST from CentralHub)
    if (webhookSecret) {
      const incomingSecret = req.headers.get("X-Webhook-Secret") ?? "";
      // Only enforce for non-admin calls (admin calls use Bearer auth instead)
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ") && incomingSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({})) as WebhookBody;

    // ── status ───────────────────────────────────────────────────────────────
    if (body.action === "status") {
      const [todayEvents, failedEvents, lastEvent] = await Promise.all([
        supabase
          .from("realtime_sync_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase
          .from("realtime_sync_events")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase
          .from("realtime_sync_events")
          .select("id, event_type, status, error_message, processed_at, centralhub_product_id")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      return new Response(JSON.stringify({
        syncedToday: todayEvents.count ?? 0,
        failedToday: failedEvents.count ?? 0,
        recentEvents: lastEvent.data ?? [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── poll (fallback full sync trigger) ────────────────────────────────────
    if (body.action === "poll") {
      const hubUrlRaw = Deno.env.get("CENTRALHUB_API_URL") ?? "";
      const hubKey = Deno.env.get("CENTRALHUB_API_KEY") ?? "";

      if (!hubUrlRaw || !hubKey) {
        return new Response(JSON.stringify({ error: "CentralHub not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hub = createClient(normaliseHubUrl(hubUrlRaw), hubKey, {
        auth: { persistSession: false },
      });

      // Fetch products changed in last 10 minutes from CentralHub
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: changedProducts, error: fetchErr } = await hub
        .from("products")
        .select("id,name,price,stock,product_type,brand,weight,unit,slug,gtin,warehouse_location")
        .or(`updated_at.gte.${since},created_at.gte.${since}`)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const products = (changedProducts ?? []) as CentralHubProduct[];
      let updated = 0;
      let inserted = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const hp of products) {
        const result = await applyProductUpdate(supabase, hp);
        if (result.action === "updated") updated++;
        else if (result.action === "inserted") inserted++;
        else if (result.error) {
          failed++;
          errors.push(`${hp.name}: ${result.error}`);
          await logSyncEvent(supabase, hp.id, "UPDATE", "failed", null, result.error);
          continue;
        }
        await logSyncEvent(supabase, hp.id, "UPDATE", "success", { name: hp.name });
      }

      return new Response(JSON.stringify({
        polled: products.length,
        updated,
        inserted,
        failed,
        errors: errors.slice(0, 20),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── webhook: INSERT / UPDATE / DELETE from CentralHub ───────────────────
    const { type, record, old_record } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: "Missing type or action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "INSERT" || type === "UPDATE") {
      if (!record?.id) {
        return new Response(JSON.stringify({ error: "Missing record.id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await applyProductUpdate(supabase, record);

      if (result.error) {
        await logSyncEvent(supabase, record.id, type, "failed", { name: record.name }, result.error);
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await logSyncEvent(supabase, record.id, type, "success", { name: record.name, action: result.action });
      return new Response(JSON.stringify({ ok: true, action: result.action }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "DELETE") {
      const deletedId = old_record?.id ?? record?.id;
      if (!deletedId) {
        return new Response(JSON.stringify({ error: "Missing product id for DELETE" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await applyProductDelete(supabase, String(deletedId));

      if (result.error) {
        await logSyncEvent(supabase, String(deletedId), "DELETE", "failed", null, result.error);
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await logSyncEvent(supabase, String(deletedId), "DELETE", "success", null);
      return new Response(JSON.stringify({ ok: true, action: result.action }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
