import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Trust Payments sends URL notifications as POST with form-encoded or JSON body
    let notification: Record<string, string> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      // Trust Payments notification can be a flat object or nested
      notification = body?.notification || body;
    } else {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        notification[key] = value.toString();
      }
    }

    console.log("[trustpayments-webhook] Notification received:", JSON.stringify(notification));

    // Extract key fields from the notification
    const orderReference = notification.orderreference || notification.orderReference || "";
    const transactionReference = notification.transactionreference || notification.transactionReference || "";
    const settleStatus = notification.settlestatus || notification.settleStatus || "";
    const errorData = notification.errormessage || notification.errorMessage || "";
    const requestType = notification.requesttypedescription || notification.requestTypeDescription || "";

    // The orderreference maps to our order_number
    if (!orderReference) {
      console.error("[trustpayments-webhook] No orderreference in notification");
      return new Response("OK", { status: 200 });
    }

    // Determine if payment was successful
    // settlestatus "0" = auto settle (success), "1" = manual, "2" = suspended, "3" = failed
    const isSuccess = requestType === "AUTH" && (settleStatus === "0" || settleStatus === "1");

    if (isSuccess) {
      // Update Order Status
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "confirmed",
          payment_reference: transactionReference,
        })
        .or(`order_number.eq.${orderReference},original_order_number.eq.${orderReference}`)
        .select("*, order_items(*)")
        .maybeSingle();

      if (error) {
        console.error("[trustpayments-webhook] DB update failed:", error);
        return new Response("Database error", { status: 500 });
      }

      // Update payment session status
      await supabase
        .from("payment_sessions")
        .update({ status: "paid", gateway_session_id: transactionReference })
        .eq("order_number", orderReference);

      // Trigger post-payment actions
      if (updatedOrder) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const promises = [];

        // 1. CentralHub Sync
        const centralhubWebhookUrl = Deno.env.get("CENTRALHUB_ORDER_WEBHOOK_URL") || "https://centralhub.network/api/sync-orders";
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
                  status: "confirmed",
                  items: updatedOrder.order_items,
                },
              }),
            }).catch((e) => console.error("[trustpayments-webhook] CentralHub sync error:", e))
          );
        }

        // 2. Wallet Payment Processing
        const walletAmt = parseFloat(updatedOrder.wallet_amount?.toString() ?? "0");
        if (walletAmt > 0 && updatedOrder.user_id) {
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/wallet-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                order_id: updatedOrder.id,
                wallet_amount: walletAmt,
                user_id: updatedOrder.user_id,
              }),
            }).catch((e) => console.error("[trustpayments-webhook] Wallet error:", e))
          );
        }

        // 3. WhatsApp Notification
        if (updatedOrder.customer_phone) {
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                customer_name: updatedOrder.customer_name,
                user_phone: updatedOrder.customer_phone,
                order_id: updatedOrder.id,
                order_number: updatedOrder.order_number,
                items: (updatedOrder.order_items ?? []).map((i: any) => ({ name: i.product_name, qty: i.quantity })),
                total_amount: updatedOrder.total,
              }),
            }).catch((e) => console.error("[trustpayments-webhook] WhatsApp error:", e))
          );
        }

        await Promise.allSettled(promises);
      }
    } else if (settleStatus === "2" || settleStatus === "3" || errorData) {
      // Payment declined or failed
      console.warn(`[trustpayments-webhook] Payment failed for order ${orderReference}: ${errorData}`);
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .or(`order_number.eq.${orderReference},original_order_number.eq.${orderReference}`);

      await supabase
        .from("payment_sessions")
        .update({ status: "failed" })
        .eq("order_number", orderReference);
    }

    // Always return 200 to acknowledge receipt
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[trustpayments-webhook] error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
