import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function e164(phone: string): string {
  return `+${digitsOnly(phone)}`;
}

function phoneToEmail(phone: string): string {
  return `phone_${digitsOnly(phone)}@keralagrocery.phone`;
}

/** Search all users pages until we find one matching the phone digits */
async function findUserByPhone(
  supabaseUrl: string,
  serviceRoleKey: string,
  phone: string
): Promise<{ id: string; email: string | null } | null> {
  const digits = digitsOnly(phone);
  let page = 1;
  while (true) {
    const r = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
    );
    const d = await r.json();
    const users: any[] = d?.users ?? [];
    if (users.length === 0) break;

    const match = users.find((u: any) => {
      const uDigits = digitsOnly(u.phone ?? "");
      return uDigits === digits && uDigits.length > 0;
    });
    if (match) return { id: match.id, email: match.email ?? null };

    if (users.length < 1000) break;
    page++;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone: rawPhone, token } = await req.json();

    if (!rawPhone || !token) {
      return new Response(
        JSON.stringify({ error: "Phone and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = e164(rawPhone);
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!accountSid || !authToken || !serviceSid) {
      const missing = [
        !accountSid && "TWILIO_ACCOUNT_SID",
        !authToken  && "TWILIO_AUTH_TOKEN",
        !serviceSid && "TWILIO_VERIFY_SERVICE_SID",
      ].filter(Boolean).join(", ");
      console.error(`[verify-otp] Missing Twilio secrets: ${missing}`);
      return new Response(
        JSON.stringify({ error: `Twilio not configured. Missing: ${missing}` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Verify Service SID format — must start with "VA"
    if (!serviceSid.startsWith("VA") || serviceSid.length < 34) {
      console.error(`[verify-otp] TWILIO_VERIFY_SERVICE_SID is invalid: "${serviceSid}"`);
      return new Response(
        JSON.stringify({
          error: "TWILIO_VERIFY_SERVICE_SID is invalid. Must start with 'VA' and be 34 characters.",
          received_prefix: serviceSid.substring(0, 4),
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Verify OTP with Twilio
    const verifyUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
    const formBody = new URLSearchParams({ To: phone, Code: token });
    const basicAuth = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });
    const twilioData = await twilioRes.json();

    if (!twilioRes.ok || twilioData.status !== "approved") {
      return new Response(
        JSON.stringify({ error: twilioData.message || "Invalid or expired verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Find or create the Supabase user — match by phone digits
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const phoneEmail = phoneToEmail(phone);

    let userId: string;
    let userEmail: string;

    const existing = await findUserByPhone(supabaseUrl, serviceRoleKey, phone);

    if (existing) {
      userId = existing.id;
      // If existing user has no email, update them with a derived email so magic link works
      if (!existing.email) {
        await adminClient.auth.admin.updateUserById(userId, {
          email: phoneEmail,
          email_confirm: true,
        });
        userEmail = phoneEmail;
      } else {
        userEmail = existing.email;
      }
    } else {
      // Create new user
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: phoneEmail,
        phone,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: { phone, auth_method: "phone_otp" },
      });

      if (createErr) {
        // Last resort: search again in case of race condition
        const retry = await findUserByPhone(supabaseUrl, serviceRoleKey, phone);
        if (retry) {
          userId = retry.id;
          userEmail = retry.email ?? phoneEmail;
          if (!retry.email) {
            await adminClient.auth.admin.updateUserById(userId, {
              email: phoneEmail,
              email_confirm: true,
            });
            userEmail = phoneEmail;
          }
        } else {
          return new Response(
            JSON.stringify({ error: createErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        userId = created.user!.id;
        userEmail = phoneEmail;
      }
    }

    // Step 3: Generate magic link for session exchange
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ error: linkErr?.message || "Failed to generate session link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hashed_token: linkData.properties.hashed_token,
        email: userEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
