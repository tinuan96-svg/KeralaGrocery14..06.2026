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
    console.log("Checking for expiring cashback credits...");

    // 1. Get users with credit expiring in 3 days from the view
    const { data: expiring, error: viewError } = await supabase
      .from("view_expiring_cashback")
      .select("*");

    if (viewError) throw viewError;

    let sentCount = 0;
    const errors: string[] = [];

    for (const item of expiring ?? []) {
      const message = `Hi ${item.customer_name}, you have £${Number(item.cashback_amount).toFixed(2)} in Kerala Grocery credit expiring in 3 days! ⏳ Don't miss out—use it on your next order: https://keralagrocery.com/products`;

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
          sentCount++;
        }
      } catch (err) {
        errors.push(`${item.customer_name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, identified: expiring?.length ?? 0, notified: sentCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
