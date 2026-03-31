'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ text: error.message, isError: true })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setMessage({ text: error.message, isError: true })
      } else {
        setMessage({
          text: 'Account created! Check your email to confirm, then sign in.',
          isError: false,
        })
      }
    }

    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 14px',
          }}>
            ◎
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00d4ff', margin: 0 }}>Solive</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>3D Sound Frequency Studio</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '28px 28px',
        }}>
          {/* Mode tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
            padding: 3,
            marginBottom: 24,
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessage(null) }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  background: mode === m ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: mode === m ? '#00d4ff' : 'var(--text-secondary)',
                  borderBottom: mode === m ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={6}
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            {message && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                background: message.isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${message.isError ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                color: message.isError ? '#f87171' : '#4ade80',
              }}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                background: loading
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: loading ? 0.6 : 1,
                marginTop: 4,
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Guest access */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          Or{' '}
          <a
            href="/dashboard"
            style={{ color: '#a78bfa', textDecoration: 'none', borderBottom: '1px solid rgba(167,139,250,0.3)' }}
          >
            continue as guest
          </a>
          {' '}without an account
        </p>
      </div>
    </div>
  )
}
