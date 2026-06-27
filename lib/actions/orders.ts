'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CreateOrderData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'paypal' | 'card' | 'wallet' | 'cod';
  notes?: string;
  items: OrderItem[];
}

export async function createOrder(orderData: CreateOrderData) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_order_number');

    if (orderNumberError) {
      console.error('Error generating order number:', orderNumberError);
      return { success: false, error: 'Failed to generate order number' };
    }

    const orderNumber = orderNumberData as string;

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id || null;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
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
        payment_status: 'pending',
        order_status: 'pending',
        notes: orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return { success: false, error: 'Failed to create order' };
    }

    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return { success: false, error: 'Failed to create order items' };
    }

    if (orderData.customer_phone) {
      try {
        const notificationUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-whatsapp-notification`;
        await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: orderData.customer_phone,
            message: `Your order #${orderNumber} has been placed successfully.\n\nWe'll notify you when it's on the way!`,
            type: 'order_placed',
            orderNumber: orderNumber,
          }),
        });
      } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
      }
    }

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
      }
    };
  } catch (error) {
    console.error('Unexpected error creating order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getOrderByNumber(orderNumber: string) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Unauthorised' };
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsError) {
      return { success: false, error: 'Failed to fetch order items' };
    }

    return {
      success: true,
      order: {
        ...order,
        items
      }
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateOrderPaymentStatus(
  orderNumber: string,
  paymentStatus: 'paid' | 'failed' | 'refunded',
  paymentReference?: string
) {
  try {
    const supabase = createServerSupabaseClient();

    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (paymentReference) {
      updateData.payment_reference = paymentReference;
    }

    if (paymentStatus === 'paid') {
      updateData.order_status = 'processing';
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('order_number', orderNumber);

    if (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: 'Failed to update payment status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating payment status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateOrderStatus(
  orderNumber: string,
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return { success: false, error: 'Failed to fetch order' };
    }

    const { error } = await supabase
      .from('orders')
      .update({
        order_status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderNumber);

    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: 'Failed to update order status' };
    }

    if (order?.customer_phone && (orderStatus === 'shipped' || orderStatus === 'delivered')) {
      try {
        const notificationUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-whatsapp-notification`;

        const message = orderStatus === 'shipped'
          ? `Your order is on its way! Order #${orderNumber} has been shipped.`
          : `Your order #${orderNumber} has been delivered. Enjoy your fresh groceries!`;

        const type = orderStatus === 'shipped' ? 'order_shipped' : 'order_delivered';

        await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: order.customer_phone, message, type, orderNumber }),
        });
      } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating order status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
