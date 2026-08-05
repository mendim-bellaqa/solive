'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from './supabase/client'
import { PLAN_LIMITS, type PlanId } from './plan-data'

// The catalog itself lives in plan-data.ts so server code (payment routes)
// can price plans without pulling in this client module. Re-exported here so
// existing `@/lib/plan` imports keep working unchanged.
export * from './plan-data'

const KEY = 'hzaura_plan'
const EVT = 'hzaura-plan-change'

export function getStoredPlan(): PlanId {
  if (typeof window === 'undefined') return 'free'
  const v = window.localStorage.getItem(KEY)
  return v === 'plus' || v === 'pro' ? v : 'free'
}

export function setStoredPlan(id: PlanId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, id)
  window.dispatchEvent(new Event(EVT))
}

/**
 * React hook — current plan, its limits, and a setter (kept in sync across
 * the app). localStorage answers instantly and keeps signed-out/demo mode
 * working; for signed-in users the server-side `entitlements` row (written
 * only by the payment webhook) is the source of truth and is mirrored back
 * into localStorage so every consumer and the cross-tab event stay in sync.
 * `expiresAt` is null on free (or while the entitlement is still loading).
 */
export function usePlan() {
  const [plan, setPlan] = useState<PlanId>('free')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)

  useEffect(() => {
    setPlan(getStoredPlan())
    const sync = () => setPlan(getStoredPlan())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)

    const supabase = getSupabase()
    let cancelled = false

    async function refresh() {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setExpiresAt(null); return }

      const { data, error } = await supabase
        .from('entitlements')
        .select('plan_id, plan_expires_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled || error) return

      const until = data ? new Date(data.plan_expires_at) : null
      const active = until !== null && until.getTime() > Date.now()
      const effective: PlanId =
        active && (data!.plan_id === 'plus' || data!.plan_id === 'pro') ? data!.plan_id : 'free'
      setExpiresAt(active ? until : null)
      if (getStoredPlan() !== effective) setStoredPlan(effective)
      setPlan(effective)
    }

    refresh()
    const sub = supabase?.auth.onAuthStateChange(() => { refresh() })

    return () => {
      cancelled = true
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
      sub?.data.subscription.unsubscribe()
    }
  }, [])

  const choosePlan = useCallback((id: PlanId) => { setStoredPlan(id); setPlan(id) }, [])

  return { plan, limits: PLAN_LIMITS[plan], choosePlan, expiresAt }
}
