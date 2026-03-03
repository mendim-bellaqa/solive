'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    if (mode === 'signup') {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (error) {
        setMessage({ text: error.message, type: 'error' })
        setLoading(false)
        return
      }

      // If email confirmation is disabled, session is returned immediately
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // Email confirmation required — auto-try sign in anyway
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      setMessage({ text: '✓ Account created! Check your email to confirm, then sign in.', type: 'success' })

    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grid"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Animated background orbs */}
      <div className="orb w-96 h-96 opacity-30"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animationDuration: '8s', top: '-5rem', left: '-5rem' }} />
      <div className="orb w-80 h-80 opacity-20"
        style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', animationDuration: '12s', animationDelay: '-4s', bottom: '-3rem', right: '-3rem' }} />
      <div className="orb w-64 h-64 opacity-10"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)', animationDuration: '10s', animationDelay: '-2s', top: '50%', left: '25%' }} />

      {/* Card */}
      <div className="glass relative z-10 w-full max-w-md mx-4 rounded-2xl p-8"
        style={{ border: '1px solid rgba(0,212,255,0.15)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 0 20px rgba(0,212,255,0.3)',
            }}>◎</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 30px rgba(0,212,255,0.5)', margin: 0 }}>
              Solive
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
            3D Sound Frequency Studio
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
          {(['login', 'signup'] as const).map((tab) => (
            <button key={tab}
              onClick={() => { setMode(tab); setMessage(null) }}
              style={{
                flex: 1, padding: '10px', fontSize: 14, fontWeight: 500,
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 11, letterSpacing: 1, marginBottom: 6, display: 'block' }}>
              EMAIL
            </label>
            <input
              type="email" value={email} required
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 14,
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 11, letterSpacing: 1, marginBottom: 6, display: 'block' }}>
              PASSWORD {mode === 'signup' && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(min 6 characters)</span>}
            </label>
            <input
              type="password" value={password} required minLength={6}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 14,
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box',
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: message.type === 'error' ? '#f87171' : '#34d399',
              lineHeight: 1.5,
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: '13px', fontSize: 15, fontWeight: 700,
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
              color: 'white', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s, transform 0.1s',
              letterSpacing: 0.5,
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.opacity = '0.9' }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.opacity = '1' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Enter Studio →' : 'Create Free Account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null) }}
            style={{ color: '#00d4ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
