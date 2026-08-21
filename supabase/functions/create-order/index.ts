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
  wallet_amount?: number;
  payment_method: "card" | "wallet" | "paypal";
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

    // ── Server-side price & stock resolution ──────────────────────────────────
    // Fetch authoritative selling prices and current stock from the database.
    const productIds = orderData.items.map(i => i.product_id);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, selling_price, price, name, stock, stock_quantity")
      .in("id", productIds);

    if (productsError) {
      console.error("[create-order] failed to fetch product details:", productsError);
      return respond(500, { error: "Failed to validate product details" });
    }

    const priceMap = new Map<string, number>();
    const stockMap = new Map<string, number>();
    for (const p of products ?? []) {
      const rawPrice = typeof p.selling_price === "number" && p.selling_price > 0
        ? p.selling_price
        : (p.price ?? 0);
      const price = Math.ceil(rawPrice * 10) / 10;
      priceMap.set(p.id, price);

      const available = Math.max(Number(p.stock || 0), Number(p.stock_quantity || 0));
      stockMap.set(p.id, available);
    }

    // Validate every item exists and has sufficient stock
    for (const item of orderData.items) {
      if (!priceMap.has(item.product_id)) {
        return respond(400, { error: `Product not found or unavailable: ${item.product_name}` });
      }
      const available = stockMap.get(item.product_id)!;
      if (item.quantity > available) {
        return respond(400, {
          error: `Insufficient stock for ${item.product_name}.`,
          detail: `Requested ${item.quantity}, but only ${available} available.`
        });
      }
      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return respond(400, { error: `Invalid quantity for product ${item.product_name}` });
      }
    }

    // ── Wallet Verification ──────────────────────────────────────────────────
    const requestedWalletAmount = parseFloat((orderData.wallet_amount || 0).toFixed(2));
    if (requestedWalletAmount > 0) {
      if (!userId) {
        return respond(400, { error: "Wallet usage requires authentication" });
      }

      // 1. Fetch current balance
      const { data: wallet, error: walletErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletErr) return respond(500, { error: "Failed to verify wallet balance" });
      const currentBalance = parseFloat(wallet?.balance ?? 0);

      if (requestedWalletAmount > currentBalance) {
        return respond(400, {
          error: "Insufficient wallet balance.",
          detail: `Requested £${requestedWalletAmount.toFixed(2)}, but balance is £${currentBalance.toFixed(2)}.`
        });
      }

      // 2. Enforce 50% balance usage rule (business logic)
      const maxFromBalance = parseFloat((currentBalance * 0.5).toFixed(2));
      if (requestedWalletAmount > maxFromBalance) {
        return respond(400, {
          error: "Wallet usage limit exceeded.",
          detail: `You can only use up to 50% of your current balance (£${maxFromBalance.toFixed(2)}) per order.`
        });
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
    let orderNumber: string;
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc("generate_order_number", { p_payment_status: orderData.payment_status || 'pending' });

    if (orderNumberError || !orderNumberData) {
      console.error("[create-order] RPC error generating order number:", orderNumberError);
      // Fallback in edge function if RPC fails entirely to avoid blocking the insert
      orderNumber = `KG-TMP-${Date.now()}`;
    } else {
      orderNumber = orderNumberData as string;
    }

    const userId = orderData.user_id || null;

    // ── Insert order ──────────────────────────────────────────────────────────
    // Note: 'original_order_number' is removed from the insert list to avoid
    // PostgREST PGRST204 errors if the schema cache is stale.
    // It is instead populated automatically by the 'trg_ensure_original_order_number'
    // trigger in the database.
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
        subtotal:           serverSubtotal,
        delivery_fee:       deliveryFee,
        wallet_amount:      orderData.wallet_amount || 0,
        total:              serverTotal,
        payment_method:     orderData.payment_method,
        payment_status:     orderData.payment_status,
        payment_reference:  orderData.payment_reference || null,
        order_status:       orderData.payment_status === "paid" ? "confirmed" : "pending",
        notes:              orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[create-order] insert order failed:", orderError);
      return respond(500, {
        error: "Failed to create order",
        detail: orderError.message,
        code: orderError.code
      });
    }

    // ── Calculate and Record Pending Cashback ────────────────────────────────
    if (userId) {
      try {
        // Fetch wallet settings to get the rate
        const { data: settings } = await supabase.from('wallet_settings').select('*').eq('id', 1).single();
        if (settings) {
          // Get current user tier
          const { data: cycle } = await supabase
            .from('wallet_cycles')
            .select('tier')
            .eq('user_id', userId)
            .eq('processed', false)
            .maybeSingle();

          const tier = cycle?.tier || 'bronze';
          const rate = tier === 'gold' ? settings.gold_rate : tier === 'silver' ? settings.silver_rate : settings.bronze_rate;

          // Cashback is earned ONLY on the cash portion (Total - Wallet applied)
          const cashPortion = Math.max(0, serverTotal - (orderData.wallet_amount || 0) - deliveryFee);
          const pendingCashback = parseFloat((cashPortion * rate).toFixed(2));

          if (pendingCashback > 0) {
            // Store pending cashback in the order or a dedicated table
            // For now, we add to the wallet's pending_balance
            await supabase.rpc('add_pending_wallet_balance', {
              p_user_id: userId,
              p_amount: pendingCashback
            });

            // Store it in the order as well for record keeping
            await supabase.from('orders').update({
              custom_attributes: {
                ...(order.custom_attributes || {}),
                pending_cashback: pendingCashback
              }
            }).eq('id', order.id);
          }
        }
      } catch (err) {
        console.error('[create-order] Pending cashback calculation failed:', err);
      }
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
    // Only notify if payment is confirmed (paid).
    // For card payments, the confirmation is sent by the Worldpay webhook after authorization.
    const shouldNotifyNow = orderData.payment_status === "paid";

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
    const centralhubSyncUrl = Deno.env.get("CENTRALHUB_SUPABASE_URL")
      ? `${Deno.env.get("CENTRALHUB_SUPABASE_URL")}/functions/v1/sync-orders`
      : "https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/sync-orders";
    const centralhubAnonKey = Deno.env.get("CENTRALHUB_ANON_KEY") || "";

    EdgeRuntime.waitUntil(
      (async () => {
        const doSync = async () => {
          // Fetch the full order row and all line items joined with
          // products.centralhub_product_id so CentralHub receives the
          // complete order details in a single payload.
          const { data: fullOrder } = await supabase
            .from("orders")
            .select("*")
            .eq("id", order.id)
            .maybeSingle();

          const { data: fullItems } = await supabase
            .from("order_items")
            .select(`
              product_id,
              product_name,
              product_image,
              quantity,
              unit_price,
              total_price,
              products!left ( centralhub_product_id )
            `)
            .eq("order_id", order.id);

          const itemsPayload = (fullItems ?? []).map((item: any) => ({
            product_id:            item.product_id,
            centralhub_product_id: item.products?.centralhub_product_id ?? null,
            product_name:          item.product_name,
            product_image:         item.product_image,
            quantity:              item.quantity,
            unit_price:            item.unit_price,
            total_price:           item.total_price,
          }));

          const mappedStatus =
            orderData.payment_status === "paid" ? "confirmed" : "pending";
          const fulfillmentStatus = mappedStatus;
          const packingStatus =
            mappedStatus === "confirmed" ? "confirmed" : "pending";

          const syncPayload = {
            table:      "orders",
            type:       "INSERT",
            store_slug: "keralagrocery",
            record: {
              ...(fullOrder ?? {}),
              items:              itemsPayload,
              status:             mappedStatus,
              fulfillment_status: fulfillmentStatus,
              packing_status:     packingStatus,
              sync_store:         "keralagrocery",
              sync_origin:        "local",
              sync_updated_at:    new Date().toISOString(),
            },
          };

          const res = await fetch(centralhubSyncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${centralhubAnonKey}`,
            },
            body: JSON.stringify(syncPayload),
          });
          if (!res.ok) {
            throw new Error(`sync-orders returned ${res.status}`);
          }
          const result = await res.json().catch(() => ({}));
          if (result.external_order_id) {
            await supabase
              .from("orders")
              .update({ external_order_id: result.external_order_id })
              .eq("id", order.id);
          }
          console.log(`[create-order] Order ${orderNumber} synced to CentralHub`);
        };

        try {
          await doSync();
        } catch (err) {
          console.error(`[create-order] CentralHub sync failed for order ${order.id}, retrying in 5s:`, err);
          await new Promise(resolve => setTimeout(resolve, 5000));
          try {
            await doSync();
          } catch (retryErr) {
            console.error(`[create-order] CentralHub sync retry failed for order ${order.id}:`, retryErr);
          }
        }
      })().catch(err => console.error("[create-order] CentralHub sync unexpected error:", err))
    );

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
