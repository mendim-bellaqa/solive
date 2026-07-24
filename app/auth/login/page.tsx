'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    let supabase
    try {
      supabase = createClient()
    } catch {
      setMessage({ text: 'Sign-in is not configured. Add your Supabase keys to .env.local.', isError: true })
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = /email not confirmed/i.test(error.message)
            ? 'Please confirm your email first — check your inbox for the confirmation link.'
            : /invalid login/i.test(error.message)
              ? 'Incorrect email or password.'
              : error.message
          setMessage({ text: msg, isError: true })
        } else {
          router.push('/')
          router.refresh()
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          setMessage({ text: error.message, isError: true })
        } else if (data.session) {
          // email confirmation disabled → already signed in
          router.push('/')
          router.refresh()
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
          setMessage({ text: 'That email is already registered. Try signing in instead.', isError: true })
        } else {
          setMessage({ text: 'Account created! Check your email for the confirmation link, then sign in.', isError: false })
        }
      }
    } catch {
      setMessage({ text: 'Could not reach the auth server. Check your connection and Supabase settings.', isError: true })
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
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
              <span className="text-accent">
                <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
                  <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--t1)' }}>Solive</span>
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
