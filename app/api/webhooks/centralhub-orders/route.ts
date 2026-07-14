import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.CENTRALHUB_WEBHOOK_SECRET;
    const incomingSecret = req.headers.get('x-webhook-secret');

    if (webhookSecret && incomingSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, record, old_record } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Handle DELETE
    if (type === 'DELETE') {
      const externalId = record?.id || old_record?.id || record?.external_order_id;
      if (externalId) {
        await supabase
          .from('orders')
          .delete()
          .or(`external_order_id.eq.${externalId},id.eq.${externalId}`);
      }
      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    // 2. Handle INSERT/UPDATE
    if (type === 'INSERT' || type === 'UPDATE') {
      const { items, ...orderData } = record;

      // Map incoming status to local primary statuses if necessary
      let localStatus = orderData.order_status?.toLowerCase() || 'pending';
      const processingStatuses = ['picking', 'ready_for_packing', 'packing', 'ready_to_ship', 'confirmed', 'processing'];

      if (processingStatuses.includes(localStatus)) {
        localStatus = 'processing';
      }

      // Match existing order by external_order_id or local ID
      const { data: existing } = await supabase
        .from('orders')
        .select('id, order_status, order_number, customer_phone, customer_name')
        .or(`external_order_id.eq.${orderData.id},id.eq.${orderData.id},order_number.eq.${orderData.order_number}`)
        .maybeSingle();

      const targetId = existing?.id || orderData.id;

      const orderUpsert: any = {
        id: targetId,
        external_order_id: orderData.id || orderData.external_order_id,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        delivery_address: orderData.delivery_address,
        delivery_city: orderData.delivery_city,
        delivery_postcode: orderData.delivery_postcode,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        total: orderData.total,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        order_status: localStatus, // Use mapped status
        payment_reference: orderData.payment_reference,
        notes: orderData.notes,
        shipment_id: orderData.shipment_id,
        tracking_number: orderData.tracking_number,
        courier_name: orderData.courier_name,
        shipping_label_url: orderData.shipping_label_url,
        weight_total: orderData.weight_total,
        updated_at: new Date().toISOString(),
      };

      if (!existing) {
        orderUpsert.order_number = orderData.order_number;
        orderUpsert.created_at = orderData.created_at || new Date().toISOString();
      }

      const { error: oError } = await supabase
        .from('orders')
        .upsert(orderUpsert, { onConflict: 'id' });

      if (oError) throw oError;

      // Handle Order Items if provided
      if (Array.isArray(items) && items.length > 0) {
        const itemsUpsert = items.map((item: any) => ({
          order_id: targetId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        await supabase.from('order_items').delete().eq('order_id', targetId);
        const { error: iError } = await supabase.from('order_items').insert(itemsUpsert);
        if (iError) console.error('Order Items Sync Error:', iError.message);
      }

      // 3. Trigger Customer Notifications on Status Change
      if (existing && existing.order_status !== orderData.order_status) {
        const phone = existing.customer_phone || orderData.customer_phone;
        const orderNumber = existing.order_number || orderData.order_number;

        if (phone && orderNumber) {
          const notificationUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;

          let message = '';
          let type = '';

          if (orderData.order_status === 'shipped') {
            message = `Your order #${orderNumber} has been shipped! tracking number: ${orderData.tracking_number || 'available soon'}`;
            type = 'order_shipped';
          } else if (orderData.order_status === 'delivered') {
            message = `Good news! Your order #${orderNumber} has been delivered. Enjoy your groceries!`;
            type = 'order_delivered';

            // Release pending cashback instantly to available balance
            const { error: releaseErr } = await supabase.rpc('release_order_cashback', { p_order_id: targetId });
            if (releaseErr) console.error('[Webhook] cashback release failed:', releaseErr);
          }

          if (type) {
            await fetch(notificationUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                phone,
                customer_name: existing.customer_name,
                order_number: orderNumber,
                message,
                type,
                tracking_number: orderData.tracking_number,
                courier_name: orderData.courier_name
              }),
            }).catch(err => console.error('Notification Error:', err));
          }
        }
      }
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Order Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
