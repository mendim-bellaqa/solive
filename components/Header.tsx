'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  email: string
  isPlaying: boolean
  activeFrequency: number
}

export default function Header({ email, isPlaying, activeFrequency }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      background: 'rgba(5, 5, 15, 0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>
          ◎
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-cyan)' }}>
          Solive
        </span>
        <span style={{
          padding: '2px 8px',
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 20,
          fontSize: 11,
          color: '#a78bfa',
          marginLeft: 4,
        }}>
          Studio
        </span>
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 20,
        }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#00d4ff',
            boxShadow: '0 0 8px #00d4ff',
            animation: 'pulse-ring 1.5s infinite',
          }} />
          <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 500 }}>
            {activeFrequency} Hz
          </span>
        </div>
      )}

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {email && (
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {email}
          </span>
        )}
        <button
          onClick={email ? handleLogout : () => router.push('/auth/login')}
          style={{
            padding: '6px 14px',
            background: email ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00d4ff22, #8b5cf622)',
            border: email ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,212,255,0.3)',
            borderRadius: 6,
            color: email ? 'var(--text-secondary)' : '#00d4ff',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = email ? 'rgba(239,68,68,0.4)' : 'rgba(0,212,255,0.6)'
            e.currentTarget.style.color = email ? '#f87171' : '#fff'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = email ? 'rgba(255,255,255,0.1)' : 'rgba(0,212,255,0.3)'
            e.currentTarget.style.color = email ? 'var(--text-secondary)' : '#00d4ff'
          }}
        >
          {email ? 'Sign out' : 'Sign in'}
        </button>
      </div>
    </header>
  )
}
