'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import { FREQUENCIES, getOrCreateFrequency } from '@/lib/frequencies'
import { useAuthUser, fetchSessions, type SessionRecord } from '@/lib/firebase/sessions'

// Count consecutive session days ending today or yesterday
function calculateStreak(sessions: SessionRecord[]): number {
  const dateSet = sessions.map(s => s.createdAt.toISOString().slice(0, 10))
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

function avgImprovement(sessions: SessionRecord[]): number | null {
  const rated = sessions.filter(s => s.beforeScore !== null && s.afterScore !== null)
  if (rated.length === 0) return null
  const total = rated.reduce((sum, s) => sum + (s.afterScore! - s.beforeScore!), 0)
  return Math.round((total / rated.length) * 10) / 10
}

function topFrequencies(sessions: SessionRecord[], n = 5): { hz: number; count: number }[] {
  const counts: Record<number, number> = {}
  sessions.forEach(s => { counts[s.hz] = (counts[s.hz] || 0) + 1 })
  return Object.entries(counts)
    .map(([hz, count]) => ({ hz: Number(hz), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export default function HistoryPage() {
  const user = useAuthUser()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return          // still resolving auth
    if (user === null) { setLoading(false); return }  // signed out
    let alive = true
    setLoading(true)
    fetchSessions(user.uid)
      .then(rows => { if (alive) { setSessions(rows); setError(null) } })
      .catch(err => {
        console.warn('[Solive] history load failed:', err)
        if (alive) setError('Could not load your sessions. Check your Firestore rules.')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user])

  const streak   = calculateStreak(sessions)
  const avgImp   = avgImprovement(sessions)
  const topFreqs = topFrequencies(sessions)
  const maxFreqCount = topFreqs[0]?.count || 1

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <div className="relative z-10 px-5 max-w-2xl mx-auto"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 80 }}>

        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-sm flex items-center gap-1.5 mb-3 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </Link>
            <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.02em' }}>My Sessions</h1>
          </div>
          <Link href="/session" className="btn-primary py-2 px-5 text-sm">New Session</Link>
        </div>

        {/* States */}
        {user === undefined || loading ? (
          <div className="glass rounded-2xl p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading your journey…
          </div>

        ) : user === null ? (
          <div className="glass-card grain p-8 rounded-3xl text-center">
            <div className="shimmer-overlay" />
            <div className="relative z-[2]">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                   style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Sign in to track sessions</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Create an account to save your session history and track your journey over time.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/auth/login" className="btn-primary">Sign in / Register</Link>
                <Link href="/session" className="btn-ghost">Guest session</Link>
              </div>
            </div>
          </div>

        ) : error ? (
          <div className="glass p-8 rounded-3xl text-center">
            <p className="text-sm mb-4" style={{ color: '#f0a0a0' }}>{error}</p>
            <Link href="/session" className="btn-ghost">Start a session</Link>
          </div>

        ) : sessions.length === 0 ? (
          <div className="glass-card grain p-8 rounded-3xl text-center">
            <div className="shimmer-overlay" />
            <div className="relative z-[2]">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                   style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Complete a frequency session and your journey will be tracked here.
              </p>
              <Link href="/session" className="btn-primary">Start First Session</Link>
            </div>
          </div>

        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard label="Sessions" value={String(sessions.length)} />
              <StatCard label="Day streak" value={streak > 0 ? `${streak}` : '0'} accent={streak >= 3} />
              <StatCard
                label="Avg change"
                value={avgImp !== null ? (avgImp > 0 ? `+${avgImp}` : String(avgImp)) : '—'}
                accent={avgImp !== null && avgImp > 0}
                color={avgImp !== null ? (avgImp > 0 ? '#00c896' : avgImp < 0 ? '#e05050' : undefined) : undefined}
              />
            </div>

            {/* Top frequencies */}
            {topFreqs.length > 0 && (
              <div className="glass rounded-2xl p-5 mb-6">
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Top Frequencies
                </p>
                <div className="space-y-3">
                  {topFreqs.map(({ hz, count }) => {
                    const freq = FREQUENCIES[hz] ?? getOrCreateFrequency(hz)
                    const pct = (count / maxFreqCount) * 100
                    return (
                      <div key={hz} className="flex items-center gap-3">
                        <div className="w-16 flex-shrink-0">
                          <p className="text-xs font-mono" style={{ color: freq.colorHex }}>{hz} Hz</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{freq.name}</p>
                        </div>
                        <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full transition-all"
                               style={{ width: `${pct}%`, background: freq.colorHex, boxShadow: `0 0 8px ${freq.colorHex}60` }} />
                        </div>
                        <span className="text-xs w-6 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{count}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Session list */}
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Recent Sessions
            </p>
            <div className="space-y-2.5">
              {sessions.slice(0, 60).map((session, i) => {
                const freq = FREQUENCIES[session.hz] ?? getOrCreateFrequency(session.hz)
                const date = session.createdAt
                const mins = Math.round(session.durationSeconds / 60)
                const secs = session.durationSeconds
                const durLabel = secs < 60 ? `${secs}s` : `${mins} min`
                const improvement = session.beforeScore !== null && session.afterScore !== null
                  ? session.afterScore - session.beforeScore : null
                const dateLabel = date.toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                  year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                })
                const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                return (
                  <motion.div key={session.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="glass rounded-2xl px-4 py-3.5 flex items-center gap-4 transition-all hover:bg-white/[0.04]">
                    <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                         style={{ background: `${freq.colorHex}18`, color: freq.colorHex, border: `1px solid ${freq.colorHex}35` }}>
                      {session.hz}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <p className="font-medium text-sm leading-snug truncate">{freq.name}</p>
                        <p className="text-xs flex-shrink-0" style={{ color: freq.colorHex }}>{session.hz} Hz</p>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {dateLabel} · {timeLabel} · {durLabel}
                        {session.band && ` · ${session.band}`}
                      </p>
                    </div>
                    {improvement !== null && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Feeling</p>
                        <p className="text-sm font-bold tabular-nums"
                           style={{ color: improvement > 0 ? '#00c896' : improvement < 0 ? '#e05050' : 'var(--text-secondary)' }}>
                          {improvement > 0 ? `+${improvement}` : improvement === 0 ? '±0' : improvement}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function StatCard({ label, value, accent, color }: {
  label: string; value: string; accent?: boolean; color?: string
}) {
  return (
    <div className="glass rounded-2xl p-4 text-center"
         style={accent ? { border: '1px solid var(--accent-mid)', background: 'var(--accent-dim)' } : {}}>
      <p className="text-2xl font-black mb-1" style={color ? { color } : accent ? { color: 'var(--accent)' } : {}}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
