// Shared server-side payment state logic. Both the IPN webhook and the
// status-polling route funnel through applyPaymentUpdate, so it makes no
// difference which of the two learns about a status change first.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NpPayment } from './nowpayments'

export type PaymentStatus =
  | 'created' | 'waiting' | 'confirming' | 'confirmed' | 'sending'
  | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired'

export const TERMINAL_STATUSES: PaymentStatus[] = ['finished', 'failed', 'refunded', 'expired']

// NOWPayments retries IPNs and delivery order isn't guaranteed. Statuses only
// ever move up this ranking, so a late "waiting" can never overwrite a
// "finished" row.
const STATUS_RANK: Record<PaymentStatus, number> = {
  created: 0,
  waiting: 1,
  confirming: 2,
  confirmed: 3,
  sending: 4,
  partially_paid: 4,
  expired: 5,
  failed: 5,
  refunded: 5,
  finished: 6,
}

export interface PaymentRow {
  id: string
  user_id: string
  plan_id: 'plus' | 'pro'
  billing: 'monthly' | 'annual'
  price_usd: number | string
  pay_currency: string | null
  pay_amount: number | string | null
  pay_address: string | null
  np_payment_id: string | null
  np_expires_at: string | null
  status: PaymentStatus
  actually_paid: number | string | null
  paid_at: string | null
  created_at: string
}

/**
 * Fold a NOWPayments payment object (IPN body or GET /payment response) into
 * our row, and grant the entitlement when it reaches `finished`. The grant
 * itself is a one-shot RPC (`paid_at is null` claim), so calling this any
 * number of times, from any number of concurrent requests, activates the plan
 * exactly once.
 */
export async function applyPaymentUpdate(
  admin: SupabaseClient,
  row: PaymentRow,
  np: NpPayment,
): Promise<PaymentRow> {
  const next = String(np.payment_status) as PaymentStatus
  if (!(next in STATUS_RANK)) return row

  const patch: Record<string, unknown> = {
    last_ipn: np,
    updated_at: new Date().toISOString(),
  }
  if (STATUS_RANK[next] >= STATUS_RANK[row.status]) patch.status = next
  if (np.actually_paid !== undefined) patch.actually_paid = np.actually_paid
  if (np.outcome_amount !== undefined) patch.outcome_amount = np.outcome_amount
  if (np.outcome_currency !== undefined) patch.outcome_currency = np.outcome_currency

  const { data, error } = await admin
    .from('payments')
    .update(patch)
    .eq('id', row.id)
    .select('*')
    .single()
  if (error || !data) return row

  const updated = data as PaymentRow
  if (updated.status === 'finished' && !updated.paid_at) {
    await admin.rpc('grant_entitlement_for_payment', { p_payment_id: updated.id })
    updated.paid_at = new Date().toISOString()
  }
  return updated
}
