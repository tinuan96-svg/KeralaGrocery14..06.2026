import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TRACKING_URL = "https://keralagrocery.com/orders";

interface OrderItem {
  name: string;
  qty: number;
}

interface NotificationRequest {
  // Rich order confirmation
  customer_name?: string;
  user_phone?: string;
  order_id?: string;
  order_number?: string;
  items?: OrderItem[];
  total_amount?: number;
  // Legacy generic (welcome, shipped, etc.)
  phone?: string;
  message?: string;
  type?: string;
  orderNumber?: string;
  channel?: 'whatsapp' | 'sms';
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildWhatsAppMessage(
  customerName: string,
  orderId: string,
  items: OrderItem[],
  totalAmount: number,
): string {
  const top = items.slice(0, 2);
  const extra = items.length - top.length;
  const itemLines = top.map(i => `• ${i.name} x${i.qty}`).join("\n");
  const moreLine = extra > 0 ? `\n+${extra} more item${extra > 1 ? "s" : ""}` : "";

  return (
    `🟢 *KG | Kerala Grocery UK*\n\n` +
    `Hey ${customerName}! 👋\n` +
    `Your order is confirmed ✅\n\n` +
    `🧾 Order: #${orderId}\n` +
    `🛍️ ${itemLines}${moreLine}\n` +
    `💰 Total: £${totalAmount.toFixed(2)}\n\n` +
    `👉 ${TRACKING_URL}\n\n` +
    `Need help? Reply here 💬`
  );
}

// SMS must stay close to 160 chars — no markdown, no emojis
function buildSmsMessage(
  customerName: string,
  orderId: string,
  items: OrderItem[],
  totalAmount: number,
): string {
  const top = items.slice(0, 2);
  const extra = items.length - top.length;
  const itemPart = top.map(i => `${i.name} x${i.qty}`).join(", ");
  const morePart = extra > 0 ? ` +${extra} more` : "";
  // ~130 chars baseline so long names still stay under 160
  return (
    `KG Order Confirmed #${orderId}\n` +
    `${itemPart}${morePart}\n` +
    `Total: £${totalAmount.toFixed(2)}\n` +
    `Track: ${TRACKING_URL}`
  );
}

// ── Phone normalisation ───────────────────────────────────────────────────────

function normaliseToE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  // UK mobile: 07xxx → +447xxx
  if (cleaned.startsWith("07") && cleaned.length === 11) return "+44" + cleaned.slice(1);
  // Already 447xxx without leading +
  if (cleaned.startsWith("447") && cleaned.length === 12) return "+" + cleaned;
  return "+" + cleaned;
}

// ── Twilio helper ─────────────────────────────────────────────────────────────

async function sendTwilio(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
): Promise<{ sid: string }> {
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Twilio HTTP ${res.status}`);
  return { sid: data.sid };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function logNotification(
  supabase: ReturnType<typeof createClient>,
  orderId: string | undefined,
  orderNumber: string,
  phone: string,
  channel: "whatsapp" | "sms",
  status: "sent" | "failed",
  messageSid?: string,
  error?: string,
) {
  try {
    await supabase.from("order_notifications").insert({
      order_id: orderId ?? null,
      order_number: orderNumber,
      phone,
      channel,
      status,
      message_sid: messageSid ?? null,
      error: error ?? null,
    });
  } catch (e) {
    console.error("[notify] DB log failed:", e);
  }
}

async function getPreferredChannel(
  supabase: ReturnType<typeof createClient>,
  phone: string,
): Promise<"whatsapp" | "sms" | null> {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("preferred_channel")
      .eq("phone", phone)
      .maybeSingle();
    return (data?.preferred_channel as "whatsapp" | "sms") ?? null;
  } catch {
    return null;
  }
}

async function savePreferredChannel(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  channel: "whatsapp" | "sms",
) {
  try {
    await supabase
      .from("user_profiles")
      .update({ preferred_channel: channel })
      .eq("phone", phone);
  } catch (e) {
    console.error("[notify] savePreferredChannel failed:", e);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const rawWaNum   = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "";
    const rawSmsNum  = Deno.env.get("TWILIO_SMS_NUMBER") ?? rawWaNum.replace(/^whatsapp:/, "");

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!accountSid || !authToken) {
      console.error("[notify] Twilio credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Twilio not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawPhone = (body.user_phone ?? body.phone ?? "").trim();
    if (!rawPhone) {
      return new Response(
        JSON.stringify({ error: "phone / user_phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orderNumber = body.order_number ?? body.orderNumber ?? "";
    const isRichOrder = body.items && body.total_amount !== undefined;

    // Build channel-specific messages
    let waMessage: string;
    let smsMessage: string;
    if (isRichOrder) {
      const name = body.customer_name ?? "Customer";
      const oid  = orderNumber || body.order_id || "N/A";
      waMessage  = buildWhatsAppMessage(name, oid, body.items!, body.total_amount!);
      smsMessage = buildSmsMessage(name, oid, body.items!, body.total_amount!);
    } else if (body.message) {
      waMessage  = `🟢 *KG | Kerala Grocery UK*\n\n${body.message}${orderNumber ? `\n\nOrder: #${orderNumber}` : ""}`;
      smsMessage = `Kerala Grocery UK: ${body.message}${orderNumber ? ` Order: #${orderNumber}` : ""}`;
    } else {
      return new Response(
        JSON.stringify({ error: "items+total_amount or message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const waFrom  = rawWaNum.startsWith("whatsapp:") ? rawWaNum : `whatsapp:${rawWaNum}`;
    const phone   = normaliseToE164(rawPhone);               // E.164 for SMS
    const waTo    = `whatsapp:${phone}`;                     // WhatsApp To
    const smsFrom = rawSmsNum.replace(/^whatsapp:/, "");

    // Look up preferred channel to skip known-failing path
    const preferred = body.channel ?? await getPreferredChannel(supabase, phone);
    console.log(`[notify] phone=${phone} preferred=${preferred ?? "none"}`);

    // ── WhatsApp: try if preferred or unknown ─────────────────────────────────
    if (preferred !== "sms" && rawWaNum) {
      let waSid: string | null = null;
      let waErr: string | null = null;

      // Attempt 1
      try {
        const r = await sendTwilio(accountSid, authToken, waFrom, waTo, waMessage);
        waSid = r.sid;
      } catch (e) {
        waErr = e instanceof Error ? e.message : String(e);
        console.warn(`[notify] WhatsApp attempt 1 failed: ${waErr}`);
      }

      // Attempt 2 (retry once on failure)
      if (!waSid) {
        try {
          const r = await sendTwilio(accountSid, authToken, waFrom, waTo, waMessage);
          waSid = r.sid;
          waErr = null;
        } catch (e) {
          waErr = e instanceof Error ? e.message : String(e);
          console.warn(`[notify] WhatsApp attempt 2 failed: ${waErr}`);
        }
      }

      if (waSid) {
        console.log(`[notify] WhatsApp sent sid=${waSid}`);
        await Promise.all([
          logNotification(supabase, body.order_id, orderNumber, phone, "whatsapp", "sent", waSid),
          savePreferredChannel(supabase, phone, "whatsapp"),
        ]);
        return new Response(
          JSON.stringify({ success: true, channel: "whatsapp", messageSid: waSid }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Log the final WhatsApp failure before falling through
      await logNotification(supabase, body.order_id, orderNumber, phone, "whatsapp", "failed", undefined, waErr ?? undefined);
    }

    // ── SMS fallback ──────────────────────────────────────────────────────────
    if (!smsFrom) {
      console.error("[notify] No SMS number configured");
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp failed and TWILIO_SMS_NUMBER not set" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      const { sid } = await sendTwilio(accountSid, authToken, smsFrom, phone, smsMessage);
      console.log(`[notify] SMS sent sid=${sid}`);
      await Promise.all([
        logNotification(supabase, body.order_id, orderNumber, phone, "sms", "sent", sid),
        savePreferredChannel(supabase, phone, "sms"),
      ]);
      return new Response(
        JSON.stringify({ success: true, channel: "sms", messageSid: sid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (smsErr) {
      const msg = smsErr instanceof Error ? smsErr.message : String(smsErr);
      console.error(`[notify] SMS also failed: ${msg}`);
      await logNotification(supabase, body.order_id, orderNumber, phone, "sms", "failed", undefined, msg);
      return new Response(
        JSON.stringify({ success: false, error: `Both channels failed. Last: ${msg}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("[notify] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
