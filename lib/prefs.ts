'use client'

// Session defaults — what the builder should already be set to when you open
// it. Device-local on purpose: these are about the phone in your hand (which
// visual runs well, how long you usually sit), not about your account.

import { useCallback, useEffect, useState } from 'react'
import type { BinauralBand } from './frequencies'
import type { PresetViz } from './presets'

export interface SessionDefaults {
  viz: PresetViz
  /** Minutes; 9999 is the open-ended session. */
  minutes: number
  /** 'suggested' follows the tone's curated pairing. */
  band: BinauralBand | 'suggested'
}

export const DEFAULT_PREFS: SessionDefaults = { viz: 'brain', minutes: 30, band: 'suggested' }

const KEY = 'hzaura_prefs'
const EVT = 'hzaura-prefs-change'

const VIZ: PresetViz[] = ['brain', 'aura', 'frequency']
const BANDS = ['suggested', 'delta', 'theta', 'alpha', 'beta', 'gamma']

export function readPrefs(): SessionDefaults {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<SessionDefaults>
    return {
      viz: VIZ.includes(p.viz as PresetViz) ? p.viz as PresetViz : DEFAULT_PREFS.viz,
      minutes: typeof p.minutes === 'number' && p.minutes >= 1 && p.minutes <= 9999 ? p.minutes : DEFAULT_PREFS.minutes,
      band: BANDS.includes(p.band as string) ? p.band as SessionDefaults['band'] : DEFAULT_PREFS.band,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function writePrefs(next: SessionDefaults) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVT))
  } catch { /* private browsing — the builder just starts from its own defaults */ }
}

/**
 * Reads on mount rather than during render: the server has no localStorage, so
 * starting from the shared defaults is what keeps hydration honest.
 */
export function useSessionDefaults() {
  const [prefs, setPrefs] = useState<SessionDefaults>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(readPrefs())
    setLoaded(true)
    const sync = () => setPrefs(readPrefs())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const update = useCallback((patch: Partial<SessionDefaults>) => {
    setPrefs(current => {
      const next = { ...current, ...patch }
      writePrefs(next)
      return next
    })
  }, [])

  return { prefs, update, loaded }
}
