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
    // Maintain original casing as provided in environment
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

    // Clean name fields
    const nameParts = (customerName || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "Guest";

    // Clean phone: digits only, ensure it's not empty, max 15 chars for 3DS2 compatibility
    const cleanPhone = (customerPhone || "07000000000").replace(/\D/g, '') || "07000000000";

    // Order ref: strictly alphanumeric for Trust Payments HPP (Secure Trading legacy endpoint)
    const cleanOrderRef = orderNumber.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);

    // Get client IP for 3DS2
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Trust Payments JWT Payload
    // Documented fields for 3DS2: https://help.trustpayments.com/hc/en-us/articles/360021344493-Web-Payments-Standard-Security-JWT-
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
        customeripname: clientIp.split(',')[0].trim(),
        successfulurl: `${BASE_URL}/payment-success?order=${orderNumber}`,
        declinedurl: `${BASE_URL}/cart?error=declined`,
        callbackurl: `${BASE_URL}/api/trustpayments/webhook`,

        // Billing details - flat fields preferred by modern HPP/3DS2 implementations
        billingfirstname: firstName.substring(0, 50),
        billinglastname: lastName.substring(0, 50),
        billingemail: customerEmail,
        billingtelephone: cleanPhone.substring(0, 15),
        billingaddressline1: (billingAddress?.address || "Address").substring(0, 100),
        billingtown: (billingAddress?.city || "London").substring(0, 50),
        billingcounty: (billingAddress?.county || "").substring(0, 50),
        billingpostcode: (billingAddress?.postcode || "SW1A 1AA").substring(0, 10),
        billingcountryiso2a: "GB"
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

    const { error: sessionError } = await supabase.from("payment_sessions").upsert({
      order_number: orderNumber,
      amount_pence: parseInt(amountPence),
      status: "pending",
      gateway: "trustpayments",
      gateway_session_id: cleanOrderRef,
      payment_url: "HPP",
      created_at: new Date().toISOString(),
    }, { onConflict: "order_number" });

    if (sessionError) {
      console.warn("[trustpayments-payment] session upsert warning:", sessionError.message);
    }

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
