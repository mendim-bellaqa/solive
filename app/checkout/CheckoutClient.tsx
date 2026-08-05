'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import { usePlan, PLANS, priceUsd, planDurationDays, type PlanId, type Billing } from '@/lib/plan'
import { useAuthUser } from '@/lib/supabase/sessions'
import CoinPicker, { type Coin } from './CoinPicker'

// ─── Small helpers ────────────────────────────────────────────────────────────

const PENDING_KEY = 'hzaura_pending_payment'

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

interface PaymentInfo {
  id: string
  planId: PlanId
  billing: Billing
  payAddress: string
  payAmount: number | string
  payCurrency: string
  priceUsd: number | string
  expiresAt: string | null
  status: string
  actuallyPaid?: number | string | null
}

type Step = 'summary' | 'coins' | 'pay' | 'success'

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4"
         style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutClient() {
  const params = useSearchParams()
  const { plan: currentPlan, choosePlan, expiresAt: planExpiresAt } = usePlan()
  const user = useAuthUser()

  const urlPlanId = (params.get('plan') as PlanId) || 'plus'
  const urlAnnual = params.get('billing') === 'annual'

  const [step, setStep] = useState<Step>('summary')
  const [coins, setCoins] = useState<Coin[] | null>(null)
  const [coinsError, setCoinsError] = useState<string | null>(null)
  const [creatingCoin, setCreatingCoin] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // A resumed payment may be for a different plan than the URL — it wins.
  const planId = payment?.planId ?? urlPlanId
  const billing: Billing = payment ? payment.billing : (urlAnnual ? 'annual' : 'monthly')
  const annual = billing === 'annual'
  const plan = PLANS.find(p => p.id === planId && p.id !== 'free') ?? PLANS[1]

  const monthly = plan.price
  const perMonth = annual ? monthly * 0.8 : monthly
  const dueToday = priceUsd(plan.id, billing)
  const billingLabel = annual ? 'billed yearly' : 'billed monthly'
  const durationDays = planDurationDays(billing)

  const checkoutPath = `/checkout?plan=${urlPlanId}&billing=${urlAnnual ? 'annual' : 'monthly'}`

  // ── Resume a payment left open in another visit ────────────────────────────
  useEffect(() => {
    if (!user) return // wait until signed in (status route requires the session)
    let cancelled = false
    const rawPending = window.localStorage.getItem(PENDING_KEY)
    if (!rawPending) return
    let pendingId: string | null = null
    try { pendingId = (JSON.parse(rawPending) as { id?: string }).id ?? null } catch { /* corrupt */ }
    if (!pendingId) { window.localStorage.removeItem(PENDING_KEY); return }

    fetch(`/api/crypto/status?id=${pendingId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((s) => {
        if (cancelled) return
        const info: PaymentInfo = {
          id: s.id, planId: s.planId, billing: s.billing,
          payAddress: s.payAddress, payAmount: s.payAmount, payCurrency: s.payCurrency,
          priceUsd: s.priceUsd, expiresAt: s.expiresAt, status: s.status, actuallyPaid: s.actuallyPaid,
        }
        if (s.status === 'finished') {
          window.localStorage.removeItem(PENDING_KEY)
          choosePlan(s.planId)
          setPayment(info)
          setStep('success')
        } else if (['failed', 'refunded', 'expired'].includes(s.status)) {
          window.localStorage.removeItem(PENDING_KEY)
        } else {
          setPayment(info)
          setStep('pay')
        }
      })
      .catch(() => { /* stale id or signed out — leave the normal flow alone */ })
    return () => { cancelled = true }
  }, [user, choosePlan])

  // ── Poll while a payment is open ───────────────────────────────────────────
  const paymentId = payment?.id
  useEffect(() => {
    if (step !== 'pay' || !paymentId) return
    let stopped = false

    async function tick() {
      try {
        const res = await fetch(`/api/crypto/status?id=${paymentId}`)
        if (!res.ok || stopped) return
        const s = await res.json()
        if (stopped) return
        setPayment(p => (p ? { ...p, status: s.status, actuallyPaid: s.actuallyPaid } : p))
        if (s.status === 'finished') {
          window.localStorage.removeItem(PENDING_KEY)
          choosePlan(s.planId as PlanId)
          setStep('success')
        } else if (['failed', 'refunded', 'expired'].includes(s.status)) {
          window.localStorage.removeItem(PENDING_KEY)
        }
      } catch { /* transient — next tick retries */ }
    }

    tick()
    const iv = setInterval(tick, 5000)
    return () => { stopped = true; clearInterval(iv) }
  }, [step, paymentId, choosePlan])

  // Countdown clock for the payment window.
  useEffect(() => {
    if (step !== 'pay') return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [step])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function openCoinPicker() {
    setStep('coins')
    setError(null)
    if (coins) return
    setCoinsError(null)
    try {
      const res = await fetch('/api/crypto/currencies')
      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? 'Unavailable')
      setCoins(body.currencies)
    } catch (err) {
      setCoinsError(err instanceof Error ? err.message : 'Could not load currencies.')
    }
  }

  async function startPayment(coin: string) {
    if (creatingCoin) return
    setCreatingCoin(coin)
    setError(null)
    try {
      const res = await fetch('/api/crypto/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: urlPlanId, billing: urlAnnual ? 'annual' : 'monthly', payCurrency: coin }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? 'Could not start the payment.')
      const info: PaymentInfo = {
        id: body.id, planId: urlPlanId, billing: urlAnnual ? 'annual' : 'monthly',
        payAddress: body.payAddress, payAmount: body.payAmount, payCurrency: body.payCurrency,
        priceUsd: body.priceUsd, expiresAt: body.expiresAt, status: body.status,
      }
      window.localStorage.setItem(PENDING_KEY, JSON.stringify({ id: info.id }))
      setPayment(info)
      setStep('pay')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the payment.')
    } finally {
      setCreatingCoin(null)
    }
  }

  function abandonPayment() {
    // The address simply expires unused at NOWPayments; if the user did send
    // funds, the webhook still grants the plan regardless of what the UI does.
    window.localStorage.removeItem(PENDING_KEY)
    setPayment(null)
    setStep('coins')
  }

  async function copy(text: string, what: 'address' | 'amount') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(c => (c === what ? null : c)), 1800)
    } catch { /* clipboard unavailable */ }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
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
          Payment received — your plan is active for the next {durationDays} days.
          Frequencies now play with no time limit — enjoy the full studio.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col gap-2.5 w-full max-w-xs">
          <Link href="/session" className="btn-primary text-center">Start a session →</Link>
          <Link href="/settings" className="btn-ghost text-center text-sm">Go to settings</Link>
        </motion.div>
      </main>
    )
  }

  // ── Payment panel content per step ─────────────────────────────────────────

  const renewingSame = currentPlan === plan.id && planExpiresAt
  const switching = currentPlan !== 'free' && currentPlan !== plan.id

  let panel: React.ReactNode

  if (step === 'summary') {
    panel = (
      <>
        {renewingSame && (
          <Notice tone="accent">
            {plan.name} is active until <strong>{fmtDate(planExpiresAt!)}</strong>. Paying again
            extends it by {durationDays} days.
          </Notice>
        )}
        {switching && (
          <Notice tone="accent">
            You’re switching plans — your new {plan.name} access runs for {durationDays} days from today.
          </Notice>
        )}

        <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-3" style={{ color: 'var(--text-muted)' }}>
          HOW IT WORKS
        </p>
        <ol className="flex flex-col gap-3 mb-6">
          {[
            'Choose the cryptocurrency you want to pay with',
            'Send the exact amount to the address we show you',
            `Your ${plan.name} plan activates automatically — ${durationDays} days of full access`,
          ].map((s, i) => (
            <li key={s} className="flex items-start gap-3 text-[0.84rem]" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span className="flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-full text-[0.7rem] font-bold"
                    style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)', color: 'var(--accent)' }}>
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        {user === null ? (
          <>
            <Link href={`/auth/login?next=${encodeURIComponent(checkoutPath)}`}
                  className="btn-primary w-full justify-center text-center block">
              Sign in to pay with crypto →
            </Link>
            <p className="text-[0.66rem] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Your plan is tied to your account so it works on every device.
            </p>
          </>
        ) : (
          <>
            <button onClick={openCoinPicker} disabled={user === undefined}
                    className="btn-primary w-full justify-center"
                    style={{ opacity: user === undefined ? 0.6 : 1 }}>
              {user === undefined ? 'Checking sign-in…' : `Pay $${dueToday.toFixed(2)} with cryptocurrency →`}
            </button>
            {user && (
              <p className="text-[0.66rem] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                Signed in as {user.email}. One-time payment — nothing auto-renews.
              </p>
            )}
          </>
        )}
      </>
    )
  } else if (step === 'coins') {
    panel = (
      <>
        <button onClick={() => setStep('summary')} className="text-[0.75rem] mb-4 flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}>
          ← Back
        </button>
        <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--text-muted)' }}>
          CHOOSE A CRYPTOCURRENCY
        </p>

        {error && <Notice tone="error">{error}</Notice>}

        {coinsError ? (
          <div className="text-center py-6">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{coinsError}</p>
            <button onClick={() => { setCoins(null); openCoinPicker() }} className="btn-ghost text-sm">Try again</button>
          </div>
        ) : !coins ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading currencies…</p>
        ) : coins.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No currencies are enabled yet — enable some in the NOWPayments dashboard.
          </p>
        ) : (
          <CoinPicker coins={coins} creating={creatingCoin} onPick={startPayment} />
        )}
      </>
    )
  } else {
    // step === 'pay'
    const status = payment?.status ?? 'waiting'
    const expiresMs = payment?.expiresAt ? new Date(payment.expiresAt).getTime() : null
    const remaining = expiresMs !== null ? Math.max(0, Math.floor((expiresMs - now) / 1000)) : null
    const mm = remaining !== null ? String(Math.floor(remaining / 60)).padStart(2, '0') : null
    const ss = remaining !== null ? String(remaining % 60).padStart(2, '0') : null

    if (['expired', 'failed', 'refunded'].includes(status)) {
      panel = (
        <div className="text-center py-4">
          <h2 className="text-lg font-bold mb-2">
            {status === 'expired' ? 'Payment window closed' : status === 'refunded' ? 'Payment refunded' : 'Payment failed'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {status === 'expired'
              ? 'No payment arrived in time, so this address is no longer active. No harm done — start a fresh payment whenever you’re ready.'
              : 'This payment didn’t complete. You can start a new one with any coin.'}
          </p>
          <button onClick={abandonPayment} className="btn-primary">Start a new payment →</button>
        </div>
      )
    } else if (payment) {
      const statusLabel: Record<string, string> = {
        waiting: 'Waiting for your payment…',
        confirming: 'Payment detected — confirming on the network…',
        confirmed: 'Confirmed — finalizing…',
        sending: 'Confirmed — finalizing…',
        partially_paid: 'Partial payment received',
      }
      // Known only when the picker was used this visit — a resumed payment
      // shows the plain ticker rather than triggering another fetch.
      const payCoin = coins?.find(c => c.code === payment.payCurrency.toLowerCase())
      panel = (
        <>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                SEND {payment.payCurrency.toUpperCase()}
              </p>
              {payCoin?.network && (
                <p className="text-[0.72rem] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {payCoin.name} on the <strong style={{ color: 'var(--t1)' }}>{payCoin.network}</strong> network
                </p>
              )}
            </div>
            {remaining !== null && (
              <span className="text-[0.7rem] font-bold px-2 py-1 rounded-md flex-shrink-0 whitespace-nowrap"
                    style={{
                      background: remaining > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(224,80,80,0.12)',
                      border: `1px solid ${remaining > 0 ? 'var(--border-mid)' : 'rgba(224,80,80,0.3)'}`,
                      color: remaining > 0 ? 'var(--text-secondary)' : '#f0a0a0',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                {remaining > 0 ? `${mm}:${ss}` : 'Time expired'}
              </span>
            )}
          </div>

          {status === 'partially_paid' && (
            <Notice tone="warn">
              We received <strong>{String(payment.actuallyPaid ?? '?')}</strong> of{' '}
              <strong>{String(payment.payAmount)} {payment.payCurrency.toUpperCase()}</strong>. Send the
              remainder to the same address to complete the payment.
            </Notice>
          )}
          {remaining === 0 && status === 'waiting' && (
            <Notice tone="warn">
              The payment window has ended. If you already sent the funds they can still confirm —
              otherwise start a new payment.
            </Notice>
          )}

          <div className="flex justify-center mb-5">
            <div style={{ background: '#fff', padding: 12, borderRadius: 14 }}>
              <QRCode value={payment.payAddress} size={164} />
            </div>
          </div>

          <CopyRow
            label={`Amount — send exactly this much ${payment.payCurrency.toUpperCase()}`}
            value={String(payment.payAmount)}
            copied={copied === 'amount'}
            onCopy={() => copy(String(payment.payAmount), 'amount')}
          />
          <CopyRow
            label="To this address"
            value={payment.payAddress}
            copied={copied === 'address'}
            onCopy={() => copy(payment.payAddress, 'address')}
          />

          <div className="flex items-center gap-2.5 mt-5 px-3.5 py-3 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-mid)' }}>
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: 'var(--accent)' }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--accent)' }} />
            </span>
            <p className="text-[0.76rem]" style={{ color: 'var(--text-secondary)' }}>
              {statusLabel[status] ?? 'Waiting for your payment…'} This page updates automatically —
              you can close it, your plan activates either way.
            </p>
          </div>

          <p className="text-[0.66rem] mt-4" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sending less than the exact amount leaves the payment incomplete; sending on the wrong
            network can lose funds — double-check both in your wallet.
          </p>

          <button onClick={abandonPayment}
                  className="text-[0.72rem] mt-4 underline transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}>
            Cancel and choose a different coin
          </button>
        </>
      )
    } else {
      panel = <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading…</p>
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
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

        <h1 className="text-2xl font-black mb-8" style={{ letterSpacing: '-0.02em' }}>
          {renewingSame ? `Extend your ${plan.name} plan` : 'Complete your upgrade'}
        </h1>

        <div className="grid gap-5 md:grid-cols-[1fr_0.9fr] items-start">

          {/* ── Payment panel ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="glass-card grain rounded-3xl p-6">
            <div className="shimmer-overlay" />
            <div className="relative z-[2]">
              <AnimatePresence mode="wait">
                <motion.div key={step + (payment?.status ?? '')}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}>
                  {panel}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Order summary ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
            className="glass rounded-3xl p-6">
            <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--text-muted)' }}>
              ORDER SUMMARY
            </p>

            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-lg">hzaura {plan.name}</span>
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
            <p className="text-[0.68rem] mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
              {annual ? `($${perMonth.toFixed(2)}/mo × 12) · ` : ''}{durationDays} days of access
            </p>
          </motion.div>
        </div>
      </main>
    </>
  )
}

// ─── Panel building blocks ────────────────────────────────────────────────────

function Notice({ tone, children }: { tone: 'accent' | 'warn' | 'error'; children: React.ReactNode }) {
  const palette = {
    accent: { bg: 'var(--accent-dim)', border: 'var(--accent-mid)', color: 'var(--accent)' },
    warn:   { bg: 'rgba(232,160,32,0.08)', border: 'rgba(232,160,32,0.28)', color: '#e8c48a' },
    error:  { bg: 'rgba(224,80,80,0.10)', border: 'rgba(224,80,80,0.30)', color: '#f0a0a0' },
  }[tone]
  return (
    <div className="mb-5 px-3.5 py-3 rounded-xl text-[0.76rem] leading-snug"
         style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color }}>
      {children}
    </div>
  )
}

function CopyRow({ label, value, copied, onCopy }: {
  label: string; value: string; copied: boolean; onCopy: () => void
}) {
  return (
    <div className="mb-3">
      <p className="text-[0.66rem] font-semibold tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <button onClick={onCopy}
        className="w-full rounded-xl px-3.5 py-3 text-left flex items-center justify-between gap-3 transition-all"
        style={{ background: 'rgba(255,255,255,0.045)', border: `1px solid ${copied ? 'var(--accent)' : 'var(--border-mid)'}` }}>
        <span className="text-[0.8rem] break-all"
              style={{ color: 'var(--t1)', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}>
          {value}
        </span>
        <span className="text-[0.68rem] font-bold flex-shrink-0" style={{ color: copied ? 'var(--accent)' : 'var(--text-muted)' }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </span>
      </button>
    </div>
  )
}
