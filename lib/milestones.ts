import type { SessionRecord } from './supabase/sessions'

/**
 * What the account has actually done, as things worth naming.
 *
 * Every milestone is derived from the session record and carries the date it
 * was reached, because "you have listened for ten hours" is a fact and "you
 * reached ten hours on the 3rd of March" is a memory. Locked ones show their
 * distance so the list reads as a path rather than a scoreboard.
 *
 * Nothing here is awarded for spending money. A record of what someone has
 * paid belongs in the timeline as an event, not dressed up as an achievement.
 */

export interface Milestone {
  id: string
  label: string
  note: string
  /** Date reached, or null while still locked. */
  at: Date | null
  /** 0…1 toward earning it. 1 with a null date means the data is incomplete. */
  progress: number
  /** Human progress, e.g. "6 / 10 sessions". */
  detail: string
}

/** The session at which a running total first crosses `target`. */
function crossing(
  sessions: SessionRecord[],
  target: number,
  value: (s: SessionRecord) => number,
): { at: Date | null; total: number } {
  // Oldest first: a threshold is crossed at the moment it happened, not at the
  // most recent session that happens to sit above it.
  const ordered = [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let run = 0
  let at: Date | null = null
  for (const s of ordered) {
    run += value(s)
    if (at === null && run >= target) at = s.createdAt
  }
  return { at, total: run }
}

/** The session at which the count of distinct keys first reaches `target`. */
function distinctCrossing(
  sessions: SessionRecord[],
  target: number,
  key: (s: SessionRecord) => string | number,
): { at: Date | null; total: number } {
  const ordered = [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const seen = new Set<string | number>()
  let at: Date | null = null
  for (const s of ordered) {
    seen.add(key(s))
    if (at === null && seen.size >= target) at = s.createdAt
  }
  return { at, total: seen.size }
}

function fmtHours(seconds: number) {
  const h = seconds / 3600
  if (h < 1) return `${Math.round(seconds / 60)}m`
  return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`
}

export function buildMilestones(sessions: SessionRecord[]): Milestone[] {
  const countOne = () => 1
  const out: Milestone[] = []

  // ── Sessions completed ────────────────────────────────────────────────────
  for (const [target, label, note] of [
    [1,   'First session',   'The one that starts the record.'],
    [10,  'Ten sessions',    'Past trying it and into using it.'],
    [50,  'Fifty sessions',  'A practice rather than an experiment.'],
    [100, 'A hundred',       'Few accounts get here.'],
  ] as [number, string, string][]) {
    const { at, total } = crossing(sessions, target, countOne)
    out.push({
      id: `sessions-${target}`, label, note, at,
      progress: Math.min(1, total / target),
      detail: at ? `${total} sessions` : `${total} / ${target} sessions`,
    })
  }

  // ── Time listened ─────────────────────────────────────────────────────────
  for (const [mins, label, note] of [
    [60,   'One hour',    'An hour of tone, added up.'],
    [600,  'Ten hours',   'The point where a habit shows in the data.'],
    [3000, 'Fifty hours', 'A serious amount of listening.'],
  ] as [number, string, string][]) {
    const target = mins * 60
    const { at, total } = crossing(sessions, target, s => s.elapsedSeconds)
    out.push({
      id: `time-${mins}`, label, note, at,
      progress: Math.min(1, total / target),
      detail: at ? fmtHours(total) : `${fmtHours(total)} / ${fmtHours(target)}`,
    })
  }

  // ── Range explored ────────────────────────────────────────────────────────
  for (const [target, label, note] of [
    [5,  'Five tones',   'Enough to hear that they differ.'],
    [20, 'Twenty tones', 'Genuinely exploring the range.'],
  ] as [number, string, string][]) {
    const { at, total } = distinctCrossing(sessions, target, s => s.hz)
    out.push({
      id: `tones-${target}`, label, note, at,
      progress: Math.min(1, total / target),
      detail: at ? `${total} tones` : `${total} / ${target} tones`,
    })
  }

  // ── All five bands ────────────────────────────────────────────────────────
  const bands = distinctCrossing(sessions.filter(s => s.band), 5, s => s.band)
  out.push({
    id: 'bands-all', label: 'Every band', note: 'Delta through gamma — the whole rail.',
    at: bands.at, progress: Math.min(1, bands.total / 5),
    detail: bands.at ? 'all 5 bands' : `${bands.total} / 5 bands`,
  })

  // ── A long single sitting ─────────────────────────────────────────────────
  const longest = sessions.reduce<SessionRecord | null>(
    (best, s) => (!best || s.elapsedSeconds > best.elapsedSeconds ? s : best), null)
  const longTarget = 30 * 60
  out.push({
    id: 'long-session', label: 'Thirty in one sitting',
    note: 'A single session run for half an hour.',
    at: longest && longest.elapsedSeconds >= longTarget ? longest.createdAt : null,
    progress: longest ? Math.min(1, longest.elapsedSeconds / longTarget) : 0,
    detail: longest ? `best ${fmtHours(longest.elapsedSeconds)}` : 'no sessions yet',
  })

  // ── Came back the next day ────────────────────────────────────────────────
  const dayKeys = sessions.map(s => s.createdAt.toISOString().slice(0, 10))
  const days = dayKeys.filter((d, i) => dayKeys.indexOf(d) === i).sort()
  let backAt: Date | null = null
  for (let i = 1; i < days.length; i++) {
    const gap = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86_400_000
    if (Math.round(gap) === 1) {
      backAt = sessions
        .filter(s => s.createdAt.toISOString().slice(0, 10) === days[i])
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]?.createdAt ?? null
      break
    }
  }
  out.push({
    id: 'returned', label: 'Two days running',
    note: 'The hardest one to earn by accident.',
    at: backAt, progress: backAt ? 1 : Math.min(1, days.length / 2),
    detail: backAt ? 'back-to-back days' : `${days.length} active ${days.length === 1 ? 'day' : 'days'}`,
  })

  // Earned first, newest at the top of that group; locked below, closest first.
  return out.sort((a, b) => {
    if (a.at && b.at) return b.at.getTime() - a.at.getTime()
    if (a.at) return -1
    if (b.at) return 1
    return b.progress - a.progress
  })
}
