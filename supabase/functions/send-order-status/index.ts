import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderStatusRequest {
  orderId: string;
}

const getDynamicMessage = (status: string): string => {
  const messages: Record<string, string> = {
    "Pending": "Your order has been received and is awaiting confirmation.",
    "Confirmed": "We've received your order and are preparing it.",
    "Processing": "Our team is carefully preparing your order.",
    "Packed": "Your order has been packed and is ready for dispatch.",
    "Shipped": "Your parcel has been shipped and is on its way.",
    "Out for Delivery": "Your order is out for delivery and should arrive today.",
    "Delivered": "Your order has been delivered successfully. Thank you for shopping with Kerala Grocery.",
    "Cancelled": "Your order has been cancelled. Please contact us if you need any assistance.",
    "Refunded": "Your refund has been processed successfully.",
    "Payment Failed": "We couldn't process your payment. Please try again or contact our support team.",
    "Returned": "Your return has been received and processed.",
  };
  return messages[status] || `Your order status has been updated to ${status}.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json() as OrderStatusRequest;

    if (!orderId) {
      throw new Error("orderId is required");
    }

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`);
    }

    // 2. Fetch active Twilio template
    const { data: template, error: templateError } = await supabase
      .from("twilio_templates")
      .select("*")
      .eq("name", "order_status_update")
      .eq("active", true)
      .single();

    if (templateError || !template) {
      throw new Error("Active Twilio template 'order_status_update' not found");
    }

    // 3. Prepare variables
    const status = order.order_status;
    // Capitalize first letter if needed, or map exactly
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const dynamicMessage = getDynamicMessage(displayStatus);

    const variables = {
      "1": order.customer_name,
      "2": order.order_number,
      "3": displayStatus,
      "4": dynamicMessage
    };

    // 4. Send WhatsApp message using Twilio Content SID
    const phone = order.customer_phone.replace(/[^\d+]/g, "");
    const to = phone.startsWith("+") ? `whatsapp:${phone}` : `whatsapp:+${phone}`;
    const from = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    // Using ContentSid and ContentVariables
    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", from);
    params.append("ContentSid", template.content_sid);
    params.append("ContentVariables", JSON.stringify(variables));

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await response.json();

    // 5. Record result in message_logs
    const logData = {
      order_id: order.id,
      customer_id: order.user_id,
      template_name: template.name,
      twilio_sid: result.sid || null,
      status: response.ok ? "sent" : "failed",
      error: response.ok ? null : JSON.stringify(result),
    };

    await supabase.from("message_logs").insert(logData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
