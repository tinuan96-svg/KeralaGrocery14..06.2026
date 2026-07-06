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
  const { order_status, payment_status, customer_name, order_number, tracking_number } = order;

  // Use a single function to generate dynamic SMS messages based on the order status.

  // Priority for payment status events if they are not the main order_status
  if (payment_status === 'failed') {
    return `Hi ${customer_name}, payment for order ${order_number} failed.\n\nPlease try again or contact our support team.`;
  }

  if (payment_status === 'refunded') {
    return `Hi ${customer_name}, your refund for order ${order_number} has been processed successfully.`;
  }

  // Tracking URL construction (placeholder or based on available data)
  const trackingUrl = tracking_number
    ? `https://keralagrocery.com/track/${tracking_number}`
    : `https://keralagrocery.com/account/orders/${order_number}`;

  switch (order_status) {
    case 'pending':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} has been received and is awaiting confirmation.`;
    case 'confirmed':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} has been confirmed. We're preparing it now.`;
    case 'processing':
      return `Hi ${customer_name}, we're preparing your Kerala Grocery order ${order_number}.`;
    case 'packed':
      return `Hi ${customer_name}, your order ${order_number} has been packed and is ready for dispatch.`;
    case 'shipped':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} has been shipped.\n\nTrack your order:\n${trackingUrl}`;
    case 'out_for_delivery':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} is out for delivery today.`;
    case 'delivered':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} has been delivered.\n\nThank you for shopping with Kerala Grocery.`;
    case 'cancelled':
      return `Hi ${customer_name}, your Kerala Grocery order ${order_number} has been cancelled.\n\nPlease contact support if you need assistance.`;
    default:
      return null;
  }
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

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
      .single();

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

    // 4. Validate phone number (E.164)
    let phone = order.customer_phone.replace(/[^\d+]/g, "");
    if (!phone.startsWith("+")) {
      // Default to UK if missing plus sign and starts with 0 or 7
      if (phone.startsWith("0")) phone = "+44" + phone.substring(1);
      else if (phone.startsWith("7")) phone = "+44" + phone;
      else phone = "+" + phone;
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
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append("To", phone);
    params.append("From", twilioPhoneNumber);
    params.append("Body", smsMessage);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioResult = await twilioResponse.json();

    // 7. Log the attempt
    await supabase.from("sms_logs").insert({
      order_id: order.id,
      customer_id: order.user_id,
      phone_number: phone,
      message: smsMessage,
      twilio_sid: twilioResult.sid || null,
      status: twilioResponse.ok ? "sent" : "failed",
      error: twilioResponse.ok ? null : JSON.stringify(twilioResult)
    });

    return new Response(JSON.stringify({
      success: twilioResponse.ok,
      sid: twilioResult.sid,
      error: twilioResponse.ok ? null : twilioResult.message
    }), {
      status: twilioResponse.ok ? 200 : 400,
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
