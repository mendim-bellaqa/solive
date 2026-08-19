'use client'

import { getSupabase } from './client'

/**
 * The account's own record, as opposed to its session list.
 *
 * "My Sessions" answers *what can I play again* — it is a working list, and it
 * is sorted for resuming and replaying. This answers *what has happened here*:
 * when the account started, what it has paid for, what it has accumulated.
 * Different question, different shape, different page.
 */

export interface PaymentEvent {
  id: string
  planId: 'plus' | 'pro'
  billing: 'monthly' | 'annual'
  priceUsd: number
  payCurrency: string | null
  paidAt: Date
}

/** Confirmed purchases only — a payment that never completed is not history,
 *  it is an abandoned checkout, and listing it would read as a charge. */
export async function fetchPayments(userId: string): Promise<PaymentEvent[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('payments')
    .select('id, plan_id, billing, price_usd, pay_currency, paid_at')
    .eq('user_id', userId)
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false })
  if (error || !data) return []
  return data.map(r => ({
    id: r.id as string,
    planId: r.plan_id as 'plus' | 'pro',
    billing: r.billing as 'monthly' | 'annual',
    priceUsd: Number(r.price_usd),
    payCurrency: (r.pay_currency as string | null) ?? null,
    paidAt: new Date(r.paid_at as string),
  }))
}
