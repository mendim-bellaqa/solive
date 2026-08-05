'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabase } from '@/lib/supabase/client'
import { useAuthUser } from '@/lib/supabase/sessions'
import { usePlan, PLANS } from '@/lib/plan'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthUser()
  const { plan, expiresAt } = usePlan()
  const [signingOut, setSigningOut] = useState(false)

  const currentPlan = PLANS.find(p => p.id === plan) ?? PLANS[0]

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = getSupabase()
    if (supabase) { try { await supabase.auth.signOut() } catch { /* ignore */ } }
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main className="relative z-10 px-5 mx-auto"
            style={{ maxWidth: 560, paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 80 }}>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-black mb-1" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Manage your account and plan.
          </p>

          {/* Not signed in */}
          {user === null ? (
            <div className="glass-card grain p-8 rounded-3xl text-center">
              <div className="shimmer-overlay" />
              <div className="relative z-[2]">
                <h2 className="text-lg font-bold mb-2">You’re signed out</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Sign in to manage your account, plan, and session history.
                </p>
                <Link href="/auth/login" className="btn-primary inline-block">Sign in / Register</Link>
              </div>
            </div>
          ) : user === undefined ? (
            <div className="glass rounded-3xl p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading…
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* Account card */}
              <section className="glass-card grain p-6 rounded-3xl">
                <div className="shimmer-overlay" />
                <div className="relative z-[2]">
                  <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--text-muted)' }}>
                    ACCOUNT
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                         style={{ background: 'var(--accent-dim)', border: '1.5px solid var(--accent-mid)', color: 'var(--accent)' }}>
                      {(user.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Signed in with email
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Plan card */}
              <section className="glass-card grain p-6 rounded-3xl">
                <div className="shimmer-overlay" />
                <div className="relative z-[2]">
                  <p className="text-[0.65rem] font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--text-muted)' }}>
                    YOUR PLAN
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">{currentPlan.name}</span>
                        {currentPlan.id !== 'free' && (
                          <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--accent)', color: '#04140f' }}>ACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentPlan.tagline}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-xl">${currentPlan.price}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mo</span>
                    </div>
                  </div>

                  {plan !== 'free' && expiresAt && (
                    <p className="text-xs mb-4 px-3 py-2 rounded-lg text-center"
                       style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)', color: 'var(--accent)' }}>
                      Active until {expiresAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}

                  {plan === 'free' ? (
                    <Link href="/pricing" className="btn-primary w-full text-center block">
                      Upgrade your plan →
                    </Link>
                  ) : (
                    <div className="flex gap-2.5">
                      <Link href="/pricing" className="btn-ghost flex-1 text-center text-sm">Extend / change plan</Link>
                      <Link href="/history" className="btn-ghost flex-1 text-center text-sm">View history</Link>
                    </div>
                  )}
                  {plan !== 'free' && (
                    <p className="text-[0.68rem] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                      Paid with crypto — nothing auto-renews. Extend any time from Pricing.
                    </p>
                  )}
                </div>
              </section>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="glass rounded-2xl px-6 py-4 flex items-center justify-center gap-2.5 text-sm font-medium transition-colors hover:bg-red-500/[0.06]"
                style={{ color: '#e05050', opacity: signingOut ? 0.6 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </>
  )
}
