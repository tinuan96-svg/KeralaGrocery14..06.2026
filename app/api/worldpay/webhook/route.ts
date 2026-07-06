import { NextRequest, NextResponse } from 'next/server';

// This route relays Worldpay webhook events to the Supabase edge function.
// It forwards the raw body and the Worldpay signature header intact so that
// the edge function can perform HMAC verification against the original payload.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      console.error(
        '[worldpay-webhook-relay] SUPABASE_SERVICE_ROLE_KEY is not set.',
        'Add it as a server-side environment variable on your hosting provider (Netlify / Vercel).'
      );
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    if (!supabaseUrl) {
      console.error('[worldpay-webhook-relay] Supabase URL not set');
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    // Forward the Worldpay signature header so the edge function can verify it
    const worldpaySignature = req.headers.get('X-Worldpay-Signature');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    };
    if (worldpaySignature) {
      headers['X-Worldpay-Signature'] = worldpaySignature;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/worldpay-webhook`, {
      method:  'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[worldpay-webhook-relay] edge function returned', response.status, text);
      // Return 500 so Worldpay retries the delivery
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[worldpay-webhook-relay] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
