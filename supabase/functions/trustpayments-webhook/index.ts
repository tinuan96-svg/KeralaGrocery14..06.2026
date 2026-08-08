import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: any;

    // Trust Payments can send JSON or Form Data depending on portal config
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }

    console.log("[trustpayments-webhook] Received notification:", JSON.stringify(payload));

    const errorCode = payload.errorcode?.toString();
    const orderNumber = payload.orderreference;
    const transactionId = payload.transactionreference;

    if (!orderNumber) {
      console.error("[trustpayments-webhook] Missing orderreference in payload");
      return new Response("Missing orderreference", { status: 400 });
    }

    // 1. Log the webhook immediately for debugging/audit
    await supabase.from("webhook_logs").insert({
      gateway: "trustpayments",
      payload,
      order_number: orderNumber,
    });

    // 2. Process based on Error Code (0 = Success)
    // See Scenarios: https://help.trustpayments.com/hc/en-us/articles/4402689992593-3-Configure-webhooks
    if (errorCode === "0") {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, total, customer_phone, customer_name, wallet_amount, user_id, payment_status")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (orderError) {
        console.error("[trustpayments-webhook] DB Error fetching order:", orderError);
        return new Response("Internal Error", { status: 500 });
      }

      if (!order) {
        console.error("[trustpayments-webhook] Order not found for reference:", orderNumber);
        return new Response("Order not found", { status: 404 });
      }

      // Avoid double-processing if already paid
      if (order.payment_status === "paid") {
        console.log(`[trustpayments-webhook] Order ${orderNumber} already marked as paid.`);
        return new Response("OK", { status: 200 });
      }

      // Update Order to PAID
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_reference: transactionId || null,
          order_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[trustpayments-webhook] Failed to update order status:", updateError);
        return new Response("Update failed", { status: 500 });
      }

      // ── ASYNCHRONOUS TASKS (Don't block the response) ──

      // Process wallet payment if applicable
      if (order.wallet_amount > 0 && order.user_id) {
        EdgeRuntime.waitUntil(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/wallet-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              order_id: order.id,
              wallet_amount: order.wallet_amount,
              user_id: order.user_id
            })
          }).catch(err => console.error("[trustpayments-webhook] wallet-payment task error:", err))
        );
      }

      // Send SMS notification
      if (order.customer_phone) {
        EdgeRuntime.waitUntil(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              phone: order.customer_phone,
              orderNumber: orderNumber,
            })
          }).catch(err => console.error("[trustpayments-webhook] SMS task error:", err))
        );
      }

      console.log(`[trustpayments-webhook] Order ${orderNumber} processed successfully.`);

    } else {
      // errorCode is not 0 (e.g. 70000 = Decline)
      console.warn(`[trustpayments-webhook] Payment not successful for ${orderNumber}. Code: ${errorCode}`);

      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_reference: transactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber);
    }

    // Always respond with 200 OK within 8 seconds as per Trust Payments documentation
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error("[trustpayments-webhook] Fatal error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
