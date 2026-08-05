import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyIpnSignature, type NpPayment } from '@/lib/nowpayments'
import { applyPaymentUpdate, type PaymentRow } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * NOWPayments IPN endpoint — the thing that actually grants plans. There is
 * deliberately no session auth here: the HMAC signature over the raw body is
 * the authentication. Everything downstream is idempotent, so retries and
 * out-of-order deliveries are safe.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const sig = request.headers.get('x-nowpayments-sig')
  if (!verifyIpnSignature(raw, sig)) {
    console.warn('[crypto/webhook] rejected IPN with bad signature')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    // Signed, legitimate IPN but the server is misconfigured — 500 so
    // NOWPayments retries once SUPABASE_SERVICE_ROLE_KEY is fixed.
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  try {
    const np = JSON.parse(raw) as NpPayment

    let row: PaymentRow | null = null
    if (np.payment_id !== undefined && np.payment_id !== null) {
      const { data } = await admin
        .from('payments').select('*')
        .eq('np_payment_id', String(np.payment_id))
        .maybeSingle()
      row = data as PaymentRow | null
    }
    if (!row && np.order_id) {
      const { data } = await admin
        .from('payments').select('*')
        .eq('id', np.order_id)
        .maybeSingle()
      row = data as PaymentRow | null
    }

    // Unknown payment: acknowledge anyway — a 4xx would only make NOWPayments
    // retry something we will never have a row for.
    if (row) await applyPaymentUpdate(admin, row, np)
  } catch (err) {
    console.error('[crypto/webhook]', err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
