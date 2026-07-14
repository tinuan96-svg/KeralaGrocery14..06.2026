import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderSMSRequest {
  orderId: string;
}

const generateSMSMessage = (order: any): string | null => {
  const {
    order_status,
    shipment_status,
    payment_status,
    customer_name,
    order_number,
    tracking_number
  } = order;

  // Priority for payment status events
  if (payment_status === 'failed') {
    return `Hi ${customer_name}, payment for order ${order_number} failed.\n\nPlease try again or contact our support team.`;
  }

  if (payment_status === 'refunded') {
    return `Hi ${customer_name}, your refund for order ${order_number} has been processed successfully.`;
  }

  // Tracking URL construction
  const trackingUrl = tracking_number
    ? `https://keralagrocery.com/track/${tracking_number}`
    : `https://keralagrocery.com/account/orders/${order_number}`;

  // Categorize statuses to choose the right template
  const shipmentStatuses = ['shipped', 'out_for_delivery', 'delivered'];

  // If order_status is a shipment-related status, or if we have a specific shipment_status set
  const isShipmentUpdate = shipmentStatuses.includes(order_status) || (shipment_status && shipment_status !== 'pending' && shipment_status !== '');

  const statusToDisplay = (isShipmentUpdate && shipment_status && shipment_status !== 'pending')
    ? shipment_status
    : order_status;

  const displayStatus = statusToDisplay.replace(/_/g, ' ').toUpperCase();

  if (isShipmentUpdate) {
    // Template 2: Shipment changes
    return `Hi ${customer_name}, your shipment for order #${order_number} is now ${displayStatus}.\n\nTrack your order:\n${trackingUrl}`;
  } else {
    // Template 1: Order status changes
    return `Hi ${customer_name}, your order #${order_number} status has been updated to ${displayStatus}.\n\nView details: https://keralagrocery.com/account/orders/${order_number}`;
  }
};

async function sendTwilioSMS(to: string, body: string, config: { sid: string, token: string, from: string }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`;
  const params = new URLSearchParams();
  params.append("To", to);
  params.append("From", config.from);
  params.append("Body", body);

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${config.sid}:${config.token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = await response.json();

      if (response.ok) {
        return { success: true, sid: result.sid };
      }

      // If 429 or 5xx, retry
      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }

      return { success: false, error: result.message || "Twilio API Error", sid: result.sid };
    } catch (err) {
      attempt++;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return { success: false, error: err.message };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured in environment secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { orderId } = await req.json() as OrderSMSRequest;

    if (!orderId) throw new Error("orderId is required");

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error(`Order not found: ${orderError?.message}`);

    // 2. Fetch notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const currentSettings = settings || { sms_enabled: true };

    if (!currentSettings.sms_enabled) {
      return new Response(JSON.stringify({ success: true, message: "SMS globally disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check specific status settings
    const statusFieldMap: Record<string, string> = {
      'confirmed': 'order_confirmed',
      'processing': 'processing',
      'packed': 'packed',
      'shipped': 'shipped',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled'
    };

    const statusField = statusFieldMap[order.order_status];
    if (statusField && currentSettings[statusField] === false) {
      return new Response(JSON.stringify({ success: true, message: `SMS for status ${order.order_status} disabled` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (order.payment_status === 'failed' && currentSettings.payment_failed === false) {
      return new Response(JSON.stringify({ success: true, message: "SMS for payment_failed disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (order.payment_status === 'refunded' && currentSettings.refunded === false) {
      return new Response(JSON.stringify({ success: true, message: "SMS for refunded disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Generate message
    const smsMessage = generateSMSMessage(order);
    if (!smsMessage) {
      return new Response(JSON.stringify({ success: true, message: "No message for this status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Validate and format phone number (E.164)
    let phone = order.customer_phone.replace(/[^\d+]/g, "");
    if (!phone.startsWith("+")) {
      // Default to UK (+44) if it looks like a UK number
      if (phone.startsWith("0")) phone = "+44" + phone.substring(1);
      else if (phone.startsWith("7")) phone = "+44" + phone;
      else if (phone.length === 10) phone = "+44" + phone; // Assume UK if 10 digits
      else phone = "+" + phone;
    }

    if (phone.length < 10) {
      throw new Error(`Invalid phone number format: ${order.customer_phone}`);
    }

    // 5. Prevent duplicate SMS for same message content on same order
    const { data: existingLogs } = await supabase
      .from("sms_logs")
      .select("id")
      .eq("order_id", order.id)
      .eq("message", smsMessage)
      .eq("status", "sent")
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      return new Response(JSON.stringify({ success: true, message: "Duplicate SMS skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. Send SMS using Twilio
    const twilioResult = await sendTwilioSMS(phone, smsMessage, {
      sid: twilioAccountSid,
      token: twilioAuthToken,
      from: twilioPhoneNumber
    });

    // 7. Log the attempt
    await supabase.from("sms_logs").insert({
      order_id: order.id,
      customer_id: order.user_id,
      phone_number: phone,
      message: smsMessage,
      twilio_sid: twilioResult.sid || null,
      status: twilioResult.success ? "sent" : "failed",
      error: twilioResult.success ? null : twilioResult.error
    });

    return new Response(JSON.stringify({
      success: twilioResult.success,
      sid: twilioResult.sid,
      error: twilioResult.success ? null : twilioResult.error
    }), {
      status: twilioResult.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("SMS Edge Function Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
