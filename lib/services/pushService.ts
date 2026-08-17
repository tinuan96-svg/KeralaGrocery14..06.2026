import { getSupabase } from '@/lib/supabase/client';

export interface PushNotificationPayload {
  user_id?: string;
  fcm_token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async (payload: PushNotificationPayload) => {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    // Use service role key if possible from env, but normally we call via anon/auth and the function handles it
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send push notification');

    return { success: true, data };
  } catch (error: any) {
    console.error('[pushService] Error:', error);
    return { success: false, error: error.message };
  }
};
