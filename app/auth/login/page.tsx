'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BackLink from '@/components/BackLink'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WelcomeOverlay from '@/components/WelcomeOverlay'

function LoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  // Set once the account exists — swaps the form for the welcome moment.
  const [welcome, setWelcome] = useState<{ email: string; needsConfirmation: boolean } | null>(null)
  const router = useRouter()
  const params = useSearchParams()

  // Where to go after auth (e.g. back to checkout). Only same-site paths —
  // an absolute URL here would be an open redirect.
  const rawNext = params.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = getSupabase()
    if (!isSupabaseConfigured || !supabase) {
      setMessage({
        text: 'Auth isn’t configured for this deployment — NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY were missing when the site was built. Add them in your host and redeploy.',
        isError: true,
      })
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(next ?? '/')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? '/history')}` },
        })
        if (error) throw error

        // signUp returns a session only when the project auto-confirms. If it
        // doesn't, the account still exists — so celebrate either way and just
        // mention the pending link rather than dead-ending on a notice.
        setWelcome({ email, needsConfirmation: !data.session })
        setLoading(false)
        return
      }
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; status?: number }
      const code = e?.code ?? ''
      const raw = e?.message ?? ''
      const friendly: Record<string, string> = {
        invalid_credentials: 'Incorrect email or password.',
        email_not_confirmed: 'Check your inbox — you need to confirm your email address before signing in.',
        user_already_exists: 'That email is already registered. Try signing in instead.',
        weak_password: 'Password is too weak — use at least 6 characters.',
        over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
        over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
        validation_failed: 'That email address looks invalid.',
        signup_disabled: 'New sign-ups are disabled for this project. Enable them under Authentication → Sign In / Providers.',
        email_provider_disabled: 'Email sign-in is not enabled for this project yet. Turn it on under Authentication → Sign In / Providers.',
      }
      const fallback = /fetch|network/i.test(raw)
        ? 'Network error — check your connection and try again.'
        : raw || 'Something went wrong. Please try again.'
      setMessage({ text: friendly[code] || fallback, isError: true })
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 15px',
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid var(--border-mid)',
    borderRadius: 12,
    color: 'var(--t1)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  if (welcome) {
    return (
      <WelcomeOverlay
        email={welcome.email}
        needsConfirmation={welcome.needsConfirmation}
        onDismiss={() => { router.push(next ?? '/'); router.refresh() }}
      />
    )
  }

  return (
    <>
      <Header />

      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main
        className="relative z-10 flex flex-col items-center justify-center px-5"
        style={{ minHeight: '100vh', paddingTop: 'calc(env(safe-area-inset-top) + 96px)', paddingBottom: 60 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <div style={{ marginBottom: 20, display: 'flex' }}><BackLink fallbackLabel="Home" /></div>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
              <span className="text-accent">
                <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
                  <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--t1)' }}>hzaura</span>
            </Link>
            <p style={{ fontSize: '0.82rem', color: 'var(--t3)' }}>
              {mode === 'login' ? 'Welcome back. Sign in to save your sessions.' : 'Create an account to track your progress.'}
            </p>
          </div>

          {/* Card */}
          <div className="glass-card grain" style={{ padding: '26px 24px', borderRadius: 24 }}>
            <div className="shimmer-overlay" />
            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 22, border: '1px solid var(--border)' }}>
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setMessage(null) }}
                    style={{
                      flex: 1,
                      padding: '9px',
                      borderRadius: 9,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      transition: 'all 0.2s',
                      background: mode === m ? 'var(--accent-dim)' : 'transparent',
                      color: mode === m ? 'var(--accent)' : 'var(--t3)',
                      boxShadow: mode === m ? 'inset 0 0 0 1px var(--accent-mid)' : 'none',
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: '0.08em', fontWeight: 700, display: 'block', marginBottom: 7 }}>EMAIL</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: '0.08em', fontWeight: 700, display: 'block', marginBottom: 7 }}>PASSWORD</label>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                    required minLength={6} style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>

                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: '11px 14px', borderRadius: 10, fontSize: 13, overflow: 'hidden',
                        background: message.isError ? 'rgba(224,80,80,0.10)' : 'var(--accent-dim)',
                        border: `1px solid ${message.isError ? 'rgba(224,80,80,0.30)' : 'var(--accent-mid)'}`,
                        color: message.isError ? '#f0a0a0' : 'var(--accent)',
                      }}
                    >
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit" disabled={loading} className="btn-primary"
                  style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 2, justifyContent: 'center', opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
                </button>
              </form>
            </div>
          </div>

          {/* Guest access */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--t3)' }}>
            Or{' '}
            <Link href="/session" style={{ color: 'var(--accent)', borderBottom: '1px solid var(--accent-mid)' }}>
              continue as guest
            </Link>
            {' '}— no account needed
          </p>
        </motion.div>
      </main>

      <Footer />
    </>
  )
}

// useSearchParams requires a Suspense boundary during prerender.
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--t3)' }}>
        <p className="text-sm">Loading…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
