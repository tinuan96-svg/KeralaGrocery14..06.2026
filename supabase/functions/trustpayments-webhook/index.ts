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
    // Trust Payments typically sends POST data.
    // It might be URL-encoded or JSON.
    const contentType = req.headers.get("content-type") || "";
    let payload: any;

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }

    console.log("[trustpayments-webhook] Received payload:", JSON.stringify(payload));

    // Common fields in Trust Payments notifications:
    // errorcode: "0" means success
    // orderreference: our order number
    // transactionreference: their unique ID
    // status: might be included

    const errorCode = payload.errorcode?.toString();
    const orderNumber = payload.orderreference;
    const transactionId = payload.transactionreference;

    if (!orderNumber) {
      return new Response("Missing orderreference", { status: 400 });
    }

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      gateway: "trustpayments",
      payload,
      order_number: orderNumber,
    });

    if (errorCode === "0") {
      // Success! Update order status
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, total, customer_phone, customer_name, wallet_amount, user_id")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (orderError || !order) {
        console.error("[trustpayments-webhook] Order not found:", orderNumber);
        return new Response("Order not found", { status: 404 });
      }

      // If already paid, don't re-process
      if (order.payment_status === "paid") {
        return new Response("OK", { status: 200 });
      }

      // 1. Update Order status
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_reference: transactionId,
          order_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // 2. Process wallet if used
      if (order.wallet_amount > 0 && order.user_id) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/wallet-payment`, {
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
        }).catch(err => console.error("[trustpayments-webhook] wallet-payment error:", err));
      }

      // 3. Send SMS confirmation
      if (order.customer_phone) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            phone: order.customer_phone,
            orderNumber: orderNumber,
          })
        }).catch(err => console.error("[trustpayments-webhook] SMS error:", err));
      }

      console.log(`[trustpayments-webhook] Order ${orderNumber} marked as PAID`);
    } else {
      console.warn(`[trustpayments-webhook] Payment failed for ${orderNumber}. Error Code: ${errorCode}`);

      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_reference: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("[trustpayments-webhook] error:", error);
    return new Response(error.message, { status: 500 });
  }
});
