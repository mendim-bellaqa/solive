import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FREQUENCIES } from '@/lib/frequencies'

interface SessionRow {
  id: string
  created_at: string
  hz: number
  binaural_band: string
  duration_seconds: number
  before_score: number | null
  after_score: number | null
}

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  let sessions: SessionRow[] = []

  if (user) {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    sessions = data ?? []
  }

  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm flex items-center gap-1.5 mb-3 transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>
          <h1 className="text-2xl font-bold">My Sessions</h1>
        </div>
        <Link href="/session" className="btn-primary py-2 px-5 text-sm">
          New Session
        </Link>
      </div>

      {!user ? (
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold mb-2">Sign in to track sessions</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create an account to save your session history and track your healing journey over time.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/login" className="btn-primary">Sign in / Register</Link>
            <Link href="/session" className="btn-ghost">Guest session</Link>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h2 className="text-xl font-semibold mb-2">No sessions yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Start your first healing frequency session.
          </p>
          <Link href="/session" className="btn-primary">Start Session</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const freq = FREQUENCIES[session.hz]
            if (!freq) return null
            const date = new Date(session.created_at)
            const mins = Math.round(session.duration_seconds / 60)
            const improvement = session.before_score !== null && session.after_score !== null
              ? session.after_score - session.before_score
              : null

            return (
              <div key={session.id} className="glass p-4 rounded-2xl flex items-center gap-4">
                {/* Color indicator */}
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                     style={{ background: `${freq.colorHex}20`, color: freq.colorHex,
                              border: `1px solid ${freq.colorHex}40` }}>
                  {session.hz}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-medium">{freq.name}</p>
                    <p className="text-xs" style={{ color: freq.colorHex }}>{session.hz} Hz</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                    {mins} min · {session.binaural_band}
                  </p>
                </div>

                {improvement !== null && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Feeling</p>
                    <p className="text-sm font-semibold"
                       style={{ color: improvement > 0 ? '#10b981' : improvement < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                      {improvement > 0 ? `+${improvement}` : improvement}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
