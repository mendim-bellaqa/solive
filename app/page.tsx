'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Never prerender — this page needs live auth state
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

    // Create client here (inside handler) so it never runs during server prerender
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else {
        setMessage({ text: 'Check your email for a confirmation link!', type: 'success' })
      }
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
      className="relative min-h-screen flex items-center justify-center bg-grid overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Animated background orbs */}
      <div className="orb w-96 h-96 top-[-5rem] left-[-5rem] opacity-30"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animationDuration: '8s' }} />
      <div className="orb w-80 h-80 bottom-[-3rem] right-[-3rem] opacity-20"
        style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', animationDuration: '12s', animationDelay: '-4s' }} />
      <div className="orb w-64 h-64 top-1/2 left-1/4 opacity-10"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)', animationDuration: '10s', animationDelay: '-2s' }} />

      {/* Login card */}
      <div
        className="glass relative z-10 w-full max-w-md mx-4 rounded-2xl p-8"
        style={{ border: '1px solid rgba(0, 212, 255, 0.15)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>
              ◎
            </div>
            <h1 className="text-2xl font-bold text-glow"
              style={{ color: 'var(--accent-cyan)' }}>
              FreqLab
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            3D Sound Frequency Studio
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setMessage(null) }}
              className="flex-1 py-2 text-sm font-medium transition-all duration-200"
              style={{
                background: mode === tab ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))' : 'transparent',
                color: mode === tab ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                borderBottom: mode === tab ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              }}
            >
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, display: 'block' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, display: 'block' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Message */}
          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              background: message.type === 'error'
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(16,185,129,0.1)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: message.type === 'error' ? '#f87171' : '#34d399',
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px',
              background: loading
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : mode === 'login' ? 'Enter Studio' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null) }}
            style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
