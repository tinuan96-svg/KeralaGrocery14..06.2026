import { NextRequest, NextResponse } from 'next/server';

// This route relays Trust Payments URL notifications to the Supabase edge function.
// Configure this URL in your Trust Payments Portal notification rules:
//   https://keralagrocery.com/api/trustpayments/webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      console.error(
        '[trustpayments-webhook-relay] SUPABASE_SERVICE_ROLE_KEY is not set.',
        'Add it as a server-side environment variable on your hosting provider.'
      );
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    if (!supabaseUrl) {
      console.error('[trustpayments-webhook-relay] Supabase URL not set');
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/trustpayments-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[trustpayments-webhook-relay] edge function returned', response.status, text);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[trustpayments-webhook-relay] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Trust Payments also sends GET requests for notification verification
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
