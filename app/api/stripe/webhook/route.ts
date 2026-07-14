import { NextRequest, NextResponse } from 'next/server';

// This route relays Stripe webhook events to the Supabase edge function.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      console.error(
        '[stripe-webhook-relay] SUPABASE_SERVICE_ROLE_KEY is not set.',
        'Add it as a server-side environment variable on your hosting provider (Netlify / Vercel).'
      );
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    if (!supabaseUrl) {
      console.error('[stripe-webhook-relay] Supabase URL not set');
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    // Forward the Stripe signature header
    const stripeSignature = req.headers.get('stripe-signature');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    };
    if (stripeSignature) {
      headers['stripe-signature'] = stripeSignature;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-webhook`, {
      method:  'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[stripe-webhook-relay] edge function returned', response.status, text);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[stripe-webhook-relay] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
