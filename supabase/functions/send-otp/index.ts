import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Rate Limiting ────────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Limit: 3 requests per 5 minutes (300 seconds) per IP
    const { data: allowed, error: limitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: clientIp,
      p_action: 'send-otp',
      p_max_requests: 3,
      p_window_seconds: 300
    });

    if (limitError) {
      console.error('[send-otp] Rate limit error:', limitError);
    } else if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again in a few minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid  = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken   = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid  = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const whatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    // ── Validate all required credentials are present ────────────────────────
    if (!accountSid || !authToken || !serviceSid) {
      const missing = [
        !accountSid  && "TWILIO_ACCOUNT_SID",
        !authToken   && "TWILIO_AUTH_TOKEN",
        !serviceSid  && "TWILIO_VERIFY_SERVICE_SID",
      ].filter(Boolean).join(", ");
      console.error(`[send-otp] Missing Twilio secrets: ${missing}`);
      return new Response(
        JSON.stringify({ error: `Twilio not configured. Missing: ${missing}` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate Verify Service SID format (must start with "VA") ────────────
    if (!serviceSid.startsWith("VA") || serviceSid.length < 34) {
      console.error(`[send-otp] TWILIO_VERIFY_SERVICE_SID is invalid: "${serviceSid}". Must start with "VA" and be 34 characters.`);
      return new Response(
        JSON.stringify({
          error: "TWILIO_VERIFY_SERVICE_SID is invalid. It must start with 'VA' and be 34 characters long. Please update this secret in Supabase with your real Verify Service SID from the Twilio Console.",
          hint:  "Go to Twilio Console → Verify → Services → copy the SID starting with VA...",
          received_prefix: serviceSid.substring(0, 4),
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
    const auth = btoa(`${accountSid}:${authToken}`);

    // Send OTP via SMS (primary)
    const smsBody = new URLSearchParams({ To: phone, Channel: "sms" });
    const smsRes  = await fetch(verifyUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: smsBody.toString(),
    });
    const smsData = await smsRes.json();

    if (!smsRes.ok) {
      console.error(`[send-otp] Twilio error ${smsRes.status}:`, JSON.stringify(smsData));
      return new Response(
        JSON.stringify({ error: smsData.message || "Failed to send OTP", twilio_code: smsData.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via WhatsApp as well if configured (non-blocking, best-effort)
    if (whatsappNumber) {
      const waBody = new URLSearchParams({ To: phone, Channel: "whatsapp" });
      fetch(verifyUrl, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: waBody.toString(),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, status: smsData.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-otp] unexpected error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
