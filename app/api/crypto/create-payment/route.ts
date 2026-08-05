import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  NowPaymentsError,
  createPayment,
  getMerchantCoins,
  getMinAmountUsd,
  isNowPaymentsConfigured,
} from '@/lib/nowpayments'
import { PLANS, priceUsd, type Billing, type PlanId } from '@/lib/plan-data'

export const dynamic = 'force-dynamic'

// Non-terminal statuses count against the open-payments valve below.
const OPEN_STATUSES = ['created', 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid']

export async function POST(request: Request) {
  if (!isNowPaymentsConfigured()) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Crypto payments are not configured yet (NOWPAYMENTS_API_KEY is missing).' },
      { status: 503 },
    )
  }
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 },
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to purchase a plan.' },
      { status: 401 },
    )
  }

  let body: { planId?: string; billing?: string; payCurrency?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid request body.' }, { status: 400 })
  }

  const planId = body.planId as PlanId
  const billing = body.billing as Billing
  const payCurrency = String(body.payCurrency ?? '').toLowerCase()
  const plan = PLANS.find(p => p.id === planId && p.id !== 'free')
  if (!plan || (billing !== 'monthly' && billing !== 'annual') || !/^[a-z0-9]{2,20}$/.test(payCurrency)) {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid plan, billing period or currency.' }, { status: 400 })
  }

  try {
    const coins = await getMerchantCoins()
    if (!coins.includes(payCurrency)) {
      return NextResponse.json(
        { error: 'bad_currency', message: 'That cryptocurrency is not available. Pick one from the list.' },
        { status: 400 },
      )
    }

    // Cheap abuse valve: each attempt creates a NOWPayments payment + a row.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', OPEN_STATUSES)
      .gte('created_at', hourAgo)
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'You have several pending payments already. Finish or let one expire before starting another.' },
        { status: 429 },
      )
    }

    const price = priceUsd(planId, billing)

    // Some coins have network minimums above a small plan price (e.g. BTC).
    const minUsd = await getMinAmountUsd(payCurrency)
    if (minUsd !== null && minUsd > price) {
      return NextResponse.json(
        {
          error: 'min_amount',
          message: `The minimum ${payCurrency.toUpperCase()} payment is about $${minUsd.toFixed(2)} — pick another coin, or choose annual billing.`,
        },
        { status: 400 },
      )
    }

    const { data: row, error: insertError } = await admin
      .from('payments')
      .insert({ user_id: user.id, plan_id: planId, billing, price_usd: price, pay_currency: payCurrency })
      .select('id')
      .single()
    if (insertError || !row) throw insertError ?? new Error('insert failed')

    // Only send a callback URL NOWPayments can actually reach — during local
    // dev the status route's polling covers the gap instead.
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const ipnCallbackUrl =
      origin.startsWith('https://') && !origin.includes('localhost')
        ? `${origin.replace(/\/$/, '')}/api/crypto/webhook`
        : undefined

    let np
    try {
      np = await createPayment({
        priceUsd: price,
        payCurrency,
        orderId: row.id,
        orderDescription: `hzaura ${plan.name} — ${billing}`,
        ipnCallbackUrl,
      })
    } catch (err) {
      await admin.from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (err instanceof NowPaymentsError && err.status < 500) {
        return NextResponse.json(
          { error: 'payment_rejected', message: friendlyNpMessage(err.message, payCurrency) },
          { status: 400 },
        )
      }
      throw err
    }

    const expiresAt = np.expiration_estimate_date ?? null
    await admin.from('payments')
      .update({
        np_payment_id: String(np.payment_id),
        pay_address: np.pay_address,
        pay_amount: np.pay_amount,
        pay_currency: np.pay_currency ?? payCurrency,
        np_expires_at: expiresAt,
        status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    return NextResponse.json({
      id: row.id,
      payAddress: np.pay_address,
      payAmount: np.pay_amount,
      payCurrency: (np.pay_currency ?? payCurrency).toLowerCase(),
      priceUsd: price,
      expiresAt,
      status: 'waiting',
    })
  } catch (err) {
    console.error('[crypto/create-payment]', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Could not start the payment. Please try again.' },
      { status: 502 },
    )
  }
}

function friendlyNpMessage(raw: string, coin: string): string {
  if (/amount.*(small|less|minimal|minimum)/i.test(raw)) {
    return `This amount is below the ${coin.toUpperCase()} network minimum — pick another coin, or choose annual billing.`
  }
  return raw
}
