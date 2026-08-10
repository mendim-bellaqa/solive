'use client'

/**
 * The free audio preview is one minute, once a day.
 *
 * The cut-off itself lives in PLAN_LIMITS.previewSeconds; this module owns the
 * other half — whether the visitor still has today's preview to spend. Without
 * it the gate lived in a ref that died on navigation, so leaving the studio and
 * coming back handed out another minute indefinitely.
 *
 * Guests have no account, so this is localStorage and therefore clearable: a
 * determined visitor can wipe it or open a private window. That is an accepted
 * limit, not an oversight — the alternative is forcing an account before anyone
 * can hear a single tone. It stops the accidental refill, which is what was
 * actually leaking.
 */

const KEY = 'hzaura_preview_spent_at'
const EVT = 'hzaura-preview-change'

/** A calendar day, not a rolling 24h: "come back tomorrow" is what we tell the
 *  user, and a clock that expires at 3pm because that is when they listened
 *  yesterday would make a liar of that copy. */
function dayStamp(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** The day the visitor last used up a preview, or null if never. */
export function getPreviewSpentDay(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(KEY)
}

/** True when today's preview is still unspent. */
export function isPreviewAvailable(): boolean {
  if (typeof window === 'undefined') return true
  return getPreviewSpentDay() !== dayStamp()
}

/** Called the moment the preview is cut off, not when it starts — a session
 *  abandoned after ten seconds should not cost the visitor their day. */
export function markPreviewSpent() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, dayStamp())
  window.dispatchEvent(new Event(EVT))
}

/** Whole hours until midnight, floored to at least 1 so the copy never reads
 *  "in 0 hours". */
export function hoursUntilReset(now = new Date()): number {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000))
}

export const PREVIEW_EVENT = EVT
