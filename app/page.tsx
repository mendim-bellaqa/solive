'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const router = useRouter()

  const goToStudio = () => {
    router.push('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const timeout = setTimeout(() => {
      setLoading(false)
      setMessage({ text: 'Request timed out. Try again or continue as guest.', type: 'error' })
    }, 10000)

    try {
      const supabase = createClient()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) { setMessage({ text: error.message, type: 'error' }); return }
        if (data.session) { clearTimeout(timeout); router.push('/dashboard'); return }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr) { clearTimeout(timeout); router.push('/dashboard'); return }
        setMessage({ text: '✓ Account created! Check your email, then sign in.', type: 'success' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setMessage({ text: error.message, type: 'error' }) }
        else { clearTimeout(timeout); router.push('/dashboard'); return }
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Something went wrong.', type: 'error' })
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grid"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Orbs */}
      <div className="orb w-96 h-96 opacity-30"
        style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)', animationDuration: '8s', top: '-5rem', left: '-5rem' }} />
      <div className="orb w-80 h-80 opacity-20"
        style={{ background: 'radial-gradient(circle,#00d4ff,transparent)', animationDuration: '12s', animationDelay: '-4s', bottom: '-3rem', right: '-3rem' }} />
      <div className="orb w-64 h-64 opacity-10"
        style={{ background: 'radial-gradient(circle,#ec4899,transparent)', animationDuration: '10s', animationDelay: '-2s', top: '50%', left: '25%' }} />

      <div className="glass relative z-10 w-full max-w-md mx-4 rounded-2xl p-8"
        style={{ border: '1px solid rgba(0,212,255,0.15)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22,
              boxShadow: '0 0 20px rgba(0,212,255,0.3)',
            }}>◎</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 30px rgba(0,212,255,0.5)', margin: 0 }}>
              Solive
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
            3D Sound Frequency Studio
          </p>
        </div>

        {/* ── GUEST BUTTON (primary action) ── */}
        <button
          onClick={goToStudio}
          style={{
            width: '100%', padding: '15px', fontSize: 16, fontWeight: 700,
            border: 'none', borderRadius: 10, cursor: 'pointer',
            background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
            color: 'white', letterSpacing: 0.5, marginBottom: 14,
            boxShadow: '0 0 25px rgba(0,212,255,0.35)',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.opacity = '0.92' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1' }}
        >
          ▶ &nbsp;Open Studio — No Account Needed
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>or sign in to save presets</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Toggle auth form */}
        {!showAuth ? (
          <button
            onClick={() => setShowAuth(true)}
            style={{
              width: '100%', padding: '11px', fontSize: 14,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = '#00d4ff' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            Sign in / Create account
          </button>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 16, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              {(['login', 'signup'] as const).map((tab) => (
                <button key={tab}
                  onClick={() => { setMode(tab); setMessage(null) }}
                  style={{
                    flex: 1, padding: '9px', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                    background: mode === tab ? 'linear-gradient(135deg,rgba(0,212,255,0.2),rgba(139,92,246,0.2))' : 'transparent',
                    color: mode === tab ? '#00d4ff' : 'var(--text-secondary)',
                    borderBottom: mode === tab ? '2px solid #00d4ff' : '2px solid transparent',
                  }}
                >
                  {tab === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email" value={email} required placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                style={{
                  width: '100%', padding: '11px 14px', fontSize: 14,
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
              />
              <input
                type="password" value={password} required minLength={6} placeholder="Password (min 6 chars)"
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                style={{
                  width: '100%', padding: '11px 14px', fontSize: 14,
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
              />

              {message && (
                <div style={{
                  padding: '9px 13px', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                  background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: message.type === 'error' ? '#f87171' : '#34d399',
                }}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  padding: '12px', fontSize: 14, fontWeight: 700, border: 'none',
                  borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
                  color: 'white', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
                }}
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
