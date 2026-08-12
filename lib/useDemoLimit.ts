'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from './plan'
import { isHomeDemoAvailable, markHomeDemoSpent, PREVIEW_EVENT } from './preview'

/** Long enough to hear a beat form, short enough that it is plainly a taste. */
export const DEMO_SECONDS = 5

/**
 * The cap on the landing page's live audio.
 *
 * The homepage demos exist to prove the effect is real, and five seconds of a
 * 9 Hz beat is enough to do that. Past that a visitor is not being shown
 * something, they are using the product — so the pitch arrives instead.
 *
 * Paid plans are not limited: they have already bought the thing this is
 * advertising, and interrupting them to sell it again would be absurd.
 *
 * The allowance is per demo, not per visitor: the entrainment rail exists to
 * be compared across, so hearing alpha must not lock beta. What it stops is
 * hearing the same one twice.
 */
export function useDemoLimit(stopAudio: () => void, key: string) {
  const { plan } = usePlan()
  const router = useRouter()
  // Guests resolve to 'free', so one check covers both.
  const limited = plan === 'free'

  const [spent, setSpent] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  // Read through a ref so `arm` does not have to be rebuilt every time the
  // parent re-renders its stop handler.
  const stopRef = useRef(stopAudio)
  useEffect(() => { stopRef.current = stopAudio }, [stopAudio])

  useEffect(() => {
    const sync = () => setSpent(limited && !isHomeDemoAvailable(key))
    sync()
    window.addEventListener(PREVIEW_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PREVIEW_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [limited, key])

  const clear = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  /**
   * Call immediately before starting playback. Returns false when the caller
   * must not start at all — the allowance is gone and the visitor is already
   * on their way to the plans.
   */
  const arm = useCallback((): boolean => {
    if (!limited) return true
    if (!isHomeDemoAvailable(key)) {
      setSpent(true)
      router.push('/pricing?from=demo')
      return false
    }
    clear()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined
      stopRef.current()
      // Spend it at the cut, not at the start: a visitor who taps and
      // immediately taps again has not had their five seconds.
      markHomeDemoSpent(key)
      setSpent(true)
      router.push('/pricing?from=demo')
    }, DEMO_SECONDS * 1000)
    return true
  }, [limited, router, clear, key])

  // A timer left running after the component goes would fire a navigation at
  // someone who has scrolled away.
  useEffect(() => clear, [clear])

  return { limited, spent, arm, clear }
}
