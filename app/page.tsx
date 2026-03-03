import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function WelcomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background */}
      <div className="ambient-bg">
        <div className="ambient-orb" />
        <div className="ambient-orb" />
        <div className="ambient-orb" />
      </div>

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <WaveIcon />
          <span className="text-white font-semibold tracking-tight text-lg">Solive</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/history" className="btn-ghost text-sm py-2 px-4">
              My Sessions
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-1 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">

        {/* Logo mark */}
        <div className="mb-8 pulse">
          <div className="w-20 h-20 rounded-full glass flex items-center justify-center mx-auto"
               style={{ boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="3" fill="#10b981" />
              <circle cx="18" cy="18" r="7" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
              <circle cx="18" cy="18" r="12" stroke="#10b981" strokeWidth="1" opacity="0.3" />
              <circle cx="18" cy="18" r="17" stroke="#10b981" strokeWidth="0.5" opacity="0.15" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight">
          Your frequency.<br />
          <span style={{ color: '#10b981' }}>Your healing.</span>
        </h1>

        <p className="text-lg sm:text-xl mb-3" style={{ color: 'var(--text-secondary)' }}>
          Answer 5 questions about how you feel right now.
        </p>
        <p className="text-base mb-12" style={{ color: 'var(--text-muted)' }}>
          Solive prescribes a personalized healing frequency session — backed by sound therapy research — with a real-time 3D cymatic visualization.
        </p>

        {/* SVG waveform decoration */}
        <WaveformDecoration />

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full sm:w-auto">
          <Link href="/session" className="btn-primary w-full sm:w-auto text-center" style={{ minWidth: 200 }}>
            Start My Session
          </Link>
          {user && (
            <Link href="/history" className="btn-ghost w-full sm:w-auto text-center">
              My History
            </Link>
          )}
        </div>

        {/* Headphone notice */}
        <p className="mt-8 text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <HeadphoneIcon />
          Use headphones for the full binaural beat experience
        </p>
      </div>

      {/* Bottom frequency labels */}
      <div className="fixed bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-6 px-6 overflow-x-auto">
        {[
          { hz: '174 Hz', label: 'Pain', color: '#f59e0b' },
          { hz: '528 Hz', label: 'Calm', color: '#10b981' },
          { hz: '741 Hz', label: 'Focus', color: '#8b5cf6' },
          { hz: '963 Hz', label: 'Spirit', color: '#a855f7' },
        ].map(f => (
          <div key={f.hz} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-1 h-1 rounded-full" style={{ background: f.color }} />
            <span className="text-xs font-mono" style={{ color: f.color }}>{f.hz}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
          </div>
        ))}
      </div>
    </main>
  )
}

function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11"
            stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function HeadphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function WaveformDecoration() {
  const points = Array.from({ length: 40 }, (_, i) => {
    const x = i * 12
    const y = 30 + Math.sin(i * 0.7) * 18 * Math.sin(i * 0.15)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="w-full max-w-md mx-auto opacity-30">
      <svg width="100%" height="60" viewBox="0 480 60" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#10b981" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" className="wave-line" />
      </svg>
    </div>
  )
}
