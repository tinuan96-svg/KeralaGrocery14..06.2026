import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderEmailRequest {
  orderId: string;
}

const getEmailTemplate = (order: any, items: any[], statusMessage: string) => {
  const brandColor = "#0B5D3B";
  const accentColor = "#6FDB2F";

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="font-weight: bold; color: #333;">${item.product_name}</div>
        <div style="font-size: 12px; color: #666;">Qty: ${item.quantity} x £${Number(item.unit_price).toFixed(2)}</div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #333;">
        £${Number(item.total_price).toFixed(2)}
      </td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - Kerala Grocery</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4faf6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4faf6; padding: 20px;">
        <tr>
          <td>
            <table width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: ${brandColor}; padding: 30px; text-align: center;">
                  <img src="https://keralagrocery.com/logo_KG_Trans.png" alt="Kerala Grocery" width="80" style="margin-bottom: 10px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">KERALA GROCERY</h1>
                  <p style="color: ${accentColor}; margin: 5px 0 0; font-size: 12px; font-weight: bold; uppercase; letter-spacing: 1px;">AUTHENTIC INDIAN FLAVOURS</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px; font-size: 20px; color: #1a1a1a;">Hi ${order.customer_name},</h2>
                  <p style="font-size: 16px; color: #444; margin-bottom: 25px;">
                    ${statusMessage}
                  </p>

                  <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; color: #666;">Order Number:</td>
                        <td style="font-size: 14px; color: #1a1a1a; font-weight: bold; text-align: right;">#${order.order_number}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666;">Date:</td>
                        <td style="font-size: 14px; color: #1a1a1a; font-weight: bold; text-align: right;">${new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #666;">Status:</td>
                        <td style="font-size: 14px; color: ${brandColor}; font-weight: bold; text-align: right; text-transform: uppercase;">${order.order_status}</td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="font-size: 16px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 15px;">Order Summary</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    ${itemsHtml}
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 5px 0; color: #666;">Subtotal</td>
                      <td style="padding: 5px 0; text-align: right; color: #1a1a1a;">£${Number(order.subtotal).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #666;">Delivery Fee</td>
                      <td style="padding: 5px 0; text-align: right; color: #1a1a1a;">${Number(order.delivery_fee) === 0 ? 'FREE' : '£' + Number(order.delivery_fee).toFixed(2)}</td>
                    </tr>
                    ${order.wallet_amount > 0 ? `
                    <tr>
                      <td style="padding: 5px 0; color: #666;">Wallet Applied</td>
                      <td style="padding: 5px 0; text-align: right; color: #e11d48;">-£${Number(order.wallet_amount).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 15px 0; font-size: 18px; font-weight: bold; color: #1a1a1a;">Total</td>
                      <td style="padding: 15px 0; font-size: 20px; font-weight: 900; text-align: right; color: ${brandColor};">£${Number(order.total).toFixed(2)}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 30px; text-align: center;">
                    <a href="https://keralagrocery.com/orders" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; shadow: 0 4px 10px rgba(11, 93, 59, 0.2);">Track Your Order</a>
                  </div>
                </td>
              </tr>

              <!-- Shipping Info -->
              <tr>
                <td style="padding: 0 30px 40px;">
                  <div style="border-top: 1px solid #eee; padding-top: 30px;">
                    <h3 style="font-size: 14px; color: #1a1a1a; margin-bottom: 10px;">Delivery Address</h3>
                    <p style="font-size: 14px; color: #666; margin: 0;">
                      ${order.customer_name}<br>
                      ${order.delivery_address}<br>
                      ${order.delivery_city}, ${order.delivery_postcode}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center;">
                  <p style="font-size: 12px; color: #999; margin-bottom: 10px;">
                    Questions? Reply to this email or call us at <a href="tel:+447902205199" style="color: ${brandColor}; text-decoration: none; font-weight: bold;">+44 7902 205199</a>
                  </p>
                  <p style="font-size: 12px; color: #999; margin: 0;">
                    &copy; ${new Date().getFullYear()} Tasty Kerala Ltd. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const getStatusMessage = (status: string, orderNumber: string): string => {
  const messages: Record<string, string> = {
    "pending": `We've received your order #${orderNumber}. It's currently awaiting confirmation.`,
    "confirmed": `Great news! Your order #${orderNumber} has been confirmed and we're starting to prepare it.`,
    "processing": `Our team is carefully hand-picking and preparing your items for order #${orderNumber}.`,
    "packed": `Your order #${orderNumber} has been packed with care and is ready for dispatch.`,
    "shipped": `Your parcel for order #${orderNumber} is on its way! You can track it using the link below.`,
    "out_for_delivery": `Your order #${orderNumber} is out for delivery and should be with you today!`,
    "delivered": `Your order #${orderNumber} has been successfully delivered. We hope you enjoy your fresh groceries!`,
    "cancelled": `Order #${orderNumber} has been cancelled as requested.`,
    "refunded": `A refund has been processed for your order #${orderNumber}.`,
    "payment_failed": `We were unable to process payment for order #${orderNumber}. Please try again to complete your purchase.`,
  };
  return messages[status.toLowerCase()] || `Your order #${orderNumber} status has been updated to ${status}.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json() as OrderEmailRequest;

    if (!orderId) {
      throw new Error("orderId is required");
    }

    // 1. Fetch order details with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`);
    }

    // 2. Prepare Email Content
    const statusMessage = getStatusMessage(order.order_status, order.order_number);
    const html = getEmailTemplate(order, order.order_items || [], statusMessage);
    const subject = `Order Update #${order.order_number}: ${order.order_status.toUpperCase()}`;

    // 3. Send Email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kerala Grocery <orders@keralagrocery.com>",
        to: [order.customer_email],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[send-order-email] Resend API error:", result);
      return new Response(JSON.stringify({ success: false, error: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[send-order-email] error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
