import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Worldpay webhooks do NOT use CORS — they are server-to-server.
// We still handle OPTIONS for safety but do not set permissive CORS headers here.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Read the raw body once — needed for both HMAC verification and JSON parsing
  const rawBody = await req.text();

  // ── HMAC Signature Verification ─────────────────────────────────────────────
  // Worldpay sends a signature in the X-Worldpay-Signature header as a
  // hex-encoded HMAC-SHA256 of the raw request body.
  //
  // IMPORTANT: WORLDPAY_WEBHOOK_SECRET must be the signing secret from the
  // Worldpay dashboard (Settings → Webhooks) — NOT a URL.
  // A URL-format value means the secret is misconfigured; verification is skipped
  // with a prominent error so payments are not permanently blocked.
  const webhookSecret = Deno.env.get("WORLDPAY_WEBHOOK_SECRET");
  const secretIsHmacKey = !!webhookSecret && !webhookSecret.startsWith("http");

  if (secretIsHmacKey) {
    const providedSig = req.headers.get("X-Worldpay-Signature") ?? "";
    const isValid = await verifyHmac(webhookSecret, rawBody, providedSig);
    if (!isValid) {
      console.error(
        `[worldpay-webhook] HMAC verification FAILED — sig: ${providedSig.slice(0, 16)}... | bodyLen: ${rawBody.length}`
      );
      await logWebhookEvent(supabase, null, "signature_invalid", "error",
        "HMAC signature mismatch — request rejected", rawBody.slice(0, 500));
      return new Response("Forbidden", { status: 403 });
    }
    console.log("[worldpay-webhook] HMAC signature verified OK");
  } else if (webhookSecret?.startsWith("http")) {
    // Misconfigured: the secret is a URL, not a signing key.
    // Process without verification and alert loudly so the admin can fix it.
    console.error(
      "[worldpay-webhook] WORLDPAY_WEBHOOK_SECRET is set to a URL — MISCONFIGURED.",
      "Set it to the signing secret from Worldpay dashboard > Settings > Webhooks.",
      "Signature verification SKIPPED."
    );
  } else {
    console.warn("[worldpay-webhook] WORLDPAY_WEBHOOK_SECRET not configured — signature verification skipped");
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      await logWebhookEvent(supabase, null, "parse_error", "error", "Invalid JSON body", rawBody.slice(0, 500));
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const eventDetails = body.eventDetails as Record<string, unknown> | undefined;

    if (!eventDetails) {
      await logWebhookEvent(supabase, null, "missing_event_details", "error", "No eventDetails in payload", rawBody.slice(0, 500));
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400 });
    }

    const { type, transactionReference, downstreamReference } = eventDetails as {
      type: string;
      transactionReference: string;
      downstreamReference?: string;
    };

    console.log(`[worldpay-webhook] event=${type} order=${transactionReference}`);

    // Log every incoming event before processing
    const logId = await logWebhookEvent(supabase, transactionReference, type, "processing", null, null);

    if (type === "authorized" || type === "sentForSettlement") {
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          payment_status:    "paid",
          order_status:      "processing",
          payment_reference: downstreamReference || transactionReference,
        })
        .eq("order_number", transactionReference)
        .select("id, customer_name, customer_phone, total, order_number, user_id, wallet_amount")
        .maybeSingle();

      if (!updatedOrder && !error) {
        console.warn(`[worldpay-webhook] order not found for reference: ${transactionReference}`);
        await updateWebhookLog(supabase, logId, "ignored", `Order ${transactionReference} not found in database`);
        return new Response(JSON.stringify({ error: "Order not found" }), { status: 200 });
      }

      if (error) {
        console.error("[worldpay-webhook] DB update failed:", error);
        await updateWebhookLog(supabase, logId, "error", `DB update failed: ${error.message}`);
        // Return 500 so Worldpay retries
        return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
      }

      // Update payment session status
      await supabase
        .from("payment_sessions")
        .update({ status: "paid" })
        .eq("order_number", transactionReference);

      await updateWebhookLog(supabase, logId, "success", null);

      // Send confirmation notifications asynchronously (WhatsApp & Push)
      if (updatedOrder) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const promises = [];

        // 0. Handle wallet deduction if part of the payment
        const walletAmt = parseFloat(updatedOrder.wallet_amount?.toString() ?? "0");
        if (walletAmt > 0 && updatedOrder.user_id) {
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/wallet-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                order_id:      updatedOrder.id,
                wallet_amount: walletAmt,
                user_id:       updatedOrder.user_id
              }),
            }).then(async res => {
              const json = await res.json().catch(() => ({}));
              if (!res.ok) console.error("[worldpay-webhook] Wallet deduction failed:", json.error);
              else console.log("[worldpay-webhook] Wallet deduction successful");
            }).catch(err => console.error("[worldpay-webhook] Wallet deduction error:", err))
          );
        }

        // 1. Send WhatsApp
        if (updatedOrder.customer_phone) {
          const { data: items } = await supabase
            .from("order_items")
            .select("product_name, quantity")
            .eq("order_id", updatedOrder.id);

          promises.push(
            fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                customer_name:  updatedOrder.customer_name,
                user_phone:     updatedOrder.customer_phone,
                order_id:       updatedOrder.id,
                order_number:   updatedOrder.order_number,
                items:          (items ?? []).map(i => ({ name: i.product_name, qty: i.quantity })),
                total_amount:   updatedOrder.total,
              }),
            }).then(async res => {
              const json = await res.json().catch(() => ({}));
              if (!json.success) console.error("[worldpay-webhook] WhatsApp failed:", json.error);
            }).catch(err => console.error("[worldpay-webhook] WhatsApp error:", err))
          );
        }

        // 2. Send Push Notification
        if (updatedOrder.user_id) {
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                user_id: updatedOrder.user_id,
                title: "Payment Confirmed! ✅",
                body: `Your order #${updatedOrder.order_number} for £${updatedOrder.total} is now being processed.`,
                data: {
                  order_id: updatedOrder.id,
                  order_number: updatedOrder.order_number,
                  url: "https://keralagrocery.com/orders"
                }
              }),
            }).catch(err => console.error("[worldpay-webhook] Push error:", err))
          );
        }

        // Wait for notifications to be dispatched before returning
        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      }

    } else if (type === "refused" || type === "error" || type === "cancelled") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("order_number", transactionReference);

      await supabase
        .from("payment_sessions")
        .update({ status: "failed" })
        .eq("order_number", transactionReference);

      // Log the failure to payment_errors for admin diagnostics
      await supabase.from("payment_errors").insert({
        order_number:  transactionReference,
        source:        "worldpay-webhook",
        error_message: `Payment ${type}`,
        raw_payload:   rawBody.slice(0, 1000),
      });

      await updateWebhookLog(supabase, logId, type === "cancelled" ? "cancelled" : "failed",
        `Worldpay event: ${type}`);

    } else if (type === "chargebackReceived") {
      await supabase
        .from("orders")
        .update({ payment_status: "refunded", order_status: "cancelled" })
        .eq("order_number", transactionReference);

      await supabase.from("payment_errors").insert({
        order_number:  transactionReference,
        source:        "worldpay-webhook",
        error_message: "Chargeback received",
        raw_payload:   rawBody.slice(0, 1000),
      });

      await updateWebhookLog(supabase, logId, "chargeback", "Chargeback received");

    } else if (type === "authorizationExpired") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", order_status: "cancelled" })
        .eq("order_number", transactionReference);

      await updateWebhookLog(supabase, logId, "expired", "Authorization expired");

    } else {
      // Unknown event type — log it but acknowledge
      await updateWebhookLog(supabase, logId, "unhandled", `Unhandled event type: ${type}`);
      console.warn(`[worldpay-webhook] unhandled event type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[worldpay-webhook] unexpected error:", msg);
    await logWebhookEvent(supabase, null, "uncaught_error", "error", msg, rawBody.slice(0, 500))
      .catch(() => {});
    // Return 500 so Worldpay retries delivery
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500 });
  }
});

// ── HMAC-SHA256 verification ──────────────────────────────────────────────────

async function verifyHmac(secret: string, body: string, providedHex: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const sigHex  = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    // Constant-time comparison
    if (sigHex.length !== providedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < sigHex.length; i++) diff |= sigHex.charCodeAt(i) ^ providedHex.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

// ── Webhook log helpers ───────────────────────────────────────────────────────

async function logWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  orderNumber: string | null,
  eventType: string,
  status: string,
  errorMessage: string | null,
  rawPayload: string | null
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("webhook_logs")
      .insert({ order_number: orderNumber, event_type: eventType, status, error_message: errorMessage, raw_payload: rawPayload })
      .select("id")
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function updateWebhookLog(
  supabase: ReturnType<typeof createClient>,
  logId: string | null,
  status: string,
  errorMessage: string | null
) {
  if (!logId) return;
  await supabase
    .from("webhook_logs")
    .update({ status, error_message: errorMessage, processed_at: new Date().toISOString() })
    .eq("id", logId);
}
