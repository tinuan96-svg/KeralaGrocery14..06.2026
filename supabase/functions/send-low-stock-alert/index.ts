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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const adminPhone = Deno.env.get("ADMIN_NOTIFY_PHONE");
    if (!adminPhone) {
      throw new Error("ADMIN_NOTIFY_PHONE secret is not set.");
    }

    // 1. Fetch low stock items
    const { data: lowStockItems, error } = await supabase
      .from("products")
      .select("name, stock, stock_quantity, brand")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .lte("stock", 10)
      .order("stock", { ascending: true })
      .limit(15);

    if (error) throw error;

    if (!lowStockItems || lowStockItems.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No low stock items found." }));
    }

    // 2. Format message
    let message = "⚠️ Kerala Grocery Low Stock Alert:\n\n";
    lowStockItems.forEach(item => {
      const qty = item.stock_quantity ?? item.stock ?? 0;
      message += `• ${item.name} (${item.brand || 'No Brand'}): ${qty} left\n`;
    });
    message += "\nPlease check supplier orders.";

    // 3. Send SMS via our unified send-sms function
    const smsRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ phone: adminPhone, message }),
    });

    const smsData = await smsRes.json();

    return new Response(
      JSON.stringify({ success: smsData.success, itemsCount: lowStockItems.length, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
