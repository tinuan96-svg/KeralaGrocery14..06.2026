import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Courier-Secret',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Example payload structure: { tracking_number: '12345', status: 'delivered', courier: 'DHL' }
    const { tracking_number, status, courier } = body;

    if (!tracking_number || !status) {
      return NextResponse.json({ error: 'Missing tracking data' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find the order by tracking number
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, order_number, customer_phone, order_status')
      .eq('tracking_number', tracking_number)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found for tracking number' }, { status: 404 });
    }

    // 2. Update order status if it has changed
    let nextStatus = order.order_status;
    if (status === 'delivered') nextStatus = 'delivered';
    else if (status === 'shipped' || status === 'in_transit') nextStatus = 'shipped';

    if (nextStatus !== order.order_status) {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          order_status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateErr) throw updateErr;

      // 2.1 Release pending cashback if delivered
      if (nextStatus === 'delivered') {
        const { error: rpcErr } = await supabase.rpc('release_order_cashback', { p_order_id: order.id });
        if (rpcErr) console.error('[courier-webhook] Cashback release failed:', rpcErr);
      }

      // 3. Trigger SMS Notification
      if (order.customer_phone) {
        const message = nextStatus === 'delivered'
          ? `Good news! Your order #${order.order_number} has been delivered. Enjoy your Kerala groceries! ✅`
          : `Your order #${order.order_number} is on the way! Track it here: https://keralagrocery.com/orders`;

        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ phone: order.customer_phone, message }),
        }).catch(err => console.error('Notification error:', err));
      }
    }

    return NextResponse.json({ ok: true, order_number: order.order_number, new_status: nextStatus });

  } catch (error: any) {
    console.error('Courier Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
