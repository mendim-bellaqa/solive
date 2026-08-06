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
  /** An unfinished payment from an earlier visit — offered, never forced. */
  const [resumable, setResumable] = useState<PaymentInfo | null>(null)
  const [cancelState, setCancelState] = useState<'idle' | 'confirm' | 'busy'>('idle')
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
          // Offer it. Jumping straight to the pay screen used to yank people
          // out of the coin picker a second after they opened it, and left
          // them on a currency they had already moved on from.
          setResumable(info)
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

  async function loadCoins() {
    const res = await fetch('/api/crypto/currencies')
    const body = await res.json()
    if (!res.ok) throw new Error(body.message ?? 'Unavailable')
    setCoins(body.currencies as Coin[])
  }

  async function openCoinPicker() {
    setStep('coins')
    setError(null)
    if (coins) return
    setCoinsError(null)
    try {
      await loadCoins()
    } catch (err) {
      setCoinsError(err instanceof Error ? err.message : 'Could not load currencies.')
    }
  }

  // A payment resumed from a previous visit lands straight on the pay screen
  // without the picker ever running — and that screen has to name the network,
  // so fetch the catalog for it.
  useEffect(() => {
    if (step !== 'pay' || coins) return
    loadCoins().catch(() => { /* the ticker alone still identifies the coin */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, coins])

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
    setResumable(null)
    setCancelState('idle')
    setStep('coins')
  }

  /** Cancel for real: the row is marked expired, so it stops following the
   *  user to their other devices as an open payment. */
  async function cancelPayment() {
    const id = payment?.id
    if (!id) return
    setCancelState('busy')
    try {
      const res = await fetch('/api/crypto/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const body = await res.json().catch(() => ({}))
      // It completed while they were deciding — that outcome wins.
      if (res.ok && body.status === 'finished') {
        window.localStorage.removeItem(PENDING_KEY)
        choosePlan((body.planId as PlanId) ?? planId)
        setCancelState('idle')
        setStep('success')
        return
      }
      if (!res.ok) setError(body.message ?? 'Could not cancel that payment. Please try again.')
    } catch {
      setError('Could not reach the server to cancel. Please try again.')
    }
    // Local state clears either way: a failed call leaves the row alone, and
    // the user can still start a new payment.
    window.localStorage.removeItem(PENDING_KEY)
    setPayment(null)
    setResumable(null)
    setCancelState('idle')
    setStep('summary')
  }

  function resumePayment() {
    if (!resumable) return
    setPayment(resumable)
    setResumable(null)
    setStep('pay')
  }

  function discardResumable() {
    // Close the old one out server-side too, so it doesn't resurface as an
    // open payment on the user's other devices. Funds sent to it would still
    // be honoured by the webhook.
    if (resumable) {
      fetch('/api/crypto/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resumable.id }),
      }).catch(() => { /* best effort */ })
    }
    window.localStorage.removeItem(PENDING_KEY)
    setResumable(null)
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
              {payCoin && (
                <p className="text-[0.72rem] mt-1" style={{ color: 'var(--text-secondary)' }}>{payCoin.name}</p>
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

          {/* The network gets a field of its own. It is the one detail a wallet
              asks for that this page used to leave the user to infer from a
              ticker, and getting it wrong is what actually loses funds. */}
          <NetworkRow coin={payCoin} code={payment.payCurrency} />

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

          {cancelState === 'confirm' ? (
            <div className="mt-5 rounded-2xl p-4"
                 style={{ background: 'rgba(224,80,80,0.07)', border: '1px solid rgba(224,80,80,0.28)' }}>
              <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Cancel this payment? We stop watching the address and it drops off your account.
                {' '}<strong style={{ color: 'var(--t1)' }}>If you have already sent the coins, don’t cancel</strong> —
                they still activate your plan on their own.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCancelState('idle')} className="btn-ghost text-xs flex-1 justify-center">
                  Keep it open
                </button>
                <button onClick={cancelPayment} disabled={cancelState !== 'confirm'}
                        className="btn-danger text-xs flex-1 justify-center">
                  Yes, cancel it
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-5">
              <button onClick={abandonPayment} className="btn-ghost text-xs flex-1 justify-center">
                Change coin
              </button>
              <button onClick={() => setCancelState('confirm')} disabled={cancelState === 'busy'}
                      className="btn-danger text-xs flex-1 justify-center">
                {cancelState === 'busy' ? 'Cancelling…' : 'Cancel payment'}
              </button>
            </div>
          )}
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
              {/* An unfinished payment is an offer, not a redirect. */}
              {resumable && step !== 'pay' && (
                <div className="rounded-2xl p-4 mb-5"
                     style={{ background: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.28)' }}>
                  <p className="text-[0.62rem] font-bold tracking-[0.12em] mb-1.5" style={{ color: '#e8c48a' }}>
                    PAYMENT ALREADY OPEN
                  </p>
                  <p className="text-[0.8rem] mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You started a <strong style={{ color: 'var(--t1)' }}>{resumable.payCurrency.toUpperCase()}</strong> payment
                    for {PLANS.find(p => p.id === resumable.planId)?.name ?? resumable.planId}
                    {' '}(${Number(resumable.priceUsd).toFixed(2)}) and never finished it.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={resumePayment} className="btn-ghost text-xs flex-1 justify-center">
                      Show that payment
                    </button>
                    <button onClick={discardResumable} className="btn-ghost text-xs flex-1 justify-center">
                      Pay with something else
                    </button>
                  </div>
                </div>
              )}
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

function NetworkRow({ coin, code }: { coin: Coin | undefined; code: string }) {
  return (
    <div className="mb-3">
      <p className="text-[0.66rem] font-semibold tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
        Network — send only over this chain
      </p>
      <div className="w-full rounded-xl px-3.5 py-3 flex items-center gap-3"
           style={{ background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.28)' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e8c48a" strokeWidth="2"
             style={{ flexShrink: 0 }} aria-hidden>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
        </svg>
        <div style={{ minWidth: 0 }}>
          <p className="text-[0.86rem] font-bold" style={{ color: 'var(--t1)' }}>
            {coin?.network || `${code.toUpperCase()} network`}
          </p>
          <p className="text-[0.68rem] mt-0.5" style={{ color: '#e8c48a' }}>
            {coin
              ? `Choose ${coin.network} in your wallet — coins sent over any other chain are lost.`
              : 'Send on the network this ticker belongs to — coins sent over another chain are lost.'}
          </p>
        </div>
      </div>
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
