import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = JSON.stringify(await req.json());
    } else {
      // Trust Payments often sends URL-encoded form data for notifications
      body = await req.text();
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey || !supabaseUrl) {
      console.error('[trustpayments-webhook-relay] Supabase configuration missing');
      return NextResponse.json({ error: 'Relay misconfigured' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/trustpayments-webhook`, {
      method:  'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[trustpayments-webhook-relay] edge function returned', response.status, text);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }

    // Trust Payments usually expects a specific response or just 200 OK
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[trustpayments-webhook-relay] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
