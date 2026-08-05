'use client'

// Saved session setups ("templates"). Signed-in users get them on their
// account so they follow them between devices; signed-out users still get to
// save — the app works without an account and this shouldn't be the thing that
// breaks that — they just live in this browser.

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

/** Where the current user's presets live — surfaced in the UI so nobody is
 *  surprised when device-local saves don't appear on their phone. */
export type PresetScope = 'account' | 'device'

const LOCAL_KEY = 'hzaura_presets'
const MAX_PRESETS = 40

// ─── Device storage ───────────────────────────────────────────────────────────

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

function writeLocal(list: SessionPreset[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)))
  } catch { /* private browsing / quota — the session itself still works */ }
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
 * The saved setups for whoever is here, plus save/remove. `presets` is null
 * while loading so the UI can hold its shape instead of flashing an empty
 * state at every signed-in user on first paint.
 */
export function useSessionPresets() {
  const user = useAuthUser()
  const scope: PresetScope = user ? 'account' : 'device'
  const [presets, setPresets] = useState<SessionPreset[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return   // auth still resolving
    let cancelled = false

    if (!user) { setPresets(readLocal()); return }

    const supabase = getSupabase()
    if (!supabase) { setPresets(readLocal()); return }

    supabase
      .from('session_presets')
      .select('id, name, hz, band, viz, minutes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_PRESETS)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setPresets([]); setError('Could not load your saved sessions.'); return }
        setPresets((data as PresetRow[]).map(toPreset))
      })

    return () => { cancelled = true }
  }, [user])

  const save = useCallback(async (input: PresetInput): Promise<boolean> => {
    setError(null)
    const name = input.name.trim().slice(0, 60) || `${input.hz} Hz session`
    const supabase = user ? getSupabase() : null

    if (user && supabase) {
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
        .select('id, name, hz, band, viz, minutes, created_at')
        .single()
      if (err) { setError('Could not save that setup. Please try again.'); return false }
      setPresets(list => [toPreset(data as PresetRow), ...(list ?? [])])
      return true
    }

    const preset: SessionPreset = {
      ...input,
      name,
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      createdAt: new Date(),
    }
    setPresets(list => {
      const next = [preset, ...(list ?? [])].slice(0, MAX_PRESETS)
      writeLocal(next)
      return next
    })
    return true
  }, [user])

  const remove = useCallback(async (id: string) => {
    setPresets(list => {
      const next = (list ?? []).filter(p => p.id !== id)
      if (!user) writeLocal(next)
      return next
    })
    if (!user) return
    const supabase = getSupabase()
    await supabase?.from('session_presets').delete().eq('id', id)
  }, [user])

  return { presets, scope, error, save, remove, ready: user !== undefined }
}
