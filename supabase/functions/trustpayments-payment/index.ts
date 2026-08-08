import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose";

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
    const { amount, orderNumber, customerEmail, customerName, customerPhone, billingAddress } = await req.json();

    if (!amount || !orderNumber) {
      return new Response(JSON.stringify({ error: "Missing amount or orderNumber" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SITE_REFERENCE = (Deno.env.get("TRUSTPAYMENTS_SITE_REFERENCE") || "tastykeral152232").trim();
    const JWT_SECRET = Deno.env.get("TRUSTPAYMENTS_JWT_SECRET")?.trim();
    // Force lowercase to match portal behavior (P59 resolution)
    const JWT_USERNAME = (Deno.env.get("TRUSTPAYMENTS_JWT_USERNAME") || "Jwt@tastykeral.com").trim().toLowerCase();

    if (!JWT_SECRET) {
      return new Response(JSON.stringify({ error: "Gateway configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountPence = Math.round(amount * 100).toString();
    const rawSiteUrl = (Deno.env.get("SITE_URL") || "keralagrocery.com").trim().replace(/\/$/, "");
    const BASE_URL = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

    // Clean name fields
    const nameParts = (customerName || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "Guest";

    // Clean phone: digits only, ensure it's not empty
    const cleanPhone = (customerPhone || "07000000000").replace(/\D/g, '') || "07000000000";

    // Order ref: alphanumeric only, max 30 chars
    const cleanOrderRef = orderNumber.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);

    // Trust Payments JWT Payload
    const payload = {
      iss: JWT_USERNAME,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      payload: {
        accounttypedescription: "ECOM",
        baseamount: amountPence,
        currencyiso3a: "GBP",
        sitereference: SITE_REFERENCE,
        orderreference: cleanOrderRef,
        requesttypedescriptions: ["THREEDQUERY", "AUTH"],
        customeremail: customerEmail,
        successfulurl: `${BASE_URL}/payment-success?order=${orderNumber}`,
        declinedurl: `${BASE_URL}/cart?error=declined`,
        errorurl: `${BASE_URL}/cart?error=error`,
        callbackurl: `${BASE_URL}/api/trustpayments/webhook`,
        billingcontactdetails: {
          firstname: firstName.substring(0, 20),
          lastname: lastName.substring(0, 20),
          email: customerEmail,
          telephone: cleanPhone.substring(0, 15),
          addressline1: (billingAddress?.address || "Address").substring(0, 50),
          town: (billingAddress?.city || "London").substring(0, 50),
          postcode: (billingAddress?.postcode || "SW1A 1AA").replace(/\s+/g, '').substring(0, 10),
          countryiso2a: "GB"
        }
      }
    };

    const secret = new TextEncoder().encode(JWT_SECRET);

    // Standard HS256 signature
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    // Store/Audit session
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("payment_sessions").upsert({
      order_number: orderNumber,
      amount_pence: parseInt(amountPence),
      status: "pending",
      gateway: "trustpayments",
      created_at: new Date().toISOString(),
    }, { onConflict: "order_number" });

    return new Response(JSON.stringify({ jwt, siteReference: SITE_REFERENCE }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[trustpayments-payment] error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
