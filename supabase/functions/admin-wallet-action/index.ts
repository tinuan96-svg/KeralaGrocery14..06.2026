import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * admin-wallet-action
 *
 * Allows admin users to perform manual wallet operations:
 *   credit, debit, adjust_cashback, expire_cashback, extend_expiry
 *
 * All actions require:
 *   - Authenticated admin caller (is_admin in app_metadata)
 *   - target_user_id
 *   - action type
 *   - amount (where applicable)
 *   - reason (mandatory for audit trail)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type AdminAction = "credit" | "debit" | "adjust_cashback" | "expire_cashback" | "extend_expiry";

interface AdminWalletRequest {
  target_user_id: string;
  action: AdminAction;
  amount?: number;
  reason: string;
  cashback_log_id?: string;   // for adjust_cashback / expire_cashback / extend_expiry
  extend_days?: number;       // for extend_expiry
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate & authorise admin
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return respond(401, { error: "Unauthorized" });
    if (!user.app_metadata?.is_admin) return respond(403, { error: "Admin access required" });

    const body: AdminWalletRequest = await req.json();
    const { target_user_id, action, amount, reason, cashback_log_id, extend_days } = body;

    if (!target_user_id) return respond(400, { error: "target_user_id required" });
    if (!reason?.trim()) return respond(400, { error: "reason is required" });
    if (!action) return respond(400, { error: "action required" });

    // Ensure target wallet exists
    await supabase.from("wallets").upsert(
      { user_id: target_user_id, balance: 0 },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", target_user_id)
      .single();

    const currentBalance = parseFloat(wallet?.balance ?? 0);

    // ── credit ────────────────────────────────────────────────────────────────
    if (action === "credit") {
      if (!amount || amount <= 0) return respond(400, { error: "Positive amount required" });
      const creditAmt = parseFloat(amount.toFixed(2));
      const newBalance = parseFloat((currentBalance + creditAmt).toFixed(2));

      await supabase.from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", target_user_id);

      await supabase.from("wallet_transactions").insert({
        user_id: target_user_id,
        type: "manual_credit",
        source: "admin",
        amount: creditAmt,
        description: reason,
        balance_after: newBalance,
        admin_user_id: user.id,
      });

      return respond(200, { success: true, new_balance: newBalance });
    }

    // ── debit ─────────────────────────────────────────────────────────────────
    if (action === "debit") {
      if (!amount || amount <= 0) return respond(400, { error: "Positive amount required" });
      const debitAmt = parseFloat(amount.toFixed(2));
      if (currentBalance < debitAmt) {
        return respond(400, { error: "Insufficient balance", current_balance: currentBalance });
      }
      const newBalance = parseFloat((currentBalance - debitAmt).toFixed(2));

      await supabase.from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", target_user_id);

      await supabase.from("wallet_transactions").insert({
        user_id: target_user_id,
        type: "manual_debit",
        source: "admin",
        amount: -debitAmt,
        description: reason,
        balance_after: newBalance,
        admin_user_id: user.id,
      });

      return respond(200, { success: true, new_balance: newBalance });
    }

    // ── adjust_cashback ───────────────────────────────────────────────────────
    if (action === "adjust_cashback") {
      if (!amount) return respond(400, { error: "amount required (positive = add, negative = remove)" });
      const adjustAmt = parseFloat(amount.toFixed(2));
      const newBalance = parseFloat((currentBalance + adjustAmt).toFixed(2));
      if (newBalance < 0) return respond(400, { error: "Adjustment would make balance negative" });

      await supabase.from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", target_user_id);

      await supabase.from("wallet_transactions").insert({
        user_id: target_user_id,
        type: adjustAmt >= 0 ? "manual_credit" : "manual_debit",
        source: "admin_cashback_adjustment",
        amount: adjustAmt,
        description: reason,
        balance_after: newBalance,
        admin_user_id: user.id,
      });

      return respond(200, { success: true, new_balance: newBalance });
    }

    // ── expire_cashback ───────────────────────────────────────────────────────
    if (action === "expire_cashback") {
      if (!cashback_log_id) return respond(400, { error: "cashback_log_id required" });

      const { data: log } = await supabase
        .from("wallet_cashback_logs")
        .select("*")
        .eq("id", cashback_log_id)
        .eq("user_id", target_user_id)
        .maybeSingle();

      if (!log) return respond(404, { error: "Cashback log not found" });
      if (log.expired_at) return respond(400, { error: "Already expired" });

      const remaining = parseFloat(
        (parseFloat(log.cashback_amount) - parseFloat(log.used_amount)).toFixed(2)
      );
      const expireAmt = Math.min(remaining, currentBalance);
      const newBalance = parseFloat((currentBalance - expireAmt).toFixed(2));

      if (expireAmt > 0) {
        await supabase.from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", target_user_id);

        await supabase.from("wallet_transactions").insert({
          user_id: target_user_id,
          type: "cashback_expiry",
          source: `cashback_log:${cashback_log_id}`,
          amount: -expireAmt,
          description: reason,
          balance_after: newBalance,
          admin_user_id: user.id,
        });
      }

      await supabase.from("wallet_cashback_logs")
        .update({ expired_at: new Date().toISOString() })
        .eq("id", cashback_log_id);

      return respond(200, { success: true, expired_amount: expireAmt, new_balance: newBalance });
    }

    // ── extend_expiry ─────────────────────────────────────────────────────────
    if (action === "extend_expiry") {
      if (!cashback_log_id) return respond(400, { error: "cashback_log_id required" });
      if (!extend_days || extend_days <= 0) return respond(400, { error: "extend_days required" });

      const { data: log } = await supabase
        .from("wallet_cashback_logs")
        .select("expiry_date")
        .eq("id", cashback_log_id)
        .eq("user_id", target_user_id)
        .maybeSingle();

      if (!log) return respond(404, { error: "Cashback log not found" });

      const newExpiry = new Date(log.expiry_date);
      newExpiry.setUTCDate(newExpiry.getUTCDate() + extend_days);

      await supabase.from("wallet_cashback_logs")
        .update({ expiry_date: newExpiry.toISOString() })
        .eq("id", cashback_log_id);

      // Also update the original transaction expires_at
      const { data: txData } = await supabase
        .from("wallet_cashback_logs")
        .select("transaction_id")
        .eq("id", cashback_log_id)
        .single();

      if (txData?.transaction_id) {
        await supabase.from("wallet_transactions")
          .update({ expires_at: newExpiry.toISOString() })
          .eq("id", txData.transaction_id);
      }

      return respond(200, { success: true, new_expiry: newExpiry.toISOString() });
    }

    return respond(400, { error: `Unknown action: ${action}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin-wallet-action]", msg);
    return respond(500, { error: msg });
  }
});

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
