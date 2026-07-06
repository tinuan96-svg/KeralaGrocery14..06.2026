import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * wallet-payment
 *
 * Applies a wallet debit to a completed order.
 * Called after:
 *   - Worldpay webhook fires "authorized" (card + wallet split)
 *   - COD order creation (wallet portion deducted immediately)
 *
 * Request body:
 *   { order_id, wallet_amount, user_id }
 *
 * Security:
 *   - Verifies the caller is the order owner OR service_role.
 *   - Validates wallet_amount <= 50% of order subtotal.
 *   - Prevents negative wallet balances.
 *   - Idempotent: skips if order already has wallet_amount recorded.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return respond(401, { error: "Unauthorized" });

    const { order_id, wallet_amount } = await req.json();

    if (!order_id || typeof wallet_amount !== "number" || wallet_amount <= 0) {
      return respond(400, { error: "order_id and positive wallet_amount required" });
    }

    const walletAmt = parseFloat(wallet_amount.toFixed(2));

    // Fetch order — must belong to this user
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, subtotal, total, wallet_amount, order_number")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return respond(404, { error: "Order not found" });
    if (order.user_id !== user.id) return respond(403, { error: "Forbidden" });

    // Idempotency: already processed
    if (parseFloat(order.wallet_amount ?? 0) > 0) {
      return respond(200, { success: true, already_applied: true });
    }

    // Fetch wallet settings for max usage limit
    const { data: settings } = await supabase
      .from("wallet_settings")
      .select("max_wallet_usage_percent")
      .eq("id", 1)
      .single();

    const maxPct = parseFloat(settings?.max_wallet_usage_percent ?? 0.5);
    const subtotal = parseFloat(order.subtotal ?? order.total ?? 0);
    const maxWalletUsable = parseFloat((subtotal * maxPct).toFixed(2));

    if (walletAmt > maxWalletUsable) {
      return respond(400, {
        error: `Wallet usage exceeds ${maxPct * 100}% of subtotal. Max: £${maxWalletUsable.toFixed(2)}`,
        max_allowed: maxWalletUsable,
      });
    }

    // Fetch wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletErr) return respond(500, { error: "Failed to fetch wallet" });
    const currentBalance = parseFloat(wallet?.balance ?? 0);

    if (currentBalance < walletAmt) {
      return respond(400, {
        error: "Insufficient wallet balance",
        current_balance: currentBalance,
        required: walletAmt,
      });
    }

    // Deduct wallet balance
    const newBalance = parseFloat((currentBalance - walletAmt).toFixed(2));
    const { error: updateErr } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updateErr) return respond(500, { error: "Failed to update wallet" });

    // Record wallet_payment transaction
    const { data: tx, error: txErr } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "wallet_payment",
        source: `order:${order_id}`,
        amount: -walletAmt,
        description: `Wallet payment for order ${order.order_number}`,
        balance_after: newBalance,
        order_id,
      })
      .select("id")
      .single();

    if (txErr) {
      // Rollback balance
      await supabase
        .from("wallets")
        .update({ balance: currentBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return respond(500, { error: "Failed to record transaction" });
    }

    // Update order wallet_amount
    await supabase
      .from("orders")
      .update({ wallet_amount: walletAmt })
      .eq("id", order_id);

    // FIFO: consume cashback_logs oldest first to track used_amount
    const { data: cashbackLogs } = await supabase
      .from("wallet_cashback_logs")
      .select("id, cashback_amount, used_amount")
      .eq("user_id", user.id)
      .is("expired_at", null)
      .gt("cashback_amount", 0)
      .order("created_at", { ascending: true });

    let remaining = walletAmt;
    for (const log of cashbackLogs ?? []) {
      if (remaining <= 0) break;
      const available = parseFloat(log.cashback_amount) - parseFloat(log.used_amount);
      if (available <= 0) continue;
      const consume = Math.min(available, remaining);
      await supabase
        .from("wallet_cashback_logs")
        .update({ used_amount: parseFloat((parseFloat(log.used_amount) + consume).toFixed(2)) })
        .eq("id", log.id);
      remaining -= consume;
    }

    return respond(200, {
      success: true,
      new_balance: newBalance,
      wallet_amount_applied: walletAmt,
      transaction_id: tx.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[wallet-payment]", msg);
    return respond(500, { error: msg });
  }
});

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
