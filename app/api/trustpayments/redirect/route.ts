import { NextRequest, NextResponse } from 'next/server';

// After st.js processes the payment, it submits the form to this action URL.
// The form contains the transaction result. We redirect the user based on the outcome.
export async function POST(req: NextRequest) {
  if (process.env.CAPACITOR_BUILD === 'true') return new Response(null, { status: 200 });
  try {
    const formData = await req.formData();
    const orderReference = (formData.get('orderreference') as string) || '';
    const settleStatus = (formData.get('settlestatus') as string) || '';
    const errorCode = (formData.get('errorcode') as string) || '';
    const errorData = (formData.get('error') as string) || (formData.get('errormessage') as string) || '';

    // errorcode "0" = no error (authorisation successful)
    // settlestatus "2" = suspended (payment held)
    const isAuthorised = errorCode === '0' && settleStatus !== '2';

    if (isAuthorised) {
      return NextResponse.redirect(
        new URL(`/payment-success?order=${orderReference}`, req.url),
        303
      );
    } else {
      const reason = errorData || 'Payment was declined';
      return NextResponse.redirect(
        new URL(`/payment-failed?order=${orderReference}&reason=${encodeURIComponent(reason)}`, req.url),
        303
      );
    }
  } catch (error) {
    console.error('[trustpayments-redirect] error:', error);
    return NextResponse.redirect(new URL('/cart', req.url), 303);
  }
}
