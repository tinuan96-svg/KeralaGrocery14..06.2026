import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.12.0";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!STRIPE_SECRET_KEY) {
    return new Response("Stripe secret key not configured", { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    const body = await req.text();
    if (STRIPE_WEBHOOK_SECRET && signature) {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } else {
      event = JSON.parse(body);
      console.warn("[stripe-webhook] Signature verification skipped — STRIPE_WEBHOOK_SECRET not set");
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object;
  const orderNumber = session.client_reference_id || session.metadata?.orderNumber;

  console.log(`[stripe-webhook] Event: ${event.type}, Order: ${orderNumber}`);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (!orderNumber) {
      console.error("[stripe-webhook] No order number found in session");
      return new Response("No order number", { status: 200 }); // Still return 200 to Stripe
    }

    // Update Order Status
    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        payment_reference: session.payment_intent,
      })
      .or(`order_number.eq.${orderNumber},original_order_number.eq.${orderNumber}`)
      .select("*, order_items(*)")
      .maybeSingle();

    if (error) {
      console.error("[stripe-webhook] DB update failed:", error);
      return new Response("Database error", { status: 500 });
    }

    // Update payment session status
    await supabase
      .from("payment_sessions")
      .update({ status: "paid" })
      .eq("order_number", orderNumber);

    // Trigger post-payment actions (Sync to CentralHub, Notifications, etc.)
    if (updatedOrder) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const promises = [];

      // 1. CentralHub Sync
      const centralhubWebhookUrl = Deno.env.get("CENTRALHUB_ORDER_WEBHOOK_URL") || 'https://centralhub.network/api/sync-orders';
      const centralhubSecret = Deno.env.get("CENTRALHUB_WEBHOOK_SECRET");
      if (centralhubWebhookUrl) {
        promises.push(
          fetch(centralhubWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-webhook-secret": centralhubSecret || "" },
            body: JSON.stringify({
              table: "orders",
              type: "INSERT",
              store_slug: "keralagrocery",
              record: {
                ...updatedOrder,
                status: 'confirmed',
                items: updatedOrder.order_items,
              },
            }),
          }).catch(e => console.error("[stripe-webhook] CentralHub sync error:", e))
        );
      }

      // 2. Wallet Payment Processing
      const walletAmt = parseFloat(updatedOrder.wallet_amount?.toString() ?? "0");
      if (walletAmt > 0 && updatedOrder.user_id) {
        promises.push(
          fetch(`${supabaseUrl}/functions/v1/wallet-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              order_id: updatedOrder.id,
              wallet_amount: walletAmt,
              user_id: updatedOrder.user_id
            }),
          }).catch(e => console.error("[stripe-webhook] Wallet error:", e))
        );
      }

      // 3. WhatsApp Notification
      if (updatedOrder.customer_phone) {
        promises.push(
          fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              customer_name: updatedOrder.customer_name,
              user_phone: updatedOrder.customer_phone,
              order_id: updatedOrder.id,
              order_number: updatedOrder.order_number,
              items: (updatedOrder.order_items ?? []).map((i: any) => ({ name: i.product_name, qty: i.quantity })),
              total_amount: updatedOrder.total,
            }),
          }).catch(e => console.error("[stripe-webhook] WhatsApp error:", e))
        );
      }

      await Promise.allSettled(promises);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
