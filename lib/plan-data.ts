// Plan catalog and pricing — pure data, importable from both client components
// and server route handlers (lib/plan.ts is 'use client' and cannot be).

export type PlanId = 'free' | 'plus' | 'pro'
export type Billing = 'monthly' | 'annual'

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
    tagline: 'Get a taste of every experience.',
    features: [
      '1-minute audio preview of any session',
      'Sessions up to 15 minutes',
      'All 3 visual experiences to try',
      'Any frequency, 1–20,000 Hz',
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
      'Full-length audio — no 1-minute cut-off',
      'Sessions up to 60 minutes',
      'Star your favourite sessions',
      'All 3D experiences — Brain, Aura & Cymatics',
      'Any frequency + curated library',
      'Fullscreen immersive mode',
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
      'Open-ended sessions — run until you stop them',
      'Save & track your session history',
      'Before/after progress insights',
      'Early access to new visualizations',
    ],
    cta: 'Get Pro',
  },
]

export interface PlanLimits {
  previewSeconds: number // audio cut-off for the free teaser; Infinity = unlimited
  maxMinutes: number     // Infinity for unlimited
  allViz: boolean        // Brain & Aura unlocked
  history: boolean       // session history / tracking
  favorites: boolean     // star a session and keep it to hand
}

/**
 * Session length is the ladder between the three plans: free is a taste, Plus
 * is a real practice, Pro is the one that never stops. `maxMinutes` is what the
 * session builder offers and what the studio enforces — Infinity also means
 * open-ended sessions are allowed.
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { previewSeconds: 60, maxMinutes: 15, allViz: true, history: true, favorites: false },
  plus: { previewSeconds: Infinity, maxMinutes: 60, allViz: true, history: true, favorites: true },
  pro:  { previewSeconds: Infinity, maxMinutes: Infinity, allViz: true, history: true, favorites: true },
}

/** The cheapest plan that allows a session of this many minutes (9999 = open). */
export function planForMinutes(minutes: number): PlanId {
  const order: PlanId[] = ['free', 'plus', 'pro']
  return order.find(id => {
    const max = PLAN_LIMITS[id].maxMinutes
    return minutes === 9999 ? max === Infinity : minutes <= max
  }) ?? 'pro'
}

/**
 * The single source of truth for what a plan costs, in whole cents. Both the
 * checkout UI and the create-payment route use this — the server never trusts
 * an amount sent by the browser. Annual = 20% off the monthly rate × 12,
 * rounded to cents (6.99 × 0.8 × 12 = 67.104 → 67.10).
 */
export function priceUsd(id: PlanId, billing: Billing): number {
  const plan = PLANS.find(p => p.id === id)
  if (!plan || plan.price === 0) return 0
  const raw = billing === 'annual' ? plan.price * 0.8 * 12 : plan.price
  return Math.round(raw * 100) / 100
}

/** Crypto payments cannot auto-renew, so a purchase buys a fixed window. */
export function planDurationDays(billing: Billing): number {
  return billing === 'annual' ? 365 : 30
}
