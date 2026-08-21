import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Base64URL encode without padding (for JWT parts)
function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// HMAC-SHA256 using Web Crypto API
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJwt(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const keyBytes = new TextEncoder().encode(secret);
  const sig = await hmacSha256(keyBytes.buffer, data);
  const sigB64 = arrayBufferToBase64Url(sig);
  return `${data}.${sigB64}`;
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
    const { amount, orderNumber, customerEmail, customerName } = await req.json();

    if (!amount || !orderNumber) {
      return new Response(JSON.stringify({ error: "Missing amount or orderNumber" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteReference = Deno.env.get("TRUSTPAYMENTS_SITE_REFERENCE") || Deno.env.get("WORLDPAY_ENTITY");
    const jwtSecret = Deno.env.get("TRUSTPAYMENTS_JWT_SECRET") || Deno.env.get("WORLDPAY_PASSWORD");
    const jwtUsername = Deno.env.get("TRUSTPAYMENTS_JWT_USERNAME") || Deno.env.get("WORLDPAY_USERNAME");

    if (!siteReference || !jwtSecret || !jwtUsername) {
      console.error("[trustpayments-jwt] Missing credentials:", {
        hasSiteRef: !!siteReference,
        hasSecret: !!jwtSecret,
        hasUser: !!jwtUsername
      });
      return new Response(JSON.stringify({ error: "Trust Payments credentials not configured in environment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseAmount = Math.round(amount * 100);
    const iat = Math.floor(Date.now() / 1000);

    // Official Trust Payments JWT Payload Structure
    const jwtPayload = {
      iss: jwtUsername,
      iat,
      payload: {
        accounttypedescription: "ECOM",
        sitereference: siteReference,
        currencyiso3a: "GBP",
        baseamount: baseAmount.toString(),
        orderreference: orderNumber,
        // THREEDQUERY is required for 3D Secure 2.0 (SCA compliance in UK)
        requesttypedescriptions: ["THREEDQUERY", "AUTH"],
        ...(customerEmail ? { customeremail: customerEmail } : {}),
        ...(customerName ? { customerfirstname: customerName.split(" ")[0] || "" } : {}),
      },
    };

    const jwt = await createJwt(jwtPayload, jwtSecret);

    console.log(`[trustpayments-jwt] JWT generated for order ${orderNumber}, amount ${baseAmount} pence`);

    // Store session info
    const { error: upsertError } = await supabase.from("payment_sessions").upsert({
      order_number: orderNumber,
      amount_pence: baseAmount,
      status: "pending",
      gateway: "trustpayments",
      created_at: new Date().toISOString(),
    }, { onConflict: "order_number" });

    if (upsertError) {
      console.error("[trustpayments-jwt] database upsert error:", upsertError);
    }

    return new Response(JSON.stringify({ jwt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[trustpayments-jwt] error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
