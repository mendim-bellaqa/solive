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

// Count consecutive session days ending today or yesterday
function calculateStreak(sessions: SessionRow[]): number {
  const dateSet = sessions.map(s => s.created_at.slice(0, 10))
  const dates = dateSet.filter((d, i) => dateSet.indexOf(d) === i).sort().reverse()
  if (dates.length === 0) return 0

  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const diffMs = new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()
    if (Math.round(diffMs / 86_400_000) === 1) streak++
    else break
  }
  return streak
}

// Average improvement (after − before) for sessions with both scores
function avgImprovement(sessions: SessionRow[]): number | null {
  const rated = sessions.filter(s => s.before_score !== null && s.after_score !== null)
  if (rated.length === 0) return null
  const total = rated.reduce((sum, s) => sum + (s.after_score! - s.before_score!), 0)
  return Math.round((total / rated.length) * 10) / 10
}

// Top N frequencies by session count
function topFrequencies(sessions: SessionRow[], n = 5): { hz: number; count: number }[] {
  const counts: Record<number, number> = {}
  sessions.forEach(s => { counts[s.hz] = (counts[s.hz] || 0) + 1 })
  return Object.entries(counts)
    .map(([hz, count]) => ({ hz: Number(hz), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

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
      .limit(100)
    sessions = data ?? []
  }

  const streak   = calculateStreak(sessions)
  const avgImp   = avgImprovement(sessions)
  const topFreqs = topFrequencies(sessions)
  const maxFreqCount = topFreqs[0]?.count || 1

  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────── */}
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

      {/* ── Guest gate ────────────────────────────────────────────────── */}
      {!user ? (
        <div className="glass p-8 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
               style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
            </svg>
          </div>
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
            Complete your first frequency session and your journey will be tracked here.
          </p>
          <Link href="/session" className="btn-primary">Start First Session</Link>
        </div>

      ) : (
        <>
          {/* ── Stats row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Sessions" value={String(sessions.length)} />
            <StatCard
              label={streak === 1 ? 'Day streak' : 'Day streak'}
              value={streak > 0 ? `${streak} 🔥` : '0'}
              accent={streak >= 3}
            />
            <StatCard
              label="Avg change"
              value={avgImp !== null ? (avgImp > 0 ? `+${avgImp}` : String(avgImp)) : '—'}
              accent={avgImp !== null && avgImp > 0}
              color={avgImp !== null ? (avgImp > 0 ? '#10b981' : avgImp < 0 ? '#ef4444' : undefined) : undefined}
            />
          </div>

          {/* ── Top frequencies chart (CSS bars) ──────────────────────── */}
          {topFreqs.length > 0 && (
            <div className="glass rounded-2xl p-5 mb-6">
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                Top Frequencies
              </p>
              <div className="space-y-3">
                {topFreqs.map(({ hz, count }) => {
                  const freq = FREQUENCIES[hz]
                  if (!freq) return null
                  const pct = (count / maxFreqCount) * 100
                  return (
                    <div key={hz} className="flex items-center gap-3">
                      <div className="w-16 flex-shrink-0">
                        <p className="text-xs font-mono" style={{ color: freq.colorHex }}>{hz} Hz</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{freq.name}</p>
                      </div>
                      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: freq.colorHex,
                                   boxShadow: `0 0 8px ${freq.colorHex}60` }}
                        />
                      </div>
                      <span className="text-xs w-6 text-right flex-shrink-0"
                            style={{ color: 'var(--text-muted)' }}>{count}×</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Session list ───────────────────────────────────────────── */}
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Recent Sessions
          </p>
          <div className="space-y-2.5">
            {sessions.slice(0, 50).map(session => {
              const freq = FREQUENCIES[session.hz]
              if (!freq) return null

              const date = new Date(session.created_at)
              const mins = Math.round(session.duration_seconds / 60) || 0
              const improvement = session.before_score !== null && session.after_score !== null
                ? session.after_score - session.before_score : null

              const dateLabel = date.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
              })
              const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

              return (
                <div key={session.id}
                     className="glass rounded-2xl px-4 py-3.5 flex items-center gap-4 transition-all hover:bg-white/[0.04]">
                  {/* Frequency badge */}
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                       style={{ background: `${freq.colorHex}18`, color: freq.colorHex,
                                border: `1px solid ${freq.colorHex}35` }}>
                    {session.hz}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <p className="font-medium text-sm leading-snug">{freq.name}</p>
                      <p className="text-xs flex-shrink-0" style={{ color: freq.colorHex }}>
                        {session.hz} Hz
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {dateLabel} · {timeLabel}
                      {mins > 0 && ` · ${mins} min`}
                      {session.binaural_band && ` · ${session.binaural_band}`}
                    </p>
                  </div>

                  {/* Improvement */}
                  {improvement !== null && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Feeling</p>
                      <p className="text-sm font-bold tabular-nums"
                         style={{ color: improvement > 0 ? '#10b981' : improvement < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {improvement > 0 ? `+${improvement}` : improvement === 0 ? '±0' : improvement}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, accent, color }: {
  label: string
  value: string
  accent?: boolean
  color?: string
}) {
  return (
    <div className="glass rounded-2xl p-4 text-center"
         style={accent ? { border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' } : {}}>
      <p className="text-2xl font-bold mb-1" style={color ? { color } : accent ? { color: '#10b981' } : {}}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
