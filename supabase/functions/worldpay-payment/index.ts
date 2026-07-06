import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Map Worldpay HTTP status codes to user-safe messages
function userMessageForStatus(status: number): string {
  if (status === 400) return "Payment gateway configuration error";
  if (status === 401 || status === 403) return "Payment gateway authentication error";
  if (status === 422) return "Payment request was rejected by the gateway";
  if (status >= 500) return "Payment gateway is temporarily unavailable";
  return `Payment gateway error (${status})`;
}

interface WorldpayValidationError {
  errorName: string;
  message: string;
  jsonPath?: string;
}

// Extract the most useful error text from a Worldpay error response body
function extractWorldpayMessage(rawText: string): string | null {
  try {
    const parsed = JSON.parse(rawText);
    const base: string =
      parsed?.message ??
      parsed?.error?.message ??
      parsed?.errorDescription ??
      parsed?.description ??
      parsed?.customCode ??
      null;

    // Append individual validation field errors so they appear in the DB log
    if (parsed?.validationErrors?.length) {
      const details = (parsed.validationErrors as WorldpayValidationError[])
        .map((e) => `${e.jsonPath ?? e.errorName}: ${e.message}`)
        .join(" | ");
      return base ? `${base} — ${details}` : details;
    }
    return base;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let amount: unknown;
  let transactionReference: string | null = null;
  let narrative: unknown;
  let billingAddress: unknown;

  try {
    const body = await req.json();
    amount = body.amount;
    transactionReference = body.transactionReference ?? null;
    narrative = body.narrative;
    billingAddress = body.billingAddress;
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error("[worldpay-payment] body parse error:", msg);
    return respond(400, { error: "Invalid request body" });
  }

  try {
    const WORLDPAY_USERNAME = Deno.env.get("WORLDPAY_USERNAME");
    const WORLDPAY_PASSWORD = Deno.env.get("WORLDPAY_PASSWORD");
    const WORLDPAY_ENTITY   = Deno.env.get("WORLDPAY_ENTITY") ?? "PO4091935061";
    const WORLDPAY_API_URL  = "https://access.worldpay.com/payment_pages";
    // Normalise SITE_URL: strip trailing slash, prepend https:// if scheme is missing
    const rawSiteUrl = (Deno.env.get("SITE_URL") || "keralagrocery.com").trim().replace(/\/$/, "");
    const BASE_URL   = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

    if (!WORLDPAY_USERNAME || !WORLDPAY_PASSWORD) {
      console.error("[worldpay-payment] missing Worldpay credentials in env");
      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        "WORLDPAY credentials not configured",
        rawPayload:     null,
        httpStatus:     null,
        amountPence:    null,
        merchantEntity: WORLDPAY_ENTITY,
      });
      return respond(503, { error: "Payment gateway not configured" });
    }

    if (!amount || !transactionReference) {
      return respond(400, { error: "Missing required fields: amount and transactionReference" });
    }

    // Idempotency: reuse an existing pending session created within the last 10 minutes
    const { data: existingSession } = await supabase
      .from("payment_sessions")
      .select("payment_url, created_at")
      .eq("order_number", transactionReference)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingSession?.payment_url) {
      console.log(`[worldpay-payment] returning existing session for ${transactionReference}`);
      return respond(200, { url: existingSession.payment_url });
    }

    const credentials   = btoa(`${WORLDPAY_USERNAME}:${WORLDPAY_PASSWORD}`);
    const amountInPence = Math.round(parseFloat(String(amount)) * 100);

    if (amountInPence <= 0) {
      return respond(400, { error: "Amount must be greater than zero" });
    }

    const ref = encodeURIComponent(String(transactionReference));
    const resultURLs = {
      successURL: `${BASE_URL}/payment-success?order=${ref}`,
      pendingURL: `${BASE_URL}/payment-success?order=${ref}`,
      failureURL: `${BASE_URL}/payment-failed?order=${ref}`,
      errorURL:   `${BASE_URL}/order-failed?order=${ref}`,
      cancelURL:  `${BASE_URL}/cart`,
      expiryURL:  `${BASE_URL}/order-failed?order=${ref}`,
    };

    // Validate every URL before sending — catch misconfigured SITE_URL early
    const badUrls: string[] = [];
    for (const [key, val] of Object.entries(resultURLs)) {
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== "https:") badUrls.push(`${key} (not https)`);
      } catch {
        badUrls.push(`${key} (malformed: ${val})`);
      }
    }
    if (badUrls.length > 0) {
      const detail = badUrls.join(", ");
      console.error("[worldpay-payment] invalid resultURLs — check SITE_URL env var", {
        baseUrl: BASE_URL,
        badUrls,
      });
      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        `Invalid resultURLs (SITE_URL misconfigured): ${detail}`,
        rawPayload:     JSON.stringify(resultURLs),
        httpStatus:     null,
        amountPence:    amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
      });
      return respond(500, { error: "Payment gateway configuration error" });
    }

    const payload: Record<string, unknown> = {
      transactionReference: String(transactionReference).substring(0, 64),
      merchant:  { entity: WORLDPAY_ENTITY },
      narrative: { line1: String(narrative || "Kerala Groceries UK").substring(0, 24) },
      value:     { currency: "GBP", amount: amountInPence },
      resultURLs,
    };

    if (billingAddress && (billingAddress as Record<string, unknown>).address1) {
      const ba = billingAddress as Record<string, unknown>;
      payload.billingAddress = {
        address1:    ba.address1,
        city:        ba.city        || "",
        postalCode:  ba.postalCode  || "",
        countryCode: ba.countryCode || "GB",
        ...(ba.address2 ? { address2: ba.address2 } : {}),
      };
    }

    // Log the BASE_URL so admins can verify the registered domain matches
    console.log(`[worldpay-payment] requesting payment page`, {
      transactionReference,
      amountPence: amountInPence,
      merchantEntity: WORLDPAY_ENTITY,
      resultBaseUrl: BASE_URL,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let wpResponse: Response;
    try {
      wpResponse = await fetch(WORLDPAY_API_URL, {
        method: "POST",
        headers: {
          "Authorization":  `Basic ${credentials}`,
          "Content-Type":   "application/vnd.worldpay.payment_pages-v1.hal+json",
          "Accept":         "application/vnd.worldpay.payment_pages-v1.hal+json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
      console.error("[worldpay-payment] fetch failed", {
        error: msg,
        transactionReference,
        amountPence: amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
        type: isTimeout ? "timeout" : "network",
      });
      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        `Network error reaching Worldpay: ${msg}`,
        rawPayload:     null,
        httpStatus:     null,
        amountPence:    amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
      });
      return respond(502, { error: isTimeout ? "Payment gateway timed out" : "Could not reach payment gateway" });
    }
    clearTimeout(timeout);

    const responseText = await wpResponse.text();

    if (!wpResponse.ok) {
      const wpMessage = extractWorldpayMessage(responseText);
      const userMessage = userMessageForStatus(wpResponse.status);

      // Structured log — visible in Supabase Edge Function logs
      console.error("[worldpay-payment] Worldpay API error", {
        httpStatus:           wpResponse.status,
        transactionReference,
        amountPence:          amountInPence,
        merchantEntity:       WORLDPAY_ENTITY,
        worldpayMessage:      wpMessage,
        responseBody:         responseText.substring(0, 600),
      });

      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        wpMessage
          ? `Worldpay ${wpResponse.status}: ${wpMessage}`
          : `Worldpay API error ${wpResponse.status}`,
        rawPayload:     responseText.slice(0, 2000),
        httpStatus:     wpResponse.status,
        amountPence:    amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
      });

      return respond(502, { error: userMessage });
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[worldpay-payment] Worldpay returned non-JSON", {
        transactionReference,
        amountPence: amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
        responsePreview: responseText.substring(0, 200),
      });
      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        "Worldpay returned non-JSON response",
        rawPayload:     responseText.slice(0, 500),
        httpStatus:     wpResponse.status,
        amountPence:    amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
      });
      return respond(502, { error: "Unexpected response from payment gateway" });
    }

    if (!data.url) {
      console.error("[worldpay-payment] no URL in Worldpay response", {
        transactionReference,
        amountPence: amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
        responsePreview: JSON.stringify(data).substring(0, 200),
      });
      await logError(supabase, {
        orderNumber:    transactionReference,
        source:         "worldpay-payment",
        message:        "No payment URL in Worldpay response",
        rawPayload:     responseText.slice(0, 500),
        httpStatus:     wpResponse.status,
        amountPence:    amountInPence,
        merchantEntity: WORLDPAY_ENTITY,
      });
      return respond(502, { error: "No payment URL returned from gateway" });
    }

    await supabase.from("payment_sessions").upsert({
      order_number:  transactionReference,
      payment_url:   data.url as string,
      amount_pence:  amountInPence,
      status:        "pending",
      created_at:    new Date().toISOString(),
    }, { onConflict: "order_number" });

    console.log(`[worldpay-payment] session created`, {
      transactionReference,
      amountPence: amountInPence,
    });

    return respond(200, { url: data.url });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[worldpay-payment] unexpected error:", msg);
    await logError(supabase, {
      orderNumber:    transactionReference,
      source:         "worldpay-payment",
      message:        `Unexpected: ${msg}`,
      rawPayload:     null,
      httpStatus:     null,
      amountPence:    null,
      merchantEntity: null,
    }).catch(() => {});
    return respond(500, { error: "Internal server error" });
  }
});

interface ErrorLog {
  orderNumber:    string | null;
  source:         string;
  message:        string;
  rawPayload:     string | null;
  httpStatus:     number | null;
  amountPence:    number | null;
  merchantEntity: string | null;
}

async function logError(supabase: ReturnType<typeof createClient>, log: ErrorLog) {
  try {
    await supabase.from("payment_errors").insert({
      order_number:   log.orderNumber,
      source:         log.source,
      error_message:  log.message,
      raw_payload:    log.rawPayload,
      http_status:    log.httpStatus,
      amount_pence:   log.amountPence,
      merchant_entity: log.merchantEntity,
    });
  } catch (err) {
    console.error("[worldpay-payment] failed to log error to DB:", err);
  }
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
