'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import BackLink from '@/components/BackLink'
import { FREQUENCIES, getOrCreateFrequency, primaryCatalogEntry, BINAURAL_PRESETS } from '@/lib/frequencies'
import { useSessionPresets } from '@/lib/presets'
import {
  useAuthUser, fetchSessions, rateSession, setSessionFavorite, type SessionRecord,
} from '@/lib/supabase/sessions'
import { usePlan } from '@/lib/plan'

// A five-point scale reads better as a scale than as five faces: same
// information, none of the noise.
const RATING_OPTIONS = [
  { score: 1, label: 'Worse' },
  { score: 2, label: 'A bit worse' },
  { score: 3, label: 'Same' },
  { score: 4, label: 'Better' },
  { score: 5, label: 'Much better' },
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

function fmtHz(hz: number) {
  return hz >= 1000 ? hz.toLocaleString('en-US') : String(hz)
}

function toneName(hz: number) {
  return primaryCatalogEntry(hz)?.name ?? (FREQUENCIES[hz] ?? getOrCreateFrequency(hz)).name
}

/** Play this session's setup again from the top. */
function playHref(s: SessionRecord) {
  const minutes = s.plannedSeconds > 0 ? Math.round(s.plannedSeconds / 60) : 30
  return `/studio?hz=${s.hz}&binaural=${s.band}&duration=${minutes}&viz=${s.viz}`
}

/** Seconds listened per day, keyed YYYY-MM-DD. */
function dailyTotals(sessions: SessionRecord[]) {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const key = s.createdAt.toISOString().slice(0, 10)
    map.set(key, (map.get(key) ?? 0) + s.elapsedSeconds)
  }
  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter()
  const user = useAuthUser()
  const { limits } = usePlan()
  const { presets, remove } = useSessionPresets()
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
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, afterScore: score } : s)))
    await rateSession(id, score)
  }

  /** Starring is a paid feature — free plans get sent to the plans page. */
  async function toggleFavorite(s: SessionRecord) {
    if (!limits.favorites) { router.push('/pricing'); return }
    const next = !s.favorite
    setSessions(prev => prev.map(x => (x.id === s.id ? { ...x, favorite: next } : x)))
    const ok = await setSessionFavorite(s.id, next)
    if (!ok) setSessions(prev => prev.map(x => (x.id === s.id ? { ...x, favorite: !next } : x)))
  }

  // ── Aggregates ────────────────────────────────────────────────────────────
  const completed    = sessions.filter(s => s.status === 'completed')
  const inProgress   = sessions.filter(s => s.status === 'in_progress')
  const totalSeconds = sessions.reduce((sum, s) => sum + s.elapsedSeconds, 0)
  const rated        = sessions.filter(s => s.afterScore !== null)
  const avgFeeling   = rated.length
    ? Math.round((rated.reduce((sum, s) => sum + (s.afterScore ?? 0), 0) / rated.length) * 10) / 10
    : null
  const streak       = calculateStreak(sessions)
  const topFreqs     = topFrequencies(sessions)
  const maxFreqCount = topFreqs[0]?.count || 1
  const awaitingFeedback = completed.filter(s => s.afterScore === null)
  const favorites    = sessions.filter(s => s.favorite)
  const days = useMemo(() => dailyTotals(sessions), [sessions])

  const savedRow = presets && presets.length > 0

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
            <div className="mb-3"><BackLink fallbackLabel="Home" /></div>
            <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.025em' }}>My Sessions</h1>
            {sessions.length > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--t4)' }}>
                {sessions.length} session{sessions.length === 1 ? '' : 's'} · {fmtDuration(totalSeconds)} of listening
              </p>
            )}
          </div>
          <Link href="/session" className="btn-ghost py-2 px-5 text-sm flex-shrink-0">New session</Link>
        </div>

        {/* ── Saved setups — available signed in or out ─────────────────── */}
        {savedRow && (
          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-2.5">
              <p className="hist-eyebrow">Saved sessions</p>
              <p className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>
                On your account
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {presets!.map(p => (
                <div key={p.id} className="hist-row">
                  <span className="hist-hz">{fmtHz(p.hz)}<span className="hist-hz-unit">Hz</span></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                      {BINAURAL_PRESETS[p.band].label} · {p.minutes === 9999 ? 'open-ended' : `${p.minutes} min`} · {p.viz}
                    </p>
                  </div>
                  <Link href={`/studio?hz=${p.hz}&binaural=${p.band}&duration=${p.minutes}&viz=${p.viz}`}
                        className="hist-action">Start</Link>
                  <button onClick={() => remove(p.id)} className="hist-icon" aria-label={`Delete ${p.name}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── States ───────────────────────────────────────────────────────── */}
        {user === undefined || loading ? (
          <div className="glass rounded-2xl p-10 text-center text-sm" style={{ color: 'var(--t4)' }}>
            Loading your journey…
          </div>

        ) : user === null ? (
          <div className="glass-card grain p-8 rounded-3xl text-center">
            <div className="shimmer-overlay" />
            <div className="relative z-[2]">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                   style={{ background: 'var(--glass-2)', border: '1px solid var(--border-mid)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Sign in to track sessions</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
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
                   style={{ background: 'var(--glass-2)', border: '1px solid var(--border-mid)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
                Play a frequency and it&rsquo;ll appear here — even if you pause partway through.
              </p>
              <Link href="/session" className="btn-primary">Start first session</Link>
            </div>
          </div>

        ) : (
          <>
            {/* ── Stat strip ────────────────────────────────────────────── */}
            <div className="hist-stats mb-4">
              <Stat label="Total time"  value={fmtDuration(totalSeconds)} />
              <Stat label="Completed"   value={`${completed.length}`} sub={inProgress.length ? `${inProgress.length} paused` : undefined} />
              <Stat label="Avg feeling" value={avgFeeling !== null ? `${avgFeeling}` : '—'} sub={avgFeeling !== null ? 'out of 5' : undefined} />
              <Stat label="Day streak"  value={`${streak}`} sub={streak >= 3 ? 'keep going' : undefined} />
            </div>

            {/* ── Activity ──────────────────────────────────────────────── */}
            <Activity days={days} />

            {/* ── Paused sessions — resume ──────────────────────────────── */}
            {inProgress.length > 0 && (
              <section className="mt-7">
                <p className="hist-eyebrow mb-2.5">Pick up where you left off</p>
                <div className="flex flex-col gap-1.5">
                  {inProgress.map(s => {
                    const pct = s.plannedSeconds > 0
                      ? Math.min(100, Math.round((s.elapsedSeconds / s.plannedSeconds) * 100))
                      : 0
                    const resumeHref = `/studio?hz=${s.hz}&binaural=${s.band}`
                      + `&duration=${s.plannedSeconds > 0 ? Math.round(s.plannedSeconds / 60) : 30}`
                      + `&viz=${s.viz}&resume=${s.elapsedSeconds}&sid=${s.id}`
                    return (
                      <div key={s.id} className="hist-row hist-row-stack">
                        <div className="flex items-center gap-3 w-full">
                          <span className="hist-hz">{fmtHz(s.hz)}<span className="hist-hz-unit">Hz</span></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{toneName(s.hz)}</p>
                            <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                              {fmtDuration(s.elapsedSeconds)} listened
                              {s.plannedSeconds > 0 && ` of ${fmtDuration(s.plannedSeconds)}`}
                              {s.band && ` · ${s.band}`}
                            </p>
                          </div>
                          <Link href={resumeHref} className="hist-action">Resume →</Link>
                        </div>
                        {pct > 0 && (
                          <div className="hist-bar mt-2.5">
                            <div className="hist-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Favourites ───────────────────────────────────────────── */}
            {favorites.length > 0 && (
              <section className="mt-7">
                <div className="flex items-baseline justify-between mb-2.5">
                  <p className="hist-eyebrow">Favourites</p>
                  <p className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>
                    {favorites.length} starred
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {favorites.map(s => (
                    <div key={s.id} className="hist-row">
                      <span className="hist-hz">{fmtHz(s.hz)}<span className="hist-hz-unit">Hz</span></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{toneName(s.hz)}</p>
                        <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                          {s.band} · {s.plannedSeconds > 0 ? fmtDuration(s.plannedSeconds) : 'open-ended'} · {s.viz}
                        </p>
                      </div>
                      <Link href={playHref(s)} className="hist-action">Play again</Link>
                      <Star on onClick={() => toggleFavorite(s)} label={`Unstar ${toneName(s.hz)}`} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Most played ──────────────────────────────────────────── */}
            {topFreqs.length > 1 && (
              <section className="mt-7">
                <p className="hist-eyebrow mb-3">Most played</p>
                <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                  {topFreqs.map(({ hz, count }) => (
                    <div key={hz} className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0 min-w-0">
                        <p className="text-[0.76rem] font-bold tabular" style={{ letterSpacing: '-0.01em' }}>{fmtHz(hz)} Hz</p>
                        <p className="text-[0.66rem] truncate" style={{ color: 'var(--t4)' }}>{toneName(hz)}</p>
                      </div>
                      <div className="hist-bar flex-1">
                        <motion.div className="hist-bar-fill"
                          initial={{ width: 0 }} animate={{ width: `${(count / maxFreqCount) * 100}%` }}
                          transition={{ duration: 0.6 }} />
                      </div>
                      <span className="text-[0.7rem] w-7 text-right flex-shrink-0 tabular" style={{ color: 'var(--t4)' }}>
                        {count}×
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Full list ────────────────────────────────────────────── */}
            <section className="mt-7">
              <div className="flex items-baseline justify-between mb-2.5">
                <p className="hist-eyebrow">All sessions</p>
                {awaitingFeedback.length > 0 && (
                  <p className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>
                    {awaitingFeedback.length} awaiting feedback
                  </p>
                )}
              </div>

              {/* Say what the locked star is for, once, rather than on every row. */}
              {!limits.favorites && (
                <button onClick={() => router.push('/pricing')}
                  className="w-full text-left mb-2.5"
                  style={{ fontSize: '0.72rem', lineHeight: 1.55, color: 'var(--t3)', padding: '9px 12px',
                           borderRadius: 10, background: 'var(--glass-1)', border: '1px solid var(--border)' }}>
                  Star a session to keep it at the top of this page — favourites come with any paid plan.{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>See plans →</span>
                </button>
              )}
              <div className="flex flex-col gap-1.5">
                {sessions.slice(0, 60).map((s, i) => {
                  const isRating = ratingFor === s.id
                  const rating = s.afterScore !== null ? RATING_OPTIONS.find(r => r.score === s.afterScore) : null
                  const dateLabel = s.createdAt.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                    year: s.createdAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                  })
                  const timeLabel = s.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                  return (
                    <motion.div key={s.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="hist-row hist-row-stack">

                      <div className="flex items-center gap-3 w-full">
                        <span className="hist-hz">{fmtHz(s.hz)}<span className="hist-hz-unit">Hz</span></span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{toneName(s.hz)}</p>
                          <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                            {dateLabel} · {timeLabel} · {fmtDuration(s.elapsedSeconds)}
                            {s.band && ` · ${s.band}`}
                            {s.status === 'in_progress' && ' · paused'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {rating ? (
                            <span className="hist-score" title={`${rating.score} of 5`}>
                              <Dots score={rating.score} />
                              <span className="hist-score-label">{rating.label}</span>
                            </span>
                          ) : s.status === 'completed' ? (
                            <button onClick={() => setRatingFor(isRating ? null : s.id)} className="hist-action">
                              {isRating ? 'Cancel' : 'Rate'}
                            </button>
                          ) : null}
                          <Star
                            on={s.favorite}
                            locked={!limits.favorites}
                            onClick={() => toggleFavorite(s)}
                            label={s.favorite ? `Unstar ${toneName(s.hz)}` : `Star ${toneName(s.hz)}`}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isRating && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', width: '100%' }}>
                            <div className="pt-3.5 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
                              <p className="text-[0.72rem] mb-2.5" style={{ color: 'var(--t3)' }}>
                                How did you feel after this session?
                              </p>
                              <div className="hist-scale">
                                {RATING_OPTIONS.map(({ score, label }) => (
                                  <button key={score} onClick={() => submitRating(s.id, score)} className="hist-scale-btn">
                                    <Dots score={score} />
                                    <span>{label}</span>
                                  </button>
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
            </section>
          </>
        )}
      </div>
    </>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hist-stat">
      <p className="hist-stat-value">{value}</p>
      <p className="hist-stat-label">{label}</p>
      {sub && <p className="hist-stat-sub">{sub}</p>}
    </div>
  )
}

/**
 * The star. Filled when the session is a favourite, outlined when it isn't,
 * and wearing a small lock on the free plan — where it stays visible and
 * tappable, because a control you cannot see is not an upsell.
 */
function Star({ on, locked, onClick, label }: {
  on: boolean
  locked?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hist-star"
      data-on={on || undefined}
      data-locked={locked || undefined}
      aria-label={locked ? `${label} — available on paid plans` : label}
      aria-pressed={on}
      title={locked ? 'Favourites are a Plus feature' : label}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'}
           stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z"
              strokeLinejoin="round" />
      </svg>
      {locked && (
        <svg className="hist-star-lock" width="8" height="8" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="3" aria-hidden>
          <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      )}
    </button>
  )
}

/** Five dots, filled to the score — a scale you can read at a glance. */
function Dots({ score }: { score: number }) {
  return (
    <span className="hist-dots" aria-hidden>
      {[1, 2, 3, 4, 5].map(n => <span key={n} data-on={n <= score || undefined} />)}
    </span>
  )
}

/**
 * Twelve weeks of listening, one column per week. Intensity is white at four
 * alphas — the shape of a practice, without a palette.
 */
function Activity({ days }: { days: Map<string, number> }) {
  const cells = useMemo(() => {
    const out: { key: string; date: Date; seconds: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Start on the Monday 11 weeks back so columns line up as whole weeks.
    const start = new Date(today)
    start.setDate(start.getDate() - 83 - ((today.getDay() + 6) % 7))
    for (let i = 0; i < 84 + ((today.getDay() + 6) % 7) + 1; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      if (d > today) break
      const key = d.toISOString().slice(0, 10)
      out.push({ key, date: d, seconds: days.get(key) ?? 0 })
    }
    return out
  }, [days])

  const active = cells.filter(c => c.seconds > 0).length
  if (cells.length === 0) return null

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3.5">
        <p className="hist-eyebrow">Last 12 weeks</p>
        <p className="text-[0.66rem]" style={{ color: 'var(--t4)' }}>
          {active} day{active === 1 ? '' : 's'} with a session
        </p>
      </div>
      <div className="hist-grid">
        {cells.map(c => {
          const level = c.seconds === 0 ? 0 : c.seconds < 300 ? 1 : c.seconds < 900 ? 2 : c.seconds < 1800 ? 3 : 4
          return (
            <span key={c.key} data-level={level}
                  title={`${c.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${c.seconds ? fmtDuration(c.seconds) : 'nothing'}`} />
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>Less</span>
        <span className="hist-grid hist-grid-key">
          {[0, 1, 2, 3, 4].map(l => <span key={l} data-level={l} />)}
        </span>
        <span className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>More</span>
      </div>
    </section>
  )
}
