import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * process-wallet-cycles
 *
 * Called daily by pg_cron at 02:00 UTC, or manually by a super-admin.
 *
 * Auth:
 *   - Scheduled (cron): called with the Supabase service-role JWT.
 *   - Manual (admin):   called with an authenticated user JWT whose
 *                       app_metadata.is_admin === true.
 *
 * No PROCESS_CYCLES_SECRET is required; security is enforced by JWT role.
 *
 * Every run is logged to wallet_processing_logs for auditing.
 *
 * Steps:
 *   1. Ensure all users with paid orders have an active loyalty cycle.
 *   2. Process cycles where cycle_end <= today:
 *        - Sum eligible spend (paid orders, minus wallet_amount used).
 *        - Determine tier, calculate cashback, credit wallet.
 *        - Create cashback_log entry with expiry date.
 *        - Mark cycle processed, create next cycle.
 *   3. Expire unused cashback where expiry_date has passed.
 *   4. Write result to wallet_processing_logs.
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

  // ── Auth: accept service-role OR admin user JWT ────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");

  // Service-role client (for all DB writes)
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let triggeredBy: "cron" | "admin_manual" = "cron";
  let triggeredByUserId: string | null = null;

  if (jwt) {
    // Decode the JWT role without verification (service-role doesn't need it)
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      if (payload.role === "service_role") {
        triggeredBy = "cron";
      } else {
        // Verify admin status via user client
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        const { data: { user }, error: userErr } = await userClient.auth.getUser();
        if (userErr || !user) {
          return respond(401, { error: "Unauthorized" });
        }
        if (user.app_metadata?.is_admin !== true) {
          return respond(403, { error: "Forbidden: admin only" });
        }
        triggeredBy = "admin_manual";
        triggeredByUserId = user.id;
      }
    } catch {
      return respond(401, { error: "Invalid token" });
    }
  }

  // Parse optional body fields
  let bodyTriggeredBy: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    bodyTriggeredBy = body?.triggered_by;
  } catch { /* ignore */ }
  if (bodyTriggeredBy === "cron") triggeredBy = "cron";

  // ── Create log entry ───────────────────────────────────────────────────────
  const { data: logRow, error: logInsertErr } = await serviceClient
    .from("wallet_processing_logs")
    .insert({
      triggered_by: triggeredBy,
      triggered_by_user_id: triggeredByUserId,
      status: "running",
    })
    .select("id")
    .single();

  const logId = logRow?.id ?? null;

  const finishLog = async (
    status: "success" | "error",
    summary: Record<string, unknown>,
    errorMessage?: string
  ) => {
    if (!logId) return;
    await serviceClient
      .from("wallet_processing_logs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        cycles_created:    summary.cyclesCreated   ?? 0,
        cycles_processed:  summary.cyclesProcessed ?? 0,
        cashback_awarded:  summary.cashbackAwarded  ?? 0,
        cashback_expired:  summary.cashbackExpired  ?? 0,
        error_message:     errorMessage ?? null,
        summary,
      })
      .eq("id", logId);
  };

  try {
    // ── Fetch wallet settings ────────────────────────────────────────────────
    const { data: settings } = await serviceClient
      .from("wallet_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!settings) {
      await finishLog("error", {}, "Wallet settings not found");
      return respond(500, { error: "Wallet settings not found" });
    }

    const tierRate = (tier: string) =>
      tier === "gold" ? settings.gold_rate
        : tier === "silver" ? settings.silver_rate
        : settings.bronze_rate;

    const tierDays = (tier: string) =>
      tier === "gold" ? settings.gold_days
        : tier === "silver" ? settings.silver_days
        : settings.bronze_days;

    const spendToTier = (spend: number) =>
      spend >= settings.gold_min ? "gold"
        : spend >= settings.silver_min ? "silver"
        : "bronze";

    let cyclesProcessed = 0;
    let cashbackAwarded = 0;
    let cashbackExpired = 0;
    let cyclesCreated   = 0;
    const errors: string[] = [];

    // ── Step 1: Ensure first-time cycles exist ─────────────────────────────
    const { data: usersWithOrders } = await serviceClient
      .from("orders")
      .select("user_id, created_at")
      .in("payment_status", ["paid"])
      .in("order_status", ["processing", "completed", "delivered"])
      .not("user_id", "is", null)
      .order("created_at", { ascending: true });

    if (usersWithOrders?.length) {
      const firstOrderByUser = new Map<string, string>();
      for (const o of usersWithOrders) {
        if (!firstOrderByUser.has(o.user_id)) {
          firstOrderByUser.set(o.user_id, o.created_at);
        }
      }

      for (const [userId, firstOrderDate] of firstOrderByUser) {
        const { data: existingCycles } = await serviceClient
          .from("wallet_cycles")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (!existingCycles?.length) {
          const cycleStart = firstOrderDate.split("T")[0];
          const end = new Date(cycleStart);
          end.setUTCDate(end.getUTCDate() + settings.bronze_days);

          await serviceClient.from("wallet_cycles").insert({
            user_id:     userId,
            cycle_start: cycleStart,
            cycle_end:   end.toISOString().split("T")[0],
            spend: 0,
            tier: "bronze",
            processed: false,
          });

          await serviceClient.from("wallets").upsert(
            { user_id: userId, balance: 0 },
            { onConflict: "user_id", ignoreDuplicates: true }
          );

          cyclesCreated++;
        }
      }
    }

    // ── Step 2: Process expired cycles ─────────────────────────────────────
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString().split("T")[0];

    const { data: expiredCycles } = await serviceClient
      .from("wallet_cycles")
      .select("*")
      .eq("processed", false)
      .lte("cycle_end", todayIso);

    for (const cycle of expiredCycles ?? []) {
      try {
        const { data: orders } = await serviceClient
          .from("orders")
          .select("total, wallet_amount")
          .eq("user_id", cycle.user_id)
          .in("payment_status", ["paid"])
          .in("order_status", ["processing", "completed", "delivered"])
          .gte("created_at", `${cycle.cycle_start}T00:00:00.000Z`)
          .lt("created_at",  `${cycle.cycle_end}T00:00:00.000Z`);

        const eligibleSpend = (orders ?? []).reduce((sum: number, o: { total: string; wallet_amount: string }) => {
          const paid = parseFloat(o.total ?? "0") - parseFloat(o.wallet_amount ?? "0");
          return sum + Math.max(0, paid);
        }, 0);

        const tier     = spendToTier(eligibleSpend);
        const rate     = tierRate(tier);
        const cashback = parseFloat((eligibleSpend * rate).toFixed(2));

        let transactionId: string | null = null;

        if (cashback > 0) {
          await serviceClient.from("wallets").upsert(
            { user_id: cycle.user_id, balance: 0 },
            { onConflict: "user_id", ignoreDuplicates: true }
          );

          const { data: wallet } = await serviceClient
            .from("wallets")
            .select("balance")
            .eq("user_id", cycle.user_id)
            .single();

          const currentBalance = parseFloat(wallet?.balance ?? "0");
          const newBalance     = parseFloat((currentBalance + cashback).toFixed(2));
          const days           = tierDays(tier);
          const expiresAt      = new Date(cycle.cycle_end);
          expiresAt.setUTCDate(expiresAt.getUTCDate() + days);

          await serviceClient
            .from("wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", cycle.user_id);

          const { data: tx } = await serviceClient
            .from("wallet_transactions")
            .insert({
              user_id:       cycle.user_id,
              type:          "cashback_credit",
              source:        `cycle:${cycle.id}`,
              amount:        cashback,
              description:   `${tier.charAt(0).toUpperCase() + tier.slice(1)} cashback — cycle ${cycle.cycle_start} to ${cycle.cycle_end}`,
              balance_after: newBalance,
              expires_at:    expiresAt.toISOString(),
            })
            .select("id")
            .single();

          transactionId = tx?.id ?? null;

          await serviceClient.from("wallet_cashback_logs").insert({
            user_id:         cycle.user_id,
            cycle_id:        cycle.id,
            cycle_start:     cycle.cycle_start,
            cycle_end:       cycle.cycle_end,
            spend:           eligibleSpend,
            tier,
            cashback_amount: cashback,
            used_amount:     0,
            expiry_date:     expiresAt.toISOString(),
            transaction_id:  transactionId,
          });

          cashbackAwarded += cashback;
        }

        // Mark cycle processed
        await serviceClient
          .from("wallet_cycles")
          .update({
            spend:           eligibleSpend,
            tier,
            cashback_amount: cashback,
            processed:       true,
            processed_at:    new Date().toISOString(),
          })
          .eq("id", cycle.id);

        // Create next cycle — starts where current one ended
        const nextStart = cycle.cycle_end;
        const nextEnd   = new Date(nextStart);
        nextEnd.setUTCDate(nextEnd.getUTCDate() + tierDays(tier));

        await serviceClient.from("wallet_cycles").insert({
          user_id:     cycle.user_id,
          cycle_start: nextStart,
          cycle_end:   nextEnd.toISOString().split("T")[0],
          spend: 0,
          tier,
          processed: false,
        });

        cyclesProcessed++;
      } catch (err) {
        const msg = `cycle ${cycle.id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[process-wallet-cycles]", msg);
        errors.push(msg);
      }
    }

    // ── Step 3: Expire unused cashback ─────────────────────────────────────
    const { data: expiredLogs } = await serviceClient
      .from("wallet_cashback_logs")
      .select("*")
      .lte("expiry_date", new Date().toISOString())
      .is("expired_at", null);

    for (const log of expiredLogs ?? []) {
      try {
        const remaining = parseFloat(
          (parseFloat(log.cashback_amount) - parseFloat(log.used_amount)).toFixed(2)
        );

        if (remaining <= 0) {
          await serviceClient
            .from("wallet_cashback_logs")
            .update({ expired_at: new Date().toISOString() })
            .eq("id", log.id);
          continue;
        }

        const { data: wallet } = await serviceClient
          .from("wallets")
          .select("balance")
          .eq("user_id", log.user_id)
          .maybeSingle();

        const currentBalance = parseFloat(wallet?.balance ?? "0");
        const expireAmount   = Math.min(remaining, currentBalance);

        if (expireAmount > 0) {
          const newBalance = parseFloat((currentBalance - expireAmount).toFixed(2));

          await serviceClient
            .from("wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", log.user_id);

          await serviceClient.from("wallet_transactions").insert({
            user_id:       log.user_id,
            type:          "cashback_expiry",
            source:        `cashback_log:${log.id}`,
            amount:        -expireAmount,
            description:   "Expired cashback",
            balance_after: newBalance,
          });

          cashbackExpired += expireAmount;
        }

        await serviceClient
          .from("wallet_cashback_logs")
          .update({
            expired_at:  new Date().toISOString(),
            used_amount: parseFloat(log.cashback_amount),
          })
          .eq("id", log.id);
      } catch (err) {
        const msg = `expiry log ${log.id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[process-wallet-cycles]", msg);
        errors.push(msg);
      }
    }

    const summary = {
      cyclesCreated,
      cyclesProcessed,
      cashbackAwarded: parseFloat(cashbackAwarded.toFixed(2)),
      cashbackExpired: parseFloat(cashbackExpired.toFixed(2)),
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("[process-wallet-cycles]", JSON.stringify(summary));

    await finishLog(
      errors.length > 0 ? "error" : "success",
      summary,
      errors.length > 0 ? errors.join("; ") : undefined
    );

    return respond(200, { success: true, summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-wallet-cycles] fatal:", msg);
    await finishLog("error", {}, msg);
    return respond(500, { error: msg });
  }
});

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
