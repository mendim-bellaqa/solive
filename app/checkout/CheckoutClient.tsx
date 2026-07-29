'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { usePlan, PLANS, type PlanId } from '@/lib/plan'
import { useAuthUser } from '@/lib/supabase/sessions'

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4"
         style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CheckoutClient() {
  const params = useSearchParams()
  const { plan: currentPlan, choosePlan } = usePlan()
  const user = useAuthUser()

  const planId = (params.get('plan') as PlanId) || 'plus'
  const annual = params.get('billing') === 'annual'
  const plan = PLANS.find(p => p.id === planId && p.id !== 'free') ?? PLANS[1]

  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const monthly = plan.price
  const perMonth = annual ? monthly * 0.8 : monthly
  const dueToday = annual ? perMonth * 12 : perMonth
  const billingLabel = annual ? 'billed yearly' : 'billed monthly'

  function pay() {
    setProcessing(true)
    // No real payment is processed — activate the plan locally after a short beat.
    setTimeout(() => {
      choosePlan(plan.id)
      setProcessing(false)
      setDone(true)
    }, 1400)
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <main className="relative z-10 px-5 mx-auto flex flex-col items-center justify-center text-center"
            style={{ maxWidth: 460, minHeight: '100vh', paddingTop: 'calc(env(safe-area-inset-top) + 96px)', paddingBottom: 60 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-mid)' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.02em' }}>
          Welcome to {plan.name}!
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Your plan is active. Frequencies now play with no time limit — enjoy the full studio.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col gap-2.5 w-full max-w-xs">
          <Link href="/session" className="btn-primary text-center">Start a session →</Link>
          <Link href="/settings" className="btn-ghost text-center text-sm">Go to settings</Link>
        </motion.div>
      </main>
    )
  }

  // ── Already on this (or higher) plan ─────────────────────────────────────────
  if (currentPlan === plan.id) {
    return (
      <main className="relative z-10 px-5 mx-auto flex flex-col items-center justify-center text-center"
            style={{ maxWidth: 460, minHeight: '100vh', paddingTop: 'calc(env(safe-area-inset-top) + 96px)', paddingBottom: 60 }}>
        <h1 className="text-xl font-bold mb-2">You’re already on {plan.name}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Nothing to do here.</p>
        <Link href="/session" className="btn-primary">Start a session →</Link>
      </main>
    )
  }

  return (
    <>
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main className="relative z-10 px-5 mx-auto"
            style={{ maxWidth: 900, paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 80 }}>

        <Link href="/pricing" className="text-sm flex items-center gap-1.5 mb-6 transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to plans
        </Link>

        <h1 className="text-2xl font-black mb-8" style={{ letterSpacing: '-0.02em' }}>Complete your upgrade</h1>

        <div className="grid gap-5 md:grid-cols-[1fr_0.9fr] items-start">

          {/* ── Payment panel ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="glass-card grain rounded-3xl p-6">
            <div className="shimmer-overlay" />
            <div className="relative z-[2]">

              {/* Demo banner */}
              <div className="flex items-start gap-2.5 mb-6 px-3.5 py-3 rounded-xl"
                   style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.28)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="2"
                     style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                <p className="text-[0.72rem] leading-snug" style={{ color: '#e8c48a' }}>
                  <strong style={{ color: '#f0d9a8' }}>Test checkout.</strong> Payments aren’t connected yet — no card
                  is charged. Don’t enter real card details. Clicking below activates the plan in demo mode.
                </p>
              </div>

              <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-3" style={{ color: 'var(--text-muted)' }}>
                PAYMENT DETAILS
              </p>

              <div className="flex flex-col gap-3.5">
                <Field label="Cardholder name" placeholder="Your name" />
                <Field label="Card number" placeholder="4242 4242 4242 4242" mono />
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Expiry" placeholder="MM / YY" mono />
                  <Field label="CVC" placeholder="123" mono />
                </div>
              </div>

              <button
                onClick={pay}
                disabled={processing}
                className="btn-primary w-full mt-6 justify-center"
                style={{ opacity: processing ? 0.7 : 1, cursor: processing ? 'wait' : 'pointer' }}>
                {processing ? 'Activating…' : `Pay $${dueToday.toFixed(2)} — Activate ${plan.name}`}
              </button>

              <p className="text-[0.66rem] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                {user
                  ? <>Signed in as {user.email}. Cancel anytime.</>
                  : <>You’re not signed in — <Link href="/auth/login" className="underline" style={{ color: 'var(--accent)' }}>sign in</Link> to keep your plan across devices.</>}
              </p>
            </div>
          </motion.div>

          {/* ── Order summary ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
            className="glass rounded-3xl p-6">
            <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--text-muted)' }}>
              ORDER SUMMARY
            </p>

            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-lg">Solive {plan.name}</span>
              <span className="font-black text-lg">${perMonth.toFixed(2)}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span></span>
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {plan.tagline} · {billingLabel}
              {annual && <span style={{ color: 'var(--accent)' }}> · 20% off</span>}
            </p>

            <div className="h-px my-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

            <ul className="flex flex-col gap-2.5 mb-5">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                  <Check /> {f}
                </li>
              ))}
            </ul>

            <div className="h-px my-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Due today</span>
              <span className="font-black text-xl">${dueToday.toFixed(2)}</span>
            </div>
            {annual && (
              <p className="text-[0.68rem] mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                (${perMonth.toFixed(2)}/mo × 12)
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </>
  )
}

function Field({ label, placeholder, mono }: { label: string; placeholder: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-semibold tracking-wide block mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid var(--border-mid)',
          color: 'var(--t1)',
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          letterSpacing: mono ? '0.04em' : undefined,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none' }}
      />
    </label>
  )
}
