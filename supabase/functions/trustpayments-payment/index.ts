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
    const JWT_USERNAME = (Deno.env.get("TRUSTPAYMENTS_JWT_USERNAME") || "Jwt@tastykeral.com").trim();

    if (!JWT_SECRET) {
      return new Response(JSON.stringify({ error: "Gateway configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountPence = Math.round(amount * 100).toString();
    const rawSiteUrl = (Deno.env.get("SITE_URL") || "keralagrocery.com").trim().replace(/\/$/, "");
    const BASE_URL = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

    // Formatting for Trust Payments strict requirements
    const nameParts = (customerName || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "Guest";
    const cleanPhone = (customerPhone || "07000000000").replace(/\D/g, '');
    const cleanOrderRef = orderNumber.replace(/[^a-zA-Z0-9]/g, '');

    // The JWT structure must match exactly: https://help.trustpayments.com/hc/en-us/articles/4402694206353-2-Configure-the-JSON-Web-Token-JWT
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

        // Use both forms of redirect URL for maximum compatibility
        successfulurl: `${BASE_URL}/payment-success?order=${orderNumber}`,
        declinedurl: `${BASE_URL}/cart?error=declined`,
        errorurl: `${BASE_URL}/cart?error=error`,

        callbackurl: `${BASE_URL}/api/trustpayments/webhook`,

        // Optional but helps bypass 3DS challenges
        billingcontactdetails: {
          firstname: firstName.substring(0, 50),
          lastname: lastName.substring(0, 50),
          email: customerEmail,
          telephone: cleanPhone,
          addressline1: (billingAddress?.address || "Street").substring(0, 50),
          town: (billingAddress?.city || "London").substring(0, 50),
          postcode: (billingAddress?.postcode || "SW1A 1AA").replace(/\s+/g, '').substring(0, 10),
          countryiso2a: "GB"
        }
      }
    };

    const secret = new TextEncoder().encode(JWT_SECRET);

    // We sign the JWT using jose
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    // Store session info
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
