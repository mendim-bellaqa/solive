'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BackLink from '@/components/BackLink'
import Avatar from '@/components/Avatar'
import { useAuthUser, displayNameOf, fetchSessions, type SessionRecord } from '@/lib/supabase/sessions'
import { fetchPayments, type PaymentEvent } from '@/lib/supabase/activity'
import { buildMilestones, type Milestone } from '@/lib/milestones'
import { primaryCatalogEntry, type BinauralBand } from '@/lib/frequencies'
import { usePlan } from '@/lib/plan'

/* ═══════════════════════════════════════════════════════════════════════════
   HISTORY

   Not the session list — that is /sessions, and it is a working tool for
   resuming and replaying. This is the account's own record: when it started,
   what it has accumulated, what it has paid for, and what it has crossed.

   Everything here is derived from data the account already holds. Nothing is
   invented to fill the page, which is why an empty account says so plainly
   rather than showing zeroes dressed up as progress.
   ═══════════════════════════════════════════════════════════════════════════ */

const BANDS: BinauralBand[] = ['delta', 'theta', 'alpha', 'beta', 'gamma']
const BAND_COLOR: Record<string, string> = {
  delta: '#6b8cff', theta: '#8b5cf6', alpha: '#5CE8DC', beta: '#4a90e8', gamma: '#ffd166',
}

function fmtDuration(total: number) {
  if (total < 60) return `${Math.round(total)}s`
  const m = Math.floor(total / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDay(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}
function toneName(hz: number) {
  return primaryCatalogEntry(hz)?.name ?? `${hz} Hz`
}

// ─── Timeline model ───────────────────────────────────────────────────────────
type EventKind = 'joined' | 'payment' | 'milestone' | 'day'
interface TimelineEvent {
  at: Date
  kind: EventKind
  title: string
  detail: string
  tone?: string
}

function buildTimeline(
  joined: Date | null,
  sessions: SessionRecord[],
  payments: PaymentEvent[],
  milestones: Milestone[],
): TimelineEvent[] {
  const out: TimelineEvent[] = []

  if (joined) {
    out.push({
      at: joined, kind: 'joined',
      title: 'Account created',
      detail: 'The beginning of this record.',
      tone: 'var(--accent)',
    })
  }

  for (const p of payments) {
    out.push({
      at: p.paidAt, kind: 'payment',
      title: `${p.planId === 'pro' ? 'Pro' : 'Plus'} activated`,
      detail: `${p.billing === 'annual' ? 'Annual' : 'Monthly'} pass · $${p.priceUsd.toFixed(2)}`
        + (p.payCurrency ? ` · paid in ${p.payCurrency.toUpperCase()}` : ''),
      tone: '#c9a6ff',
    })
  }

  for (const m of milestones) {
    if (!m.at) continue
    out.push({
      at: m.at, kind: 'milestone',
      title: m.label, detail: m.note, tone: '#5ce8b0',
    })
  }

  // One entry per day of listening, rather than one per session — a day with
  // six sessions is one thing that happened, not six.
  const byDay = new Map<string, SessionRecord[]>()
  for (const s of sessions) {
    const k = s.createdAt.toISOString().slice(0, 10)
    const list = byDay.get(k)
    if (list) list.push(s)
    else byDay.set(k, [s])
  }
  byDay.forEach(list => {
    const secs = list.reduce((n, s) => n + s.elapsedSeconds, 0)
    const tones = list.map(s => s.hz).filter((h, i, a) => a.indexOf(h) === i)
    const latest = list.reduce((b, s) => (s.createdAt > b.createdAt ? s : b), list[0])
    out.push({
      at: latest.createdAt, kind: 'day',
      title: `${list.length} session${list.length === 1 ? '' : 's'} · ${fmtDuration(secs)}`,
      detail: tones.slice(0, 3).map(toneName).join(' · ') + (tones.length > 3 ? ` +${tones.length - 3} more` : ''),
    })
  })

  return out.sort((a, b) => b.at.getTime() - a.at.getTime())
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const user = useAuthUser()
  const { plan, expiresAt } = usePlan()
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [limit, setLimit] = useState(14)

  useEffect(() => {
    if (!user) { if (user === null) setSessions([]); return }
    fetchSessions(user.id).then(setSessions).catch(() => setSessions([]))
    fetchPayments(user.id).then(setPayments).catch(() => setPayments([]))
  }, [user])

  // A fresh [] each render would invalidate every memo below it.
  const rows = useMemo(() => sessions ?? [], [sessions])
  const joined = useMemo(
    () => (user?.created_at ? new Date(user.created_at) : null),
    [user?.created_at],
  )
  const milestones = useMemo(() => buildMilestones(rows), [rows])
  const timeline = useMemo(
    () => buildTimeline(joined, rows, payments, milestones),
    [joined, rows, payments, milestones],
  )

  const totalSeconds = rows.reduce((n, s) => n + s.elapsedSeconds, 0)
  const distinctTones = rows.map(s => s.hz).filter((h, i, a) => a.indexOf(h) === i)
  const dayKeys = rows.map(s => s.createdAt.toISOString().slice(0, 10))
  const activeDays = dayKeys.filter((d, i) => dayKeys.indexOf(d) === i)
  const earned = milestones.filter(m => m.at)

  // Which bands this account actually reaches for.
  const bandCounts = BANDS.map(b => ({
    band: b,
    n: rows.filter(s => s.band === b).length,
  }))
  const bandMax = Math.max(1, ...bandCounts.map(b => b.n))

  const topTones = useMemo(() => {
    const counts: Record<number, number> = {}
    rows.forEach(s => { counts[s.hz] = (counts[s.hz] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([hz, n]) => [Number(hz), n] as [number, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [rows])

  const loading = user === undefined || sessions === null

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <div className="relative z-10 px-5 max-w-3xl mx-auto"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 90 }}>

        <div className="mb-6"><BackLink fallbackLabel="Home" /></div>

        {user === null ? (
          <div className="glass rounded-3xl p-8 text-center">
            <h1 className="text-xl font-black mb-2" style={{ letterSpacing: '-0.02em' }}>Your history lives on your account</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--t3)', lineHeight: 1.6 }}>
              Sign in and this page fills with when you started, what you have listened to,
              and what you have crossed along the way.
            </p>
            <Link href="/auth/login?next=/history" className="btn-primary px-8 py-3 text-sm">Sign in</Link>
          </div>
        ) : (
          <>
            {/* ── Identity ─────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="hist-hero">
              <Avatar
                id={(user?.user_metadata as { avatar_id?: string } | undefined)?.avatar_id}
                fallback={displayNameOf(user) || user?.email || '?'}
                size={62}
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-black" style={{ letterSpacing: '-0.03em' }}>
                  {displayNameOf(user) || user?.email?.split('@')[0] || 'Your history'}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>
                  {joined
                    ? <>Member since {fmtDate(joined)} · <strong style={{ color: 'var(--t2)' }}>{daysBetween(joined, new Date())} days</strong></>
                    : 'Member'}
                </p>
                <span className="plan-badge mt-2 inline-flex" data-plan={plan}>
                  <span className="plan-badge-dot" aria-hidden />
                  {plan === 'free' ? 'Free' : plan === 'plus' ? 'Plus' : 'Pro'}
                  {expiresAt && ` · until ${fmtDay(expiresAt)}`}
                </span>
              </div>
            </motion.div>

            {/* ── Lifetime ─────────────────────────────────────────────── */}
            <div className="hist-stats mb-7">
              {[
                { v: fmtDuration(totalSeconds), l: 'Listened', s: 'all time' },
                { v: String(rows.length), l: 'Sessions', s: `${activeDays.length} active ${activeDays.length === 1 ? 'day' : 'days'}` },
                { v: String(distinctTones.length), l: 'Tones', s: 'explored' },
                { v: `${earned.length}/${milestones.length}`, l: 'Milestones', s: 'reached' },
              ].map(x => (
                <div key={x.l} className="hist-stat">
                  <p className="hist-stat-value">{loading ? '—' : x.v}</p>
                  <p className="hist-stat-label">{x.l}</p>
                  <p className="hist-stat-sub">{x.s}</p>
                </div>
              ))}
            </div>

            {rows.length === 0 && !loading ? (
              <div className="glass rounded-3xl p-8 text-center mb-7">
                <p className="text-sm mb-5" style={{ color: 'var(--t3)', lineHeight: 1.6 }}>
                  Nothing to show yet — the record starts with your first session.
                </p>
                <Link href="/session" className="btn-primary px-8 py-3 text-sm">Build one</Link>
              </div>
            ) : (
              <>
                {/* ── What you reach for ───────────────────────────────── */}
                <section className="mb-7">
                  <p className="hist-eyebrow mb-3">What you reach for</p>
                  <div className="card" style={{ padding: 20 }}>
                    <div className="band-bars mb-4">
                      {bandCounts.map(b => (
                        <div key={b.band} className="band-bar">
                          <span className="band-bar-label" style={{ color: b.n ? BAND_COLOR[b.band] : 'var(--t4)' }}>
                            {b.band}
                          </span>
                          <span className="band-bar-track">
                            <motion.span
                              className="band-bar-fill"
                              style={{ background: BAND_COLOR[b.band] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(b.n / bandMax) * 100}%` }}
                              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </span>
                          <span className="band-bar-n">{b.n}</span>
                        </div>
                      ))}
                    </div>
                    {topTones.length > 0 && (
                      <>
                        <p className="hist-eyebrow mb-2" style={{ fontSize: '0.58rem' }}>Most returned to</p>
                        <div className="flex flex-wrap gap-2">
                          {topTones.map(([hz, n]) => (
                            <Link key={hz} href={`/studio?hz=${hz}`} className="tone-chip">
                              <strong>{hz}</strong> Hz
                              <span>{toneName(hz)}</span>
                              <em>×{n}</em>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* ── Milestones ───────────────────────────────────────── */}
                <section className="mb-7">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="hist-eyebrow">Milestones</p>
                    <p className="text-[0.62rem]" style={{ color: 'var(--t4)' }}>
                      {earned.length} of {milestones.length} reached
                    </p>
                  </div>
                  <div className="ms-grid">
                    {milestones.map((m, i) => (
                      <motion.div
                        key={m.id}
                        className="ms-cell"
                        data-on={m.at ? true : undefined}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      >
                        <div className="ms-head">
                          <span className="ms-label">{m.label}</span>
                          {m.at && <span className="ms-date">{fmtDay(m.at)}</span>}
                        </div>
                        <p className="ms-note">{m.note}</p>
                        {!m.at && (
                          <span className="ms-track">
                            <span className="ms-fill" style={{ width: `${m.progress * 100}%` }} />
                          </span>
                        )}
                        <span className="ms-detail">{m.detail}</span>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* ── Timeline ─────────────────────────────────────────── */}
                <section>
                  <p className="hist-eyebrow mb-3">Everything that has happened</p>
                  <ol className="tl">
                    {timeline.slice(0, limit).map((e, i) => (
                      <motion.li
                        key={`${e.kind}-${e.at.getTime()}-${i}`}
                        className="tl-row"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.35) }}
                      >
                        <span className="tl-dot" style={{ background: e.tone ?? 'var(--t-decor)' }} />
                        <span className="tl-body">
                          <span className="tl-head">
                            <span className="tl-title">{e.title}</span>
                            <span className="tl-when">{fmtDay(e.at)}</span>
                          </span>
                          <span className="tl-detail">{e.detail}</span>
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                  {timeline.length > limit && (
                    <button onClick={() => setLimit(n => n + 20)} className="btn-ghost text-sm w-full mt-4">
                      Show more
                    </button>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  )
}
