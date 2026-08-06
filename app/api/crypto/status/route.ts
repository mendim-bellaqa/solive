import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPayment } from '@/lib/nowpayments'
import { applyPaymentUpdate, TERMINAL_STATUSES, type PaymentRow } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/** NOWPayments quotes a deposit window (~20 minutes). Rows that never got one
 *  are given an hour before we call them dead. */
const FALLBACK_WINDOW_MS = 60 * 60 * 1000

function isPastWindow(row: PaymentRow): boolean {
  const ends = row.np_expires_at
    ? new Date(row.np_expires_at).getTime()
    : new Date(row.created_at).getTime() + FALLBACK_WINDOW_MS
  return Number.isFinite(ends) && ends < Date.now()
}

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

  // A deposit window that has run out is over, whatever NOWPayments still says
  // about it — theirs can sit on "waiting" long after the address stopped
  // being useful, and the checkout would keep offering it as resumable. Late
  // funds are still honoured: the IPN's `finished` outranks `expired`.
  if (!TERMINAL_STATUSES.includes(row.status) && isPastWindow(row)) {
    const { data: expired } = await admin
      .from('payments')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .neq('status', 'finished')
      .select('*')
      .maybeSingle()
    if (expired) row = expired as PaymentRow
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
