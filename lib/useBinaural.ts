'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A two-oscillator binaural graph for the homepage demos.
 *
 *   oscL ─ gL ─┬──────────────► merger[0]  (left ear)
 *              └─ xL (0…1) ───► merger[1]
 *   oscR ─ gR ─┬──────────────► merger[1]  (right ear)
 *              └─ xR (0…1) ───► merger[0]
 *
 * The cross-links are what make the science demonstrable. At 0 each ear gets
 * exactly one tone, so the beat only ever exists as a neural percept — that is
 * a binaural beat. Ramp them to 1 and both tones reach both ears already summed,
 * which is what loudspeakers do in the air: the beat becomes an ordinary
 * amplitude modulation you could record with a microphone. Same two tones, two
 * completely different phenomena, and the user can A/B them.
 */

/** Per-oscillator gain. Two summed sines peak at double, so this stays low. */
const TONE_GAIN = 0.11
const FADE = 0.5

type Mode = 'binaural' | 'monaural'

export interface BinauralControls {
  playing: boolean
  /** Live analyser for visualisers. Null while stopped. */
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  start: (carrierHz: number, beatHz: number, mode?: Mode) => void
  stop: () => void
  toggle: (carrierHz: number, beatHz: number, mode?: Mode) => void
  /** Retune without restarting — glides, so switching bands stays seamless. */
  setTones: (carrierHz: number, beatHz: number) => void
  setMode: (mode: Mode) => void
}

export function useBinaural(): BinauralControls {
  const ctxRef      = useRef<AudioContext | null>(null)
  const oscLRef     = useRef<OscillatorNode | null>(null)
  const oscRRef     = useRef<OscillatorNode | null>(null)
  const xLRef       = useRef<GainNode | null>(null)
  const xRRef       = useRef<GainNode | null>(null)
  const masterRef   = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [playing, setPlaying] = useState(false)

  const teardown = useCallback(() => {
    const ctx = ctxRef.current
    const master = masterRef.current
    const oscL = oscLRef.current
    const oscR = oscRRef.current
    if (!ctx || !master) return

    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + FADE)

    // Let the fade finish before the oscillators go, or it clicks.
    try { oscL?.stop(now + FADE + 0.02) } catch { /* already stopped */ }
    try { oscR?.stop(now + FADE + 0.02) } catch { /* already stopped */ }

    oscLRef.current = null
    oscRRef.current = null
    xLRef.current   = null
    xRRef.current   = null
    masterRef.current = null
    analyserRef.current = null
  }, [])

  const start = useCallback((carrierHz: number, beatHz: number, mode: Mode = 'binaural') => {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined
    if (!AudioCtx) return

    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    const ctx = ctxRef.current
    // Browsers hand back a suspended context until a gesture unlocks it.
    if (ctx.state === 'suspended') void ctx.resume()

    if (oscLRef.current) teardown()

    const now = ctx.currentTime
    const cross = mode === 'monaural' ? 1 : 0

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(1, now + FADE)

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.75

    const merger = ctx.createChannelMerger(2)

    const oscL = ctx.createOscillator()
    oscL.type = 'sine'
    oscL.frequency.setValueAtTime(carrierHz, now)
    const gL = ctx.createGain()
    gL.gain.value = TONE_GAIN
    const xL = ctx.createGain()
    xL.gain.setValueAtTime(cross, now)

    const oscR = ctx.createOscillator()
    oscR.type = 'sine'
    oscR.frequency.setValueAtTime(carrierHz + beatHz, now)
    const gR = ctx.createGain()
    gR.gain.value = TONE_GAIN
    const xR = ctx.createGain()
    xR.gain.setValueAtTime(cross, now)

    oscL.connect(gL)
    gL.connect(merger, 0, 0)
    gL.connect(xL)
    xL.connect(merger, 0, 1)

    oscR.connect(gR)
    gR.connect(merger, 0, 1)
    gR.connect(xR)
    xR.connect(merger, 0, 0)

    merger.connect(master)
    master.connect(analyser)
    analyser.connect(ctx.destination)

    oscL.start(now)
    oscR.start(now)

    oscLRef.current   = oscL
    oscRRef.current   = oscR
    xLRef.current     = xL
    xRRef.current     = xR
    masterRef.current = master
    analyserRef.current = analyser
    setPlaying(true)
  }, [teardown])

  const stop = useCallback(() => {
    teardown()
    setPlaying(false)
  }, [teardown])

  const toggle = useCallback((carrierHz: number, beatHz: number, mode: Mode = 'binaural') => {
    if (oscLRef.current) stop()
    else start(carrierHz, beatHz, mode)
  }, [start, stop])

  const setTones = useCallback((carrierHz: number, beatHz: number) => {
    const ctx = ctxRef.current
    if (!ctx || !oscLRef.current || !oscRRef.current) return
    const to = ctx.currentTime + 0.35
    oscLRef.current.frequency.linearRampToValueAtTime(carrierHz, to)
    oscRRef.current.frequency.linearRampToValueAtTime(carrierHz + beatHz, to)
  }, [])

  const setMode = useCallback((mode: Mode) => {
    const ctx = ctxRef.current
    if (!ctx || !xLRef.current || !xRRef.current) return
    const target = mode === 'monaural' ? 1 : 0
    const to = ctx.currentTime + 0.3
    xLRef.current.gain.linearRampToValueAtTime(target, to)
    xRRef.current.gain.linearRampToValueAtTime(target, to)
  }, [])

  // Leaving the page must never leave a tone running.
  useEffect(() => () => {
    teardown()
    void ctxRef.current?.close()
    ctxRef.current = null
  }, [teardown])

  return { playing, analyserRef, start, stop, toggle, setTones, setMode }
}
