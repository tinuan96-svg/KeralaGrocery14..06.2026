/**
 * centralhub-webhook Edge Function
 *
 * Receives real-time updates from CentralHub when a product changes.
 *
 * Expected headers:
 *   x-webhook-secret: Shared secret matching CENTRALHUB_WEBHOOK_SECRET
 *
 * Expected payload:
 *   { type: 'INSERT' | 'UPDATE' | 'DELETE', record: CentralHubProduct, old_record?: CentralHubProduct }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-webhook-secret",
};

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

function applyMarkup(supplierPrice: number): number {
  const sellingPrice = supplierPrice * 1.05;
  return Math.ceil(sellingPrice * 10) / 10;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("CENTRALHUB_WEBHOOK_SECRET");
    const incomingSecret = req.headers.get("x-webhook-secret");

    if (!webhookSecret || incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, record, old_record } = await req.json();

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Invalid payload: record.id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const hp = record;
    const hpId = String(hp.id);
    const hpSku = hp.sku || `CH-${hpId.slice(0, 8)}`;
    const now = new Date().toISOString();

    if (type === 'DELETE') {
      const { error } = await supabase
        .from("products")
        .update({ is_deleted: true, updated_at: now })
        .eq("centralhub_product_id", hpId);

      return new Response(JSON.stringify({ success: true, action: 'deleted' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Upsert Logic ────────────────────────────────────────────────────────

    // Check for existing local product to detect admin overrides
    const { data: exRow } = await supabase
      .from("products")
      .select("id, name, source_name, sku, cost_price, selling_price, supplier_price, price")
      .or(`sku.eq.${hpSku},centralhub_product_id.eq.${hpId}`)
      .maybeSingle();

    const supplierPrice = Number(hp.price ?? 0);
    const sellingPrice = applyMarkup(supplierPrice);

    const upsertPayload: any = {
      centralhub_product_id: hpId,
      sku: hpSku,
      source_name: hp.name,
      source_brand: hp.brand ?? null,
      brand: hp.brand ?? null,
      department: hp.department,
      main_category: hp.department,
      category: hp.subcategory,
      sub_category: hp.subcategory,
      weight_kg: hp.weight_kg ?? hp.weight ?? 0.5,
      weight_grams: hp.weight_grams ?? 500,
      warehouse_location: hp.warehouse_location || null,
      supplier_price: supplierPrice,
      cost_price: supplierPrice,
      selling_price: sellingPrice,
      price: sellingPrice,
      markup_percentage: 5,
      last_sync_at: now,
      updated_at: now,
      is_deleted: false,
      is_active: true,
      approval_status: 'approved',
      visibility_status: true,
    };

    if (exRow) {
      // Keep admin-edited name if applicable
      const nameIsAdminEdited = exRow.source_name != null && exRow.name !== exRow.source_name;
      if (!nameIsAdminEdited) {
        upsertPayload.name = hp.name;
      }

      // Merge stock/unit
      if (hp.stock !== undefined) upsertPayload.stock = hp.stock;
      if (hp.unit !== undefined) upsertPayload.unit = hp.unit;

      // Price History
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
          changed_by: "webhook",
        });
      }
    } else {
      // New Product
      upsertPayload.name = hp.name;
      upsertPayload.slug = hp.slug || slugify(hp.name) || `product-${hpId.slice(-8)}`;
      upsertPayload.stock = hp.stock ?? 0;
      upsertPayload.unit = hp.unit ?? null;
      upsertPayload.created_at = now;
    }

    const { error: upsertErr } = await supabase
      .from("products")
      .upsert(upsertPayload, { onConflict: 'sku' });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, action: type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
