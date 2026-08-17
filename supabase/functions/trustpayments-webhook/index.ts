import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Trust Payments sends URL notifications as POST with form-encoded data
    const contentType = req.headers.get("content-type") || "";
    let notification: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      const body = await req.json();
      notification = body?.notification || body;
      for (const k of Object.keys(notification)) {
        if (typeof notification[k] !== "string") notification[k] = String(notification[k]);
      }
    } else {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        notification[key] = value.toString();
      }
    }

    // --- Extract all fields ---
    const orderReference = notification.orderreference || "";
    const transactionReference = notification.transactionreference || "";
    const settleStatus = notification.settlestatus || "";
    const baseAmount = notification.baseamount || "";
    const currencyIso3a = notification.currencyiso3a || "";
    const requestType = notification.requesttypedescription || "";
    const errorCode = notification.errorcode || "";
    const errorData = notification.error || notification.errormessage || "";
    const liveStatus = notification.livestatus || "";
    const siteReference = notification.sitereference || "";
    const paymentTypeDescription = notification.paymenttypedescription || "";
    const authCode = notification.authcode || "";
    const acquirerResponseCode = notification.acquirerresponsecode || "";
    const acquirerResponseMessage = notification.acquirerresponsemessage || "";
    const parentTransactionReference = notification.parenttransactionreference || "";
    const responseSiteSecurity = notification.responsesitesecurity || "";

    console.log("[trustpayments-webhook] Received notification:", JSON.stringify({
      orderreference: orderReference,
      transactionreference: transactionReference,
      settlestatus: settleStatus,
      baseamount: baseAmount,
      currencyiso3a: currencyIso3a,
      requesttypedescription: requestType,
      errorcode: errorCode,
      sitereference: siteReference,
      livestatus: liveStatus,
    }));

    // --- 1. Verify notification security (responsesitesecurity hash) ---
    const notificationPassword = Deno.env.get("TRUSTPAYMENTS_NOTIFICATION_PASSWORD");

    if (notificationPassword && responseSiteSecurity) {
      const excludedKeys = new Set(["responsesitesecurity", "notificationreference"]);
      const sortedKeys = Object.keys(notification)
        .filter((k) => !excludedKeys.has(k) && notification[k] !== "")
        .sort();

      const hashInput = sortedKeys.map((k) => decodeURIComponent(notification[k])).join("") + notificationPassword;

      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(hashInput)
      );
      const hashArray = new Uint8Array(hashBuffer);
      const calculatedHash = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");

      if (calculatedHash !== responseSiteSecurity) {
        console.error("[trustpayments-webhook] Security hash mismatch.");
        return new Response("Security verification failed", { status: 400 });
      }

      console.log("[trustpayments-webhook] Security hash verified OK");
    } else if (!notificationPassword) {
      console.warn("[trustpayments-webhook] TRUSTPAYMENTS_NOTIFICATION_PASSWORD not configured. Skipping security verification.");
    }

    // --- 2. Validate required fields ---
    if (!orderReference || !siteReference || !requestType) {
      console.error("[trustpayments-webhook] Missing required fields");
      return new Response("Missing required fields", { status: 400 });
    }

    // --- 3. Verify site reference ---
    const expectedSiteRef = Deno.env.get("TRUSTPAYMENTS_SITE_REFERENCE");
    if (expectedSiteRef && siteReference !== expectedSiteRef) {
      console.error(`[trustpayments-webhook] Site reference mismatch. Expected: ${expectedSiteRef}, Got: ${siteReference}`);
      return new Response("Site reference mismatch", { status: 400 });
    }

    // --- 4. Only process AUTH requests ---
    if (requestType !== "AUTH") {
      console.log(`[trustpayments-webhook] Ignoring non-AUTH request type: ${requestType}`);
      return new Response("OK", { status: 200 });
    }

    // --- 5. Find the order ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .or(`order_number.eq.${orderReference},original_order_number.eq.${orderReference}`)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`[trustpayments-webhook] Order not found: ${orderReference}`, orderError);
      return new Response("Order not found", { status: 200 });
    }

    // --- 6. Prevent duplicate processing ---
    if (order.payment_status === "paid" && order.payment_reference === transactionReference) {
      console.log(`[trustpayments-webhook] Duplicate notification for already-paid order ${orderReference}. Skipping.`);
      return new Response("OK", { status: 200 });
    }

    // --- 7. Amount validation (integer pence comparison, no floats) ---
    const expectedAmountPence = Math.round(parseFloat(order.total.toString()) * 100);
    const notificationAmountPence = parseInt(baseAmount, 10);

    if (isNaN(notificationAmountPence) || notificationAmountPence !== expectedAmountPence) {
      console.error(`[trustpayments-webhook] Amount mismatch. Expected: ${expectedAmountPence}p, Got: ${notificationAmountPence}p`);
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return new Response("Amount mismatch", { status: 400 });
    }

    // --- 8. Currency validation ---
    if (currencyIso3a && currencyIso3a !== "GBP") {
      console.error(`[trustpayments-webhook] Currency mismatch. Expected GBP, Got: ${currencyIso3a}`);
      return new Response("Currency mismatch", { status: 400 });
    }

    // --- 9. Determine payment status from Trust Payments values ---
    // errorcode "0" = OK (no error). Any non-zero errorcode = problem.
    // settlestatus: 0=pending settlement, 1=manual settlement, 2=suspended, 10=settling, 100=settled
    // For AUTH, errorcode 0 means authorisation was successful.
    // Payment is "authorised" when errorcode=0, regardless of settlestatus.
    // Settlement status is separate from authorisation status.

    const isAuthorised = errorCode === "0" && settleStatus !== "2";

    if (!isAuthorised) {
      // Payment declined, failed, or suspended
      const failReason = errorData || acquirerResponseMessage || `errorcode=${errorCode}, settlestatus=${settleStatus}`;
      console.warn(`[trustpayments-webhook] Payment not authorised for order ${orderReference}: ${failReason}`);

      await supabase.from("orders").update({
        payment_status: "failed",
      }).eq("id", order.id);

      await supabase.from("payment_sessions").update({
        status: "failed",
        gateway_session_id: transactionReference,
      }).eq("order_number", orderReference);

      return new Response("OK", { status: 200 });
    }

    // --- 10. Map settle status to payment status ---
    // Authorisation successful. Map settlement status:
    // 0 = pending settlement → payment_status = "paid" (authorised, pending settlement)
    // 1 = manual settlement → payment_status = "paid" (authorised, manual settle)
    // 10 = settling → payment_status = "paid"
    // 100 = settled → payment_status = "paid" (fully settled)
    // 2 = suspended → payment_status = "suspended" (shouldn't reach here since we excluded it above)
    let paymentStatus = "paid";

    if (settleStatus === "2") {
      paymentStatus = "suspended";
    }

    // --- 11. Generate confirmed order number for paid orders ---
    let confirmedOrderNumber = order.confirmed_order_number || null;
    if (paymentStatus === "paid" && !confirmedOrderNumber) {
      const { data: generatedNum, error: genErr } = await supabase.rpc("generate_paid_order_number");
      if (genErr || !generatedNum) {
        console.error("[trustpayments-webhook] Failed to generate paid order number:", genErr);
      } else {
        confirmedOrderNumber = generatedNum as string;
      }
    }

    // --- 12. Update order (only if not already paid) ---
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: paymentStatus,
        order_status: paymentStatus === "paid" ? "confirmed" : order.order_status,
        payment_reference: transactionReference,
        ...(confirmedOrderNumber ? { confirmed_order_number: confirmedOrderNumber } : {}),
      })
      .eq("id", order.id)
      .neq("payment_status", "paid") // Prevent double-update
      .select("*, order_items(*)")
      .maybeSingle();

    if (updateError) {
      console.error("[trustpayments-webhook] DB update failed:", updateError);
      return new Response("Database error", { status: 500 });
    }

    if (!updatedOrder) {
      // Order was already paid — duplicate notification
      console.log(`[trustpayments-webhook] Order ${orderReference} already processed. Skipping.`);
      return new Response("OK", { status: 200 });
    }

    // --- 12. Update payment session ---
    await supabase.from("payment_sessions").update({
      status: paymentStatus,
      gateway_session_id: transactionReference,
    }).eq("order_number", orderReference);

    console.log(`[trustpayments-webhook] Order ${orderReference} updated: payment_status=${paymentStatus}, settlestatus=${settleStatus}`);

    // --- 13. Post-payment actions (only for successfully authorised payments) ---
    if (paymentStatus === "paid") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const promises: Promise<void>[] = [];

      // CentralHub Sync
      const centralhubSyncUrl = Deno.env.get("CENTRALHUB_SUPABASE_URL")
        ? `${Deno.env.get("CENTRALHUB_SUPABASE_URL")}/functions/v1/sync-orders`
        : "https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/sync-orders";
      const centralhubAnonKey = Deno.env.get("CENTRALHUB_ANON_KEY") || "";

      const doOrderSync = async () => {
        const res = await fetch(centralhubSyncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${centralhubAnonKey}`,
          },
          body: JSON.stringify({
            orderId: updatedOrder.id,
            storeSlug: "keralagrocery",
          }),
        });
        if (!res.ok) {
          throw new Error(`sync-orders returned ${res.status}`);
        }
        console.log(`[trustpayments-webhook] Order ${updatedOrder.order_number} synced to CentralHub`);
      };

      promises.push(
        (async () => {
          try {
            await doOrderSync();
          } catch (err) {
            console.error(`[trustpayments-webhook] CentralHub sync failed for order ${updatedOrder.id}, retrying in 5s:`, err);
            await new Promise(resolve => setTimeout(resolve, 5000));
            try {
              await doOrderSync();
            } catch (retryErr) {
              console.error(`[trustpayments-webhook] CentralHub sync retry failed for order ${updatedOrder.id}:`, retryErr);
            }
          }
        })()
      );

      // Wallet Payment Processing
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
          }).then(() => {}).catch((e) => console.error("[trustpayments-webhook] Wallet error:", e))
        );
      }

      // WhatsApp Notification
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
          }).then(() => {}).catch((e) => console.error("[trustpayments-webhook] WhatsApp error:", e))
        );
      }

      await Promise.allSettled(promises);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[trustpayments-webhook] error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
