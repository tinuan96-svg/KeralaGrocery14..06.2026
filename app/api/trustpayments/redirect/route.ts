import { NextRequest, NextResponse } from 'next/server';

// After st.js processes the payment, it submits the form to this action URL.
// The form contains the transaction result. We relay it and redirect the user.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const orderReference = formData.get('orderreference') as string || '';
    const settleStatus = formData.get('settlestatus') as string || '';
    const errorData = formData.get('errormessage') as string || '';

    // Determine success/failure
    // settlestatus "0" = auto settle (success), "1" = manual settle (still success)
    const isSuccess = settleStatus === '0' || settleStatus === '1';

    if (isSuccess) {
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
