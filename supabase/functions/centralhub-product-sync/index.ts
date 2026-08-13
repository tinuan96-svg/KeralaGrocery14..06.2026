/**
 * centralhub-product-sync
 *
 * This edge function runs on CentralHub's Supabase project and pushes products
 * directly into KeralaGrocery's Supabase database. It is NOT deployed from
 * KeralaGrocery's codebase — this file exists as documentation of the
 * interface KeralaGrocery expects.
 *
 * KeralaGrocery calls this function with { action: "poll" } to request a push
 * sync, and with { action: "diagnose" } to test the connection.
 *
 * The function is triggered every 5 minutes by a pg_cron job on CentralHub.
 *
 * Fields pushed per product (only these are sent):
 *   id, name, slug, brand, brand_id, price, sale_price, stock, stock_quantity,
 *   in_stock, unit, weight, is_active, is_published, status, is_archived,
 *   attribute, variants, tags, gtin, updated_at
 *
 * Fields NOT pushed (KeralaGrocery owns these locally):
 *   compare_at_price, description, desc, short_description, image_url, image,
 *   category_name, category, category_id, department, subcategory, sku,
 *   warehouse_location, seo_title, seo_description
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    if (action === "diagnose") {
      return new Response(
        JSON.stringify({ ok: true, message: "centralhub-product-sync is reachable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "poll") {
      return new Response(
        JSON.stringify({ ok: true, message: "Push sync requested" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
