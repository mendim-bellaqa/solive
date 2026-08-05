import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPayment } from '@/lib/nowpayments'
import { applyPaymentUpdate, TERMINAL_STATUSES, type PaymentRow } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * Checkout polls this while a payment is open. For non-terminal payments it
 * also asks NOWPayments directly and folds the answer in — the same idempotent
 * path the webhook uses — so payments complete even where IPNs can't reach us
 * (local dev) or are delayed.
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 },
    )
  }

  const { data } = await admin.from('payments').select('*').eq('id', id).maybeSingle()
  let row = data as PaymentRow | null
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!TERMINAL_STATUSES.includes(row.status) && row.np_payment_id) {
    try {
      const np = await getPayment(row.np_payment_id)
      row = await applyPaymentUpdate(admin, row, np)
    } catch {
      // NOWPayments unreachable — report what the DB knows and let the
      // client keep polling.
    }
  }

  const { data: ent } = await admin
    .from('entitlements')
    .select('plan_id, plan_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const planActive = Boolean(ent && new Date(ent.plan_expires_at).getTime() > Date.now())

  return NextResponse.json({
    id: row.id,
    status: row.status,
    planId: row.plan_id,
    billing: row.billing,
    priceUsd: row.price_usd,
    payCurrency: row.pay_currency,
    payAmount: row.pay_amount,
    payAddress: row.pay_address,
    actuallyPaid: row.actually_paid,
    expiresAt: row.np_expires_at,
    planActive,
    planExpiresAt: ent?.plan_expires_at ?? null,
  })
}
