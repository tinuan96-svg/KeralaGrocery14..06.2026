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
    console.log("Processing smart restock reminders...");

    // 1. Find recent purchases of "Consumable" essentials (Rice, Oil, Flour, Spices)
    // We look for items purchased 20-30 days ago that haven't been purchased since.
    const { data: essentials, error } = await supabase.rpc('get_products_for_restock_check');

    if (error) throw error;

    let sentCount = 0;
    const errors: string[] = [];

    for (const item of essentials ?? []) {
      // 2. Check if user already got a restock reminder recently (within 7 days)
      const { data: recentReminder } = await supabase
        .from("abandoned_cart_recovery_logs") // Reuse this log table for simplicity or use a generic notification log
        .select("id")
        .eq("user_id", item.user_id)
        .eq("status", "restock_reminder")
        .gte("last_notified_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (recentReminder) continue;

      // 3. Send SMS
      const message = `Hi ${item.customer_name}, running low on ${item.product_name}? 🛒 Tap here to quickly restock your essentials and get next-day delivery: https://keralagrocery.com/products/${item.slug}`;

      try {
        const smsRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ phone: item.phone, message }),
        });

        const smsData = await smsRes.json();

        if (smsData.success) {
          // 4. Log the notification
          await supabase.from("abandoned_cart_recovery_logs").insert({
            user_id: item.user_id,
            status: "restock_reminder"
          });
          sentCount++;
        }
      } catch (err) {
        errors.push(`${item.customer_name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: essentials?.length ?? 0, sent: sentCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
