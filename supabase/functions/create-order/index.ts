import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItemRequest {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  // unit_price submitted by client is used only as a fallback label — the
  // server always re-fetches the authoritative price from the products table.
}

interface CreateOrderRequest {
  idempotency_key?: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  delivery_fee?: number;
  payment_method: "card" | "cod" | "wallet" | "paypal";
  payment_status: "pending" | "paid";
  payment_reference?: string;
  notes?: string;
  items: OrderItemRequest[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const orderData: CreateOrderRequest = await req.json();

    // ── Basic input validation ────────────────────────────────────────────────
    if (!orderData.customer_name || !orderData.customer_email || !orderData.items?.length) {
      return respond(400, { error: "Missing required fields" });
    }

    // ── Idempotency check ─────────────────────────────────────────────────────
    // If the client supplies an idempotency_key we check whether this request
    // was already processed (within 24 h) and return the cached result.
    if (orderData.idempotency_key) {
      const { data: existing } = await supabase
        .from("order_idempotency")
        .select("order_id, order_number")
        .eq("idempotency_key", orderData.idempotency_key)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) {
        console.log(`[create-order] idempotency hit for key=${orderData.idempotency_key}`);
        return respond(200, { success: true, order: { id: existing.order_id, order_number: existing.order_number } });
      }
    }

    // ── Server-side price resolution ──────────────────────────────────────────
    // Fetch authoritative selling prices from the database.
    // The client-submitted unit_price is NEVER trusted for financial calculations.
    const productIds = orderData.items.map(i => i.product_id);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, selling_price, price, name")
      .in("id", productIds);

    if (productsError) {
      console.error("[create-order] failed to fetch product prices:", productsError);
      return respond(500, { error: "Failed to validate product prices" });
    }

    const priceMap = new Map<string, number>();
    for (const p of products ?? []) {
      // Prefer selling_price; fall back to price
      const price = typeof p.selling_price === "number" && p.selling_price > 0
        ? p.selling_price
        : (p.price ?? 0);
      priceMap.set(p.id, price);
    }

    // Validate every item has a known price
    for (const item of orderData.items) {
      if (!priceMap.has(item.product_id)) {
        return respond(400, { error: `Product not found or unavailable: ${item.product_id}` });
      }
      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return respond(400, { error: `Invalid quantity for product ${item.product_id}` });
      }
    }

    // ── Recalculate totals server-side ────────────────────────────────────────
    const deliveryFee = typeof orderData.delivery_fee === "number"
      ? Math.max(0, orderData.delivery_fee)
      : 0;

    const serverSubtotal = orderData.items.reduce((sum, item) => {
      return sum + (priceMap.get(item.product_id)! * item.quantity);
    }, 0);

    const serverTotal = parseFloat((serverSubtotal + deliveryFee).toFixed(2));

    console.log(`[create-order] server-calculated total=£${serverTotal}`);

    // ── Generate order number ─────────────────────────────────────────────────
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc("generate_order_number");

    if (orderNumberError || !orderNumberData) {
      console.error("[create-order] failed to generate order number:", orderNumberError);
      return respond(500, { error: "Failed to generate order number" });
    }

    const orderNumber = orderNumberData as string;
    const userId = orderData.user_id || null;

    // ── Insert order ──────────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id:            userId,
        order_number:       orderNumber,
        customer_name:      orderData.customer_name,
        customer_email:     orderData.customer_email,
        customer_phone:     orderData.customer_phone,
        delivery_address:   orderData.delivery_address,
        delivery_city:      orderData.delivery_city,
        delivery_postcode:  orderData.delivery_postcode,
        subtotal:           parseFloat(serverSubtotal.toFixed(2)),
        delivery_fee:       deliveryFee,
        total:              serverTotal,
        payment_method:     orderData.payment_method,
        payment_status:     orderData.payment_status,
        payment_reference:  orderData.payment_reference || null,
        order_status:       orderData.payment_status === "paid" ? "processing" : "pending",
        notes:              orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[create-order] insert order failed:", orderError);
      return respond(500, { error: "Failed to create order" });
    }

    // ── Insert order items using server-resolved prices ───────────────────────
    const orderItems = orderData.items.map(item => {
      const unitPrice  = priceMap.get(item.product_id)!;
      const totalPrice = parseFloat((unitPrice * item.quantity).toFixed(2));
      return {
        order_id:       order.id,
        product_id:     item.product_id,
        product_name:   item.product_name,
        product_image:  item.product_image,
        quantity:       item.quantity,
        unit_price:     unitPrice,
        total_price:    totalPrice,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[create-order] insert order items failed:", itemsError);
      // Roll back the order
      await supabase.from("orders").delete().eq("id", order.id);
      return respond(500, { error: "Failed to create order items" });
    }

    // ── Store idempotency record ──────────────────────────────────────────────
    if (orderData.idempotency_key) {
      const { error: idempotencyError } = await supabase.from("order_idempotency").insert({
        idempotency_key: orderData.idempotency_key,
        order_id:        order.id,
        order_number:    orderNumber,
      });
      if (idempotencyError) {
        console.error("[create-order] idempotency insert failed:", idempotencyError);
      }
    }

    // ── Bootstrap wallet + loyalty cycle for authenticated users ─────────────
    // ensure_loyalty_cycle is idempotent: creates wallet row + first cycle if
    // neither exists yet, so the dashboard reflects spend immediately.
    if (userId) {
      EdgeRuntime.waitUntil(
        supabase
          .rpc('ensure_loyalty_cycle', {
            p_user_id:    userId,
            p_order_date: order.created_at,
          })
          .then(({ error }) => {
            if (error) console.error('[create-order] ensure_loyalty_cycle failed:', error.message);
          })
          .catch(err => console.error('[create-order] ensure_loyalty_cycle error:', err))
      );
    }

    // ── Order confirmation notifications (WhatsApp & Push) ──────────────────
    // Only notify if payment is confirmed (paid) OR if it's Cash on Delivery.
    // For card payments, the confirmation is sent by the Worldpay webhook after authorization.
    const shouldNotifyNow = orderData.payment_status === "paid" || orderData.payment_method === "cod";

    if (shouldNotifyNow && (orderData.customer_phone || userId)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Send WhatsApp
      if (orderData.customer_phone) {
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              customer_name:  orderData.customer_name,
              user_phone:     orderData.customer_phone,
              order_id:       order.id,
              order_number:   orderNumber,
              items:          orderData.items.map(i => ({ name: i.product_name, qty: i.quantity })),
              total_amount:   serverTotal,
            }),
          }).catch(err => console.error("[create-order] WhatsApp notification error:", err))
        );
      }

      // Send Push Notification
      if (userId) {
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              user_id: userId,
              title: "Order Confirmed ✅",
              body: `Your order #${orderNumber} for £${serverTotal} has been placed successfully!`,
              data: {
                order_id: order.id,
                order_number: orderNumber,
                url: "https://keralagrocery.com/orders"
              }
            }),
          }).catch(err => console.error("[create-order] Push notification error:", err))
        );
      }
    }

    // ── Clear user cart ───────────────────────────────────────────────────────
    if (userId) {
      const { error: cartClearError } = await supabase.from("cart").delete().eq("user_id", userId);
      if (cartClearError) console.error("[create-order] cart clear failed:", cartClearError);
    }

    // ── Transmit Order to CentralHub ──────────────────────────────────────────
    const centralhubWebhookUrl = Deno.env.get("CENTRALHUB_ORDER_WEBHOOK_URL");
    const centralhubSecret = Deno.env.get("CENTRALHUB_WEBHOOK_SECRET");

    if (centralhubWebhookUrl) {
      EdgeRuntime.waitUntil(
        fetch(centralhubWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": centralhubSecret || "",
          },
          body: JSON.stringify({
            type: "INSERT",
            record: {
              ...order,
              items: orderItems,
            },
          }),
        }).then(async (res) => {
          if (res.ok) {
            const result = await res.json();
            if (result.external_order_id) {
              await supabase
                .from("orders")
                .update({ external_order_id: result.external_order_id })
                .eq("id", order.id);
            }
            console.log(`[create-order] Order ${orderNumber} transmitted to CentralHub`);
          } else {
            console.error(`[create-order] CentralHub transmission failed: ${res.status}`);
          }
        }).catch(err => console.error("[create-order] CentralHub transmission error:", err))
      );
    }

    return respond(200, {
      success: true,
      order: { id: order.id, order_number: order.order_number, total: serverTotal },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[create-order] unexpected error:", msg, stack);
    return respond(500, { error: "Internal server error", detail: msg });
  }
});

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
