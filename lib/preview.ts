'use client'

/**
 * The free audio preview, and what it costs to spend one.
 *
 * The rule is per frequency, per day: every tone in the library can be
 * sampled, but none of them twice in the same day. That keeps exploring open —
 * a visitor who lands on 174 Hz can still find out what 528 Hz sounds like —
 * while the tone they just heard is the one thing they cannot loop for free.
 *
 * How long a preview runs is not stored here; that is previewSecondsFor() in
 * plan-data, which pays out 30s to a guest and 60s to a signed-in free account.
 *
 * Guests have no account, so this is localStorage and therefore clearable: a
 * determined visitor can wipe it or open a private window. That is an accepted
 * limit, not an oversight — the alternative is forcing an account before anyone
 * can hear a single tone. What it stops is the accidental refill, which is what
 * was actually leaking: the gate used to live in a ref that died on unmount, so
 * simply navigating away handed out another minute of the same tone.
 */

const KEY = 'hzaura_preview_spent'
const EVT = 'hzaura-preview-change'

/** A calendar day, not a rolling 24h: "come back tomorrow" is what the copy
 *  says, and a clock that expired at 3pm because that is when they listened
 *  yesterday would make a liar of it. */
function dayStamp(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface Spent { day: string; hz: number[] }

function read(): Spent {
  const empty: Spent = { day: dayStamp(), hz: [] }
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Spent>
    // A stamp from an earlier day is not merely stale, it is the reset.
    if (parsed.day !== dayStamp() || !Array.isArray(parsed.hz)) return empty
    return { day: parsed.day, hz: parsed.hz.filter(n => typeof n === 'number') }
  } catch {
    return empty   // corrupt or unreadable storage should not lock anyone out
  }
}

/** True when this exact tone has not been previewed yet today. */
export function isPreviewAvailable(hz: number): boolean {
  if (typeof window === 'undefined') return true
  return !read().hz.includes(hz)
}

/** Called the moment a preview is cut off, not when it starts — a session
 *  abandoned after five seconds should not cost the visitor that tone. */
export function markPreviewSpent(hz: number) {
  if (typeof window === 'undefined') return
  const cur = read()
  if (cur.hz.includes(hz)) return
  const next: Spent = { day: cur.day, hz: [...cur.hz, hz] }
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota */ }
  window.dispatchEvent(new Event(EVT))
}

/** How many distinct tones have been sampled today — the line that tells a
 *  visitor the library is still open to them. */
export function previewsSpentToday(): number {
  if (typeof window === 'undefined') return 0
  return read().hz.length
}

/* ── Homepage demos ────────────────────────────────────────────────────────
   The landing page demos are a taste, not a session: a few seconds, once a
   day, then the pitch.

   Keyed per demo — per brainwave band on the entrainment rail — for the same
   reason the studio is keyed per tone. Hearing alpha should not cost you beta:
   the rail exists to be compared across, and one global allowance meant the
   first thing you touched locked the other four. What you cannot do is hear
   the same one twice.

   Tracked apart from the studio's quota, so a homepage demo never spends one
   of the frequencies someone came to try. */

const DEMO_KEY = 'hzaura_demo_spent'

interface DemoSpent { day: string; keys: string[] }

function readDemo(): DemoSpent {
  const empty: DemoSpent = { day: dayStamp(), keys: [] }
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(DEMO_KEY)
    if (!raw) return empty
    // The old single-stamp format was just the day. Anything unparseable, or
    // from another day, is simply a fresh allowance.
    const parsed = JSON.parse(raw) as Partial<DemoSpent>
    if (parsed.day !== dayStamp() || !Array.isArray(parsed.keys)) return empty
    return { day: parsed.day, keys: parsed.keys.filter(k => typeof k === 'string') }
  } catch {
    return empty
  }
}

export function isHomeDemoAvailable(key: string): boolean {
  if (typeof window === 'undefined') return true
  return !readDemo().keys.includes(key)
}

export function markHomeDemoSpent(key: string) {
  if (typeof window === 'undefined') return
  const cur = readDemo()
  if (cur.keys.includes(key)) return
  try {
    window.localStorage.setItem(DEMO_KEY, JSON.stringify({ day: cur.day, keys: [...cur.keys, key] }))
  } catch { /* quota */ }
  window.dispatchEvent(new Event(EVT))
}

/** Whole hours until midnight, floored to 1 so the copy never reads "0h". */
export function hoursUntilReset(now = new Date()): number {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000))
}

export const PREVIEW_EVENT = EVT
