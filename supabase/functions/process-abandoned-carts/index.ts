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
    console.log("Processing abandoned carts (WhatsApp Recovery)...");

    // 1. Get abandoned carts from the view
    const { data: abandonedCarts, error: viewError } = await supabase
      .from("view_abandoned_carts")
      .select("*");

    if (viewError) throw viewError;

    let sentCount = 0;
    const errors: string[] = [];

    for (const cart of abandonedCarts ?? []) {
      // 2. Check if already notified for this specific "cart cycle" (within last 24h)
      const { data: alreadyNotified } = await supabase
        .from("abandoned_cart_recovery_logs")
        .select("id")
        .eq("user_id", cart.user_id)
        .gte("last_notified_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (alreadyNotified) continue;

      // 3. Send WhatsApp via the central notification function
      const message = `🛒 *Your items are waiting!* 🛒\n\nHi ${cart.customer_name}, we noticed you left some authentic Kerala favorites in your cart. \n\n🎁 Use code *RECOVER5* for £5 OFF your order over £45!\n\nFinish shopping here: https://keralagrocery.com/cart`;

      try {
        const notifyRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            phone: cart.phone,
            message,
            channel: 'whatsapp' // Force WhatsApp for abandoned carts as per suggestion
          }),
        });

        const notifyData = await notifyRes.json();

        if (notifyData.success) {
          // 4. Log the notification
          await supabase.from("abandoned_cart_recovery_logs").insert({
            user_id: cart.user_id,
            cart_total: cart.cart_total,
            status: "sent"
          });
          sentCount++;
          console.log(`[AbandonedCart] Notified ${cart.customer_name} via WhatsApp`);
        } else {
          throw new Error(notifyData.error || "WhatsApp delivery failed");
        }
      } catch (err) {
        console.error(`Failed to notify user ${cart.user_id}:`, err);
        errors.push(`${cart.customer_name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: abandonedCarts?.length ?? 0, sent: sentCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
