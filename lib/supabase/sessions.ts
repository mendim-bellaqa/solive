'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from './client'

// ─── Auth hook ────────────────────────────────────────────────────────────────
// `undefined` = still resolving, `null` = signed out, User = signed in.
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) { setUser(null); return }   // misconfigured build → signed out

    let active = true
    // getUser() revalidates against the auth server rather than trusting
    // whatever is in storage, so a stale or tampered cookie resolves to null.
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  return user
}

/** Supabase stores the display name in user_metadata, not as a column. */
export function displayNameOf(user: User | null | undefined): string | null {
  if (!user) return null
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  return meta?.full_name ?? meta?.name ?? null
}

// ─── Session model ────────────────────────────────────────────────────────────
export type SessionStatus = 'in_progress' | 'completed'

export interface SessionRecord {
  id: string
  hz: number
  band: string
  viz: string
  /** Session length the user chose, in seconds. */
  plannedSeconds: number
  /** How much was actually listened to, in seconds. */
  elapsedSeconds: number
  status: SessionStatus
  beforeScore: number | null
  /** null means the user hasn't left feedback yet. */
  afterScore: number | null
  /** Starred by the user — a paid-plan feature. */
  favorite: boolean
  createdAt: Date
}

/** Row shape as it exists in Postgres (snake_case). */
interface SessionRow {
  id: string
  hz: number | string
  band: string
  viz: string | null
  planned_seconds: number | null
  elapsed_seconds: number | null
  status: SessionStatus | null
  before_score: number | null
  after_score: number | null
  is_favorite: boolean | null
  created_at: string | null
}

function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    // hz is numeric in Postgres, and node-postgres hands numerics back as
    // strings to avoid precision loss — 7.83 and 221.23 must survive.
    hz: typeof row.hz === 'string' ? Number(row.hz) : row.hz,
    band: row.band,
    viz: row.viz ?? 'frequency',
    plannedSeconds: row.planned_seconds ?? 0,
    elapsedSeconds: row.elapsed_seconds ?? 0,
    status: row.status ?? 'completed',
    beforeScore: row.before_score,
    afterScore: row.after_score,
    favorite: row.is_favorite ?? false,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  }
}

/**
 * Create the session row as soon as playback begins, so a session shows up in
 * history even if the user pauses and walks away (or hits the free-plan
 * paywall) without ever finishing it. Returns the row id, or null when signed
 * out / unconfigured — callers treat null as "not tracking".
 */
export async function startSession(input: {
  hz: number
  band: string
  viz: string
  plannedSeconds: number
  beforeScore: number | null
}): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        hz: input.hz,
        band: input.band,
        viz: input.viz,
        // Infinity is a valid session length in the UI but not a valid number
        // in JSON or Postgres — store 0 and let the UI read it as open-ended.
        planned_seconds: Number.isFinite(input.plannedSeconds) ? Math.round(input.plannedSeconds) : 0,
        elapsed_seconds: 0,
        status: 'in_progress' satisfies SessionStatus,
        before_score: input.beforeScore,
        after_score: null,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id as string
  } catch (err) {
    console.warn('[hzaura] Could not start session:', err)
    return null
  }
}

/** Record progress (on pause, on leaving, on completion). */
export async function updateSessionProgress(
  id: string,
  elapsedSeconds: number,
  status: SessionStatus,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !id) return
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ elapsed_seconds: Math.round(elapsedSeconds), status })
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    console.warn('[hzaura] Could not update session:', err)
  }
}

/** Attach (or change) the user's after-session feedback score. */
export async function rateSession(id: string, afterScore: number): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !id) return
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ after_score: afterScore })
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    console.warn('[hzaura] Could not save feedback:', err)
  }
}

/**
 * Star (or unstar) a session. Returns false when the write was rejected —
 * which is also what happens if the favourites migration hasn't been applied
 * yet, so callers can roll their optimistic update back.
 */
export async function setSessionFavorite(id: string, favorite: boolean): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !id) return false
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ is_favorite: favorite })
      .eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.warn('[hzaura] Could not update favorite:', err)
    return false
  }
}

/** Is this session starred? Used when the studio resumes an existing one. */
export async function getSessionFavorite(id: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !id) return false
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('is_favorite')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return Boolean((data as { is_favorite?: boolean } | null)?.is_favorite)
  } catch {
    return false
  }
}

/**
 * Fetch the signed-in user's sessions, newest first. RLS already restricts
 * rows to the owner; the explicit user_id filter keeps the query index-friendly
 * and makes the intent obvious at the call site.
 */
const BASE_COLUMNS =
  'id, hz, band, viz, planned_seconds, elapsed_seconds, status, before_score, after_score, created_at'

export async function fetchSessions(uid: string): Promise<SessionRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const query = (columns: string) => supabase
    .from('sessions')
    .select(columns)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(300)

  try {
    let { data, error } = await query(`${BASE_COLUMNS}, is_favorite`)
    if (error) {
      // The favourites migration may not have been applied to this project
      // yet. History matters more than the star, so ask again without it.
      console.warn('[hzaura] Retrying history without is_favorite:', error.message)
      ;({ data, error } = await query(BASE_COLUMNS))
    }
    if (error) throw error
    return (data as unknown as SessionRow[]).map(toRecord)
  } catch (err) {
    console.warn('[hzaura] Could not load sessions:', err)
    return []
  }
}
