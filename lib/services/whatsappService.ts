type NotificationType = 'welcome' | 'order_placed' | 'order_shipped' | 'order_delivered' | 'order_cancelled';

interface SendNotificationParams {
  phone: string;
  type: NotificationType;
  orderNumber?: string;
  customMessage?: string;
}

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('44')) {
    return '+' + cleaned;
  }

  if (cleaned.startsWith('0')) {
    return '+44' + cleaned.substring(1);
  }

  return '+44' + cleaned;
};

const getMessageForType = (type: NotificationType, orderNumber?: string): string => {
  switch (type) {
    case 'welcome':
      return 'Welcome to Kerala Grocery 🛒\n\nThank you for joining us! Start shopping for fresh groceries delivered to your door.';

    case 'order_placed':
      return `Your order ${orderNumber ? '#' + orderNumber : ''} has been placed successfully.\n\nWe'll notify you when it's on the way!`;

    case 'order_shipped':
      return `Your order is shipped 🚚\n\nYour order ${orderNumber ? '#' + orderNumber : ''} is on its way to you!`;

    case 'order_delivered':
      return `Your order is delivered ✅\n\nYour order ${orderNumber ? '#' + orderNumber : ''} has been delivered. Enjoy your fresh groceries!`;

    case 'order_cancelled':
      return `Order Cancelled\n\nYour order ${orderNumber ? '#' + orderNumber : ''} has been cancelled. If you have any questions, please contact us.`;

    default:
      return 'Thank you for using Kerala Grocery!';
  }
};

export const sendWhatsAppNotification = async ({
  phone,
  type,
  orderNumber,
  customMessage,
}: SendNotificationParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const message = customMessage || getMessageForType(type, orderNumber);

    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      console.error('Supabase configuration missing');
      return { success: false, error: 'Configuration error' };
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const apiUrl = `${base}/functions/v1/send-whatsapp-notification`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message,
        type,
        orderNumber,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WhatsApp notification failed:', errorData);
      return { success: false, error: errorData.error || 'Failed to send notification' };
    }

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to send notification' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const sendWelcomeNotification = async (phone: string) => {
  return sendWhatsAppNotification({ phone, type: 'welcome' });
};

export const sendOrderPlacedNotification = async (phone: string, orderNumber: string) => {
  return sendWhatsAppNotification({ phone, type: 'order_placed', orderNumber });
};

export const sendOrderShippedNotification = async (phone: string, orderNumber: string) => {
  return sendWhatsAppNotification({ phone, type: 'order_shipped', orderNumber });
};

export const sendOrderDeliveredNotification = async (phone: string, orderNumber: string) => {
  return sendWhatsAppNotification({ phone, type: 'order_delivered', orderNumber });
};

export const sendOrderCancelledNotification = async (phone: string, orderNumber: string) => {
  return sendWhatsAppNotification({ phone, type: 'order_cancelled', orderNumber });
};
