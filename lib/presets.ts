'use client'

// Saved session setups ("templates"). They live on the account: a saved setup
// that only exists in one browser is a promise the app can't keep, and being
// told "saved" while signed out is worse than being asked to sign in. Anything
// already saved on a device is migrated up the first time its owner signs in.

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from './supabase/client'
import { useAuthUser } from './supabase/sessions'
import type { BinauralBand } from './frequencies'

export type PresetViz = 'brain' | 'aura' | 'frequency'

export interface SessionPreset {
  id: string
  name: string
  hz: number
  band: BinauralBand
  viz: PresetViz
  /** Session length in minutes; 9999 means open-ended. */
  minutes: number
  createdAt: Date
}

export type PresetInput = Omit<SessionPreset, 'id' | 'createdAt'>

const LOCAL_KEY = 'hzaura_presets'
const MAX_PRESETS = 40
const COLUMNS = 'id, name, hz, band, viz, minutes, created_at'

// ─── Device leftovers ─────────────────────────────────────────────────────────
// Saving to the browser is gone, but setups saved before that are not: they are
// lifted onto the account the first time their owner signs in.

interface StoredPreset extends Omit<SessionPreset, 'createdAt'> { createdAt: string }

function readLocal(): SessionPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredPreset[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(p => ({ ...p, createdAt: new Date(p.createdAt) }))
  } catch {
    return []
  }
}

function clearLocal() {
  try { window.localStorage.removeItem(LOCAL_KEY) } catch { /* private browsing */ }
}

// ─── Account storage ──────────────────────────────────────────────────────────

interface PresetRow {
  id: string
  name: string
  hz: number | string
  band: string
  viz: string | null
  minutes: number | null
  created_at: string | null
}

function toPreset(row: PresetRow): SessionPreset {
  return {
    id: row.id,
    name: row.name,
    // numeric comes back as a string so 7.83 and 136.1 survive the round trip
    hz: typeof row.hz === 'string' ? Number(row.hz) : row.hz,
    band: row.band as BinauralBand,
    viz: (row.viz ?? 'frequency') as PresetViz,
    minutes: row.minutes ?? 30,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * The signed-in user's saved setups, plus save/remove. `presets` is null while
 * loading so the UI can hold its shape instead of flashing an empty state at
 * every signed-in user on first paint. `signedIn` is false for a visitor, and
 * callers send them to sign in rather than calling `save`.
 */
export function useSessionPresets() {
  const user = useAuthUser()
  const [presets, setPresets] = useState<SessionPreset[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return   // auth still resolving
    if (!user) { setPresets([]); return }

    const supabase = getSupabase()
    if (!supabase) { setPresets([]); return }

    let cancelled = false

    ;(async () => {
      // Anything saved on this device before setups moved to the account.
      const leftovers = readLocal()
      if (leftovers.length) {
        const { error: err } = await supabase.from('session_presets').insert(
          leftovers.map(p => ({
            user_id: user.id, name: p.name, hz: p.hz, band: p.band, viz: p.viz, minutes: p.minutes,
          })),
        )
        if (!err) clearLocal()
      }

      const { data, error: err } = await supabase
        .from('session_presets')
        .select(COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_PRESETS)

      if (cancelled) return
      if (err) { setPresets([]); setError('Could not load your saved sessions.'); return }
      setPresets((data as PresetRow[]).map(toPreset))
    })()

    return () => { cancelled = true }
  }, [user])

  const save = useCallback(async (input: PresetInput): Promise<boolean> => {
    setError(null)
    const supabase = user ? getSupabase() : null
    if (!user || !supabase) { setError('Sign in to save a session.'); return false }

    const name = input.name.trim().slice(0, 60) || `${input.hz} Hz session`
    const { data, error: err } = await supabase
      .from('session_presets')
      .insert({
        user_id: user.id,
        name,
        hz: input.hz,
        band: input.band,
        viz: input.viz,
        minutes: input.minutes,
      })
      .select(COLUMNS)
      .single()

    if (err) { setError('Could not save that setup. Please try again.'); return false }
    setPresets(list => [toPreset(data as PresetRow), ...(list ?? [])])
    return true
  }, [user])

  const remove = useCallback(async (id: string) => {
    setPresets(list => (list ?? []).filter(p => p.id !== id))
    const supabase = getSupabase()
    await supabase?.from('session_presets').delete().eq('id', id)
  }, [])

  return {
    presets,
    error,
    save,
    remove,
    signedIn: Boolean(user),
    ready: user !== undefined,
  }
}
