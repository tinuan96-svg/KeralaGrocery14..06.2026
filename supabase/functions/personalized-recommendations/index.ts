/**
 * personalized-recommendations Edge Function
 *
 * Generates personalized product recommendations based on user's order history.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authErr || !user) {
      // Fallback: return best sellers for guest
      const { data: trending } = await supabase
        .from("products")
        .select("id, name, slug, image_url, price, rating, review_count, discount_percentage")
        .eq("approval_status", "approved")
        .eq("visibility_status", true)
        .order("sold_count", { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({ recommendations: trending || [], type: 'trending' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get user's recent order items
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!orders || orders.length === 0) {
      // New user: return new arrivals
      const { data: newArrivals } = await supabase
        .from("products")
        .select("id, name, slug, image_url, price, rating, review_count, discount_percentage")
        .eq("approval_status", "approved")
        .eq("visibility_status", true)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({ recommendations: newArrivals || [], type: 'new_arrivals' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderIds = orders.map(o => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, products(category_id)")
      .in("order_id", orderIds);

    // 2. Identify top categories
    const categoryCounts: Record<string, number> = {};
    const purchasedProductIds = new Set<string>();

    for (const item of (items ?? []) as any) {
      if (item.product_id) purchasedProductIds.add(item.product_id);
      const catId = item.products?.category_id;
      if (catId) {
        categoryCounts[catId] = (categoryCounts[catId] ?? 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0])
      .slice(0, 2);

    // 3. Find top products in these categories that the user hasn't bought yet
    const { data: recommendations } = await supabase
      .from("products")
      .select("id, name, slug, image_url, price, rating, review_count, discount_percentage")
      .in("category_id", topCategories)
      .not("id", "in", `(${Array.from(purchasedProductIds).join(',')})`)
      .eq("approval_status", "approved")
      .eq("visibility_status", true)
      .order("sold_count", { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      recommendations: recommendations || [],
      type: 'personalized',
      debug: { categories: topCategories }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
