'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PLANS, PlanId, usePlan } from '@/lib/plan'

export default function PricingPage() {
  const router = useRouter()
  const { plan, choosePlan } = usePlan()
  const [toast, setToast] = useState<string | null>(null)

  function select(id: PlanId) {
    if (id === plan) return
    choosePlan(id)
    if (id === 'free') setToast('You are on the Free plan.')
    else setToast(`${id === 'plus' ? 'Plus' : 'Pro'} unlocked — enjoy the full studio.`)
    setTimeout(() => setToast(null), 3200)
  }

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden><div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" /></div>

      <main className="relative z-10 max-w-5xl mx-auto px-5 pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7rem)' }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12 max-w-2xl mx-auto">
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>PLANS</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.03, marginBottom: 14 }}>
            Go deeper.{' '}<span style={{ color: 'var(--t2)' }}>Sound is medicine.</span>
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '1rem', lineHeight: 1.6 }}>
            Start free. Upgrade any time for unlimited sessions, every 3D experience, and progress tracking.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {PLANS.map((p, i) => {
            const current = plan === p.id
            const accent = p.highlight
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className={accent ? 'glass-premium grain' : 'glass-card grain'}
                style={{ padding: '26px 24px', borderRadius: 24, position: 'relative', border: accent ? '1px solid var(--accent)' : undefined }}
              >
                {accent && (
                  <span style={{ position: 'absolute', top: 16, right: 16, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)', padding: '4px 9px', borderRadius: 999 }}>
                    MOST POPULAR
                  </span>
                )}
                <div className="relative z-10">
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--t1)', marginBottom: 6 }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--t1)' }}>
                      {p.price === 0 ? 'Free' : `$${p.price}`}
                    </span>
                    {p.price > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--t3)' }}>/mo</span>}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--t3)', marginBottom: 18, minHeight: 34 }}>{p.tagline}</p>

                  <button
                    onClick={() => select(p.id)}
                    disabled={current}
                    className={accent && !current ? 'btn-primary' : 'btn-ghost'}
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 20, opacity: current ? 0.7 : 1, cursor: current ? 'default' : 'pointer',
                             ...(accent && !current ? { background: 'var(--accent)', color: '#04140f' } : {}) }}
                  >
                    {current ? 'Current plan' : p.cta}
                  </button>

                  <ul className="flex flex-col gap-2.5">
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 9, fontSize: '0.83rem', color: 'var(--t2)', lineHeight: 1.4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent ? 'var(--accent)' : 'var(--t2)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Guarantee / note */}
        <div className="text-center mt-10">
          <p style={{ color: 'var(--t3)', fontSize: '0.82rem', marginBottom: 8 }}>
            Cancel anytime · No ads · Not a substitute for medical care
          </p>
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', maxWidth: '34rem', margin: '0 auto', lineHeight: 1.5 }}>
            Billing isn&apos;t connected yet — selecting a plan unlocks it locally so you can preview the paid
            experience. Wire up a payment provider (e.g. Stripe) to charge real cards.
          </p>
          <button onClick={() => router.push('/session')} className="pill-btn mt-5" style={{ display: 'inline-flex' }}>
            Start a session →
          </button>
        </div>
      </main>

      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 z-[100] glass-card px-5 py-3"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)', borderRadius: 14, fontSize: '0.85rem', fontWeight: 600, color: 'var(--t1)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
