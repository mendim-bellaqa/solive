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

/** Whole hours until midnight, floored to 1 so the copy never reads "0h". */
export function hoursUntilReset(now = new Date()): number {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000))
}

export const PREVIEW_EVENT = EVT
