'use client'

import { useCallback, useEffect, useState } from 'react'

export type PlanId = 'free' | 'plus' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  price: number          // monthly USD
  tagline: string
  features: string[]
  highlight?: boolean
  cta: string
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Try it out, no account needed.',
    features: [
      'Sessions up to 15 minutes',
      'Cymatic waveform visualization',
      'Any frequency, 1–20,000 Hz',
      'Binaural beats',
    ],
    cta: 'Start free',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 6.99,
    tagline: 'The full sound-healing studio.',
    highlight: true,
    features: [
      'Unlimited session length',
      'All 3D experiences — Brain, Aura & Cymatics',
      'Any frequency + curated library',
      'Fullscreen immersive mode',
      'Schumann & undertone layers',
    ],
    cta: 'Get Plus',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12.99,
    tagline: 'For daily practice & tracking.',
    features: [
      'Everything in Plus',
      'Save & track your session history',
      'Before/after progress insights',
      'Downloadable sessions (soon)',
      'Early access to new visualizations',
    ],
    cta: 'Get Pro',
  },
]

export interface PlanLimits {
  maxMinutes: number   // Infinity for unlimited
  allViz: boolean      // Brain & Aura unlocked
  history: boolean     // session history / tracking
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxMinutes: 15, allViz: false, history: false },
  plus: { maxMinutes: Infinity, allViz: true, history: false },
  pro:  { maxMinutes: Infinity, allViz: true, history: true },
}

const KEY = 'solive_plan'
const EVT = 'solive-plan-change'

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

/** React hook — current plan, its limits, and a setter (kept in sync across the app). */
export function usePlan() {
  const [plan, setPlan] = useState<PlanId>('free')

  useEffect(() => {
    setPlan(getStoredPlan())
    const sync = () => setPlan(getStoredPlan())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const choosePlan = useCallback((id: PlanId) => { setStoredPlan(id); setPlan(id) }, [])

  return { plan, limits: PLAN_LIMITS[plan], choosePlan }
}
