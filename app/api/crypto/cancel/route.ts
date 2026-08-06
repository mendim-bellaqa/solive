import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentRow } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * Give up on an open payment. NOWPayments has no "cancel" of its own — the
 * deposit address simply stops being watched by us and expires on their side —
 * so cancelling means marking our row `expired`.
 *
 * Coins sent afterwards are still honoured: the IPN folds in whatever
 * NOWPayments reports, and `finished` outranks `expired`, so a late payment
 * still grants the plan. Nobody loses a plan by tapping cancel.
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let id: string | null = null
  try { id = (await request.json() as { id?: string }).id ?? null } catch { /* bad body */ }
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
  const row = data as PaymentRow | null
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Already paid — say so rather than pretending we cancelled it.
  if (row.status === 'finished') {
    return NextResponse.json({ status: 'finished', planId: row.plan_id })
  }

  // The `neq` guard loses the race deliberately: if the webhook marks this
  // finished at the same moment, the payment stands.
  await admin
    .from('payments')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', id)
    .neq('status', 'finished')

  return NextResponse.json({ status: 'expired' })
}
