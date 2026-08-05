'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import { FREQUENCIES, getOrCreateFrequency } from '@/lib/frequencies'
import {
  useAuthUser, fetchSessions, rateSession, type SessionRecord,
} from '@/lib/supabase/sessions'

const RATING_OPTIONS = [
  { score: 1, emoji: '😞', label: 'Worse' },
  { score: 2, emoji: '😕', label: 'Bit worse' },
  { score: 3, emoji: '😐', label: 'Same' },
  { score: 4, emoji: '🙂', label: 'Better' },
  { score: 5, emoji: '😊', label: 'Much better' },
]

// ─── Derived stats ────────────────────────────────────────────────────────────
function calculateStreak(sessions: SessionRecord[]): number {
  const all = sessions.map(s => s.createdAt.toISOString().slice(0, 10))
  const dates = all.filter((d, i) => all.indexOf(d) === i).sort().reverse()
  if (dates.length === 0) return 0

  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()
    if (Math.round(diff / 86_400_000) === 1) streak++
    else break
  }
  return streak
}

function topFrequencies(sessions: SessionRecord[], n = 5) {
  const counts: Record<number, number> = {}
  sessions.forEach(s => { counts[s.hz] = (counts[s.hz] || 0) + 1 })
  return Object.entries(counts)
    .map(([hz, count]) => ({ hz: Number(hz), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function fmtDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`
  const mins = Math.floor(totalSeconds / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return `${h}h ${mins % 60}m`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const user = useAuthUser()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingFor, setRatingFor] = useState<string | null>(null)

  const load = useCallback((uid: string) => {
    setLoading(true)
    return fetchSessions(uid)
      .then(rows => { setSessions(rows); setError(null) })
      .catch(err => {
        console.warn('[hzaura] history load failed:', err)
        setError('Could not load your sessions. Check the row-level security policies on the sessions table.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user === undefined) return
    if (user === null) { setLoading(false); return }
    load(user.id)
  }, [user, load])

  async function submitRating(id: string, score: number) {
    setRatingFor(null)
    // optimistic — reflect it immediately, then persist
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, afterScore: score } : s)))
    await rateSession(id, score)
  }

  // ── Aggregates ────────────────────────────────────────────────────────────
  const completed    = sessions.filter(s => s.status === 'completed')
  const inProgress   = sessions.filter(s => s.status === 'in_progress')
  const totalSeconds = sessions.reduce((sum, s) => sum + s.elapsedSeconds, 0)
  const rated        = sessions.filter(s => s.afterScore !== null)
  const avgFeeling   = rated.length
    ? Math.round((rated.reduce((sum, s) => sum + (s.afterScore ?? 0), 0) / rated.length) * 10) / 10
    : null
  const feedbackRate = sessions.length
    ? Math.round((rated.length / sessions.length) * 100)
    : 0
  const streak       = calculateStreak(sessions)
  const topFreqs     = topFrequencies(sessions)
  const maxFreqCount = topFreqs[0]?.count || 1
  const awaitingFeedback = completed.filter(s => s.afterScore === null)

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <div className="relative z-10 px-5 max-w-3xl mx-auto"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 90 }}>

        {/* Header row */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <Link href="/" className="text-sm flex items-center gap-1.5 mb-3 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </Link>
            <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.025em' }}>My Sessions</h1>
            {sessions.length > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {sessions.length} session{sessions.length === 1 ? '' : 's'} · {fmtDuration(totalSeconds)} of listening
              </p>
            )}
          </div>
          <Link href="/session" className="btn-primary py-2 px-5 text-sm flex-shrink-0">New Session</Link>
        </div>

        {/* ── States ───────────────────────────────────────────────────────── */}
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
                Your sessions are saved to your account, so you can pause, resume and look back on them.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
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
                Play a frequency and it&rsquo;ll appear here — even if you pause partway through.
              </p>
              <Link href="/session" className="btn-primary">Start First Session</Link>
            </div>
          </div>

        ) : (
          <>
            {/* ── Stat grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total time"   value={fmtDuration(totalSeconds)} />
              <StatCard label="Completed"    value={`${completed.length}`} sub={inProgress.length ? `${inProgress.length} paused` : undefined} />
              <StatCard label="Avg feeling"  value={avgFeeling !== null ? `${avgFeeling}/5` : '—'}
                        accent={avgFeeling !== null && avgFeeling >= 4} />
              <StatCard label="Day streak"   value={`${streak}`} accent={streak >= 3} />
            </div>

            {/* Feedback rate bar */}
            <div className="glass rounded-2xl p-5 mb-4">
              <div className="flex items-baseline justify-between mb-2.5">
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Feedback given
                </p>
                <p className="text-sm font-bold">{feedbackRate}%
                  <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-muted)' }}>
                    ({rated.length}/{sessions.length})
                  </span>
                </p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${feedbackRate}%` }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
              </div>
              {awaitingFeedback.length > 0 && (
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  {awaitingFeedback.length} finished session{awaitingFeedback.length === 1 ? '' : 's'} still
                  {' '}waiting on your feedback — add it below.
                </p>
              )}
            </div>

            {/* ── Paused sessions — resume ──────────────────────────────── */}
            {inProgress.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-widest mb-3 mt-7" style={{ color: 'var(--text-muted)' }}>
                  Paused — pick up where you left off
                </p>
                <div className="space-y-2.5 mb-2">
                  {inProgress.map(s => {
                    const freq = FREQUENCIES[s.hz] ?? getOrCreateFrequency(s.hz)
                    const pct = s.plannedSeconds > 0
                      ? Math.min(100, Math.round((s.elapsedSeconds / s.plannedSeconds) * 100))
                      : 0
                    const resumeHref = `/studio?hz=${s.hz}&binaural=${s.band}`
                      + `&duration=${s.plannedSeconds > 0 ? Math.round(s.plannedSeconds / 60) : 30}`
                      + `&viz=${s.viz}&resume=${s.elapsedSeconds}&sid=${s.id}`
                    return (
                      <div key={s.id} className="glass rounded-2xl px-4 py-4"
                           style={{ border: `1px solid ${freq.colorHex}30` }}>
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                               style={{ background: `${freq.colorHex}18`, color: freq.colorHex, border: `1px solid ${freq.colorHex}45` }}>
                            {s.hz}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{freq.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {fmtDuration(s.elapsedSeconds)} listened
                              {s.plannedSeconds > 0 && ` of ${fmtDuration(s.plannedSeconds)}`}
                              {' · '}{s.band}
                            </p>
                          </div>
                          <Link href={resumeHref}
                                className="btn-primary py-2 px-4 text-xs flex-shrink-0"
                                style={{ background: freq.colorHex, color: '#000' }}>
                            Resume →
                          </Link>
                        </div>
                        {pct > 0 && (
                          <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: freq.colorHex }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── Top frequencies ──────────────────────────────────────── */}
            {topFreqs.length > 0 && (
              <div className="glass rounded-2xl p-5 mb-4 mt-7">
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Most played
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
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                            style={{ background: freq.colorHex, boxShadow: `0 0 8px ${freq.colorHex}60` }} />
                        </div>
                        <span className="text-xs w-6 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{count}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Full list ────────────────────────────────────────────── */}
            <p className="text-xs uppercase tracking-widest mb-3 mt-7" style={{ color: 'var(--text-muted)' }}>
              All sessions
            </p>
            <div className="space-y-2.5">
              {sessions.slice(0, 60).map((s, i) => {
                const freq = FREQUENCIES[s.hz] ?? getOrCreateFrequency(s.hz)
                const isRating = ratingFor === s.id
                const rating = s.afterScore !== null ? RATING_OPTIONS.find(r => r.score === s.afterScore) : null
                const dateLabel = s.createdAt.toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                  year: s.createdAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                })
                const timeLabel = s.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                return (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.35) }}
                    className="glass rounded-2xl px-4 py-3.5">

                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                           style={{ background: `${freq.colorHex}18`, color: freq.colorHex, border: `1px solid ${freq.colorHex}35` }}>
                        {s.hz}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-medium text-sm leading-snug">{freq.name}</p>
                          <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={s.status === 'completed'
                                  ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-mid)' }
                                  : { background: 'rgba(232,160,32,0.12)', color: '#e8a020', border: '1px solid rgba(232,160,32,0.3)' }}>
                            {s.status === 'completed' ? 'DONE' : 'PAUSED'}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {dateLabel} · {timeLabel} · {fmtDuration(s.elapsedSeconds)}
                          {s.band && ` · ${s.band}`}
                        </p>
                      </div>

                      {/* Feedback state */}
                      <div className="flex-shrink-0 text-right">
                        {rating ? (
                          <div title={rating.label}>
                            <span className="text-xl leading-none">{rating.emoji}</span>
                            <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{rating.label}</p>
                          </div>
                        ) : s.status === 'completed' ? (
                          <button onClick={() => setRatingFor(isRating ? null : s.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                                  style={{ color: 'var(--accent)', border: '1px solid var(--accent-mid)' }}>
                            {isRating ? 'Cancel' : 'Add feedback'}
                          </button>
                        ) : (
                          <span className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>Not finished</span>
                        )}
                      </div>
                    </div>

                    {/* Inline rating picker */}
                    <AnimatePresence>
                      {isRating && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}>
                          <div className="pt-4 mt-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                              How did you feel after this session?
                            </p>
                            <div className="flex justify-between gap-1.5">
                              {RATING_OPTIONS.map(({ score, emoji, label }) => (
                                <motion.button key={score} onClick={() => submitRating(s.id, score)}
                                  whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }}
                                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl flex-1"
                                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                  <span className="text-lg leading-none">{emoji}</span>
                                  <span className="text-[0.62rem] leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="glass rounded-2xl p-4 text-center"
         style={accent ? { border: '1px solid var(--accent-mid)', background: 'var(--accent-dim)' } : {}}>
      <p className="text-xl font-black mb-1" style={accent ? { color: 'var(--accent)' } : {}}>{value}</p>
      <p className="text-[0.68rem]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && <p className="text-[0.6rem] mt-0.5" style={{ color: '#e8a020' }}>{sub}</p>}
    </div>
  )
}
