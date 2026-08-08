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

    const SITE_REFERENCE = Deno.env.get("TRUSTPAYMENTS_SITE_REFERENCE") || "tastykeral152232";
    const JWT_SECRET = Deno.env.get("TRUSTPAYMENTS_JWT_SECRET");
    const JWT_USERNAME = (Deno.env.get("TRUSTPAYMENTS_JWT_USERNAME") || "Jwt@tastykeral.com").toLowerCase();

    if (!JWT_SECRET) {
      return new Response(JSON.stringify({ error: "Gateway configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountPence = Math.round(amount * 100).toString();
    const rawSiteUrl = (Deno.env.get("SITE_URL") || "keralagrocery.com").trim().replace(/\/$/, "");
    const BASE_URL = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

    // Clean up name fields - Trust Payments requires both firstname and lastname
    const nameParts = (customerName || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    // Clean phone: digits only, no + or spaces
    const cleanPhone = (customerPhone || "0000000000").replace(/\D/g, '');

    // Trust Payments JWT Payload for HPP (Hosted Payment Pages)
    const payload = {
      payload: {
        accounttypedescription: "ECOM",
        baseamount: amountPence,
        currencyiso3a: "GBP",
        sitereference: SITE_REFERENCE,
        orderreference: orderNumber,
        requesttypedescriptions: ["THREEDQUERY", "AUTH"],
        customeremail: customerEmail,

        // Success and Decline Redirects
        successfulurl: `${BASE_URL}/payment-success?order=${orderNumber}`,
        declinedurl: `${BASE_URL}/cart?error=declined`,
        errorurl: `${BASE_URL}/cart?error=payment_error`,

        // Webhook for server-to-server notification
        callbackurl: `${BASE_URL}/api/trustpayments/webhook`,

        // Billing details (Required for 3DS2 / SCA compliance)
        billingcontactdetails: {
          firstname: firstName,
          lastname: lastName,
          email: customerEmail,
          telephone: cleanPhone,
          addressline1: billingAddress?.address || "Street Address",
          town: billingAddress?.city || "London",
          postcode: (billingAddress?.postcode || "SW1A 1AA").replace(/\s+/g, ''),
          countryiso2a: "GB"
        }
      },
      iat: Math.floor(Date.now() / 1000),
      iss: JWT_USERNAME,
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };

    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(secret);

    // Store/Audit the session
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
