'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BinauralBand, BINAURAL_PRESETS, FREQUENCIES } from '@/lib/frequencies'
import { createClient } from '@/lib/supabase/client'
import type { QuestionnaireAnswers } from '@/lib/recommendation'
import dynamic from 'next/dynamic'

const ThreeVisualizer = dynamic(() => import('./ThreeVisualizer'), { ssr: false })

interface Props {
  hz: number
  binauralBand: BinauralBand
  duration: number        // minutes; 9999 = open
  secondaryHz?: number   // runner-up undertone layer
  answers?: QuestionnaireAnswers
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'done'

// Binaural band metadata for the adjust panel
const BAND_META: Record<BinauralBand, { label: string; hz: string; state: string; symbol: string }> = {
  delta: { label: 'Delta',  hz: '1–4 Hz',   state: 'Deep sleep & healing',                   symbol: 'δ' },
  theta: { label: 'Theta',  hz: '4–8 Hz',   state: 'Deep meditation & emotional processing', symbol: 'θ' },
  alpha: { label: 'Alpha',  hz: '8–12 Hz',  state: 'Calm wakefulness & stress relief',       symbol: 'α' },
  beta:  { label: 'Beta',   hz: '14–30 Hz', state: 'Alert concentration',                    symbol: 'β' },
  gamma: { label: 'Gamma',  hz: '35–45 Hz', state: 'Peak cognition & high performance',      symbol: 'γ' },
}

// Infer pre-session wellbeing score (1–5) from Q1 answer
function inferBeforeScore(ans: QuestionnaireAnswers | undefined): number {
  if (!ans) return 3
  const map: Record<string, number> = {
    anxious: 2, exhausted: 2, in_pain: 2,
    unfocused: 3, disconnected: 2, sad_heavy: 2,
    calm_seeking: 4,
  }
  return map[ans.currentFeeling] ?? 3
}

// Save session record to Supabase (fire-and-forget; guests are skipped)
async function saveSession(
  hz: number,
  band: BinauralBand,
  durationSecs: number,
  ans: QuestionnaireAnswers | undefined,
  beforeScore: number,
  afterScore: number,
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('sessions').insert({
      user_id: user.id,
      hz,
      binaural_band: band,
      duration_seconds: durationSecs,
      answers: ans ?? null,
      before_score: beforeScore,
      after_score: afterScore,
    })
  } catch { /* non-critical — session logging never blocks UX */ }
}

// Synthesize a gentle Tibetan bowl end-chime
function playEndChime(ctx: AudioContext, baseHz: number) {
  const partials = [
    { freq: baseHz,          gain: 0.3,  decay: 5.5 },
    { freq: baseHz * 2.756, gain: 0.15, decay: 3.8 },
    { freq: baseHz * 5.31,  gain: 0.06, decay: 2.2 },
  ]
  partials.forEach(({ freq, gain, decay }) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = Math.min(freq, 6000)
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay)
    osc.connect(env)
    env.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + decay + 0.1)
  })
}

// Post-session feeling options
const RATING_OPTIONS = [
  { score: 1, emoji: '😞', label: 'Worse' },
  { score: 2, emoji: '😕', label: 'Bit worse' },
  { score: 3, emoji: '😐', label: 'Same' },
  { score: 4, emoji: '🙂', label: 'Better' },
  { score: 5, emoji: '😊', label: 'Much better' },
]

// ─── Component ─────────────────────────────────────────────────────────────
export default function FrequencyStudio({ hz, binauralBand: initialBand, duration, secondaryHz, answers }: Props) {
  const frequency = FREQUENCIES[hz]

  // ── Persistent audio graph refs ──────────────────────────────────────────
  const audioCtxRef       = useRef<AudioContext | null>(null)
  const analyserRef       = useRef<AnalyserNode | null>(null)
  const masterGainRef     = useRef<GainNode | null>(null)
  const oscBaseRef        = useRef<OscillatorNode | null>(null)
  const oscSecondaryRef   = useRef<OscillatorNode | null>(null)
  const oscLeftRef        = useRef<OscillatorNode | null>(null)
  const oscRightRef       = useRef<OscillatorNode | null>(null)
  const schumannLRef      = useRef<OscillatorNode | null>(null)
  const schumannRRef      = useRef<OscillatorNode | null>(null)
  const schumannGainRef   = useRef<GainNode | null>(null)
  const schumannLFORef    = useRef<OscillatorNode | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [playerState, setPlayerState]   = useState<PlayerState>('idle')
  const [volume, setVolume]             = useState(0.65)
  const [elapsed, setElapsed]           = useState(0)
  const [activeBand, setActiveBand]     = useState<BinauralBand>(initialBand)
  const [schumannOn, setSchumannOn]     = useState(false)
  const [showInfo, setShowInfo]         = useState(false)
  const [showAdjust, setShowAdjust]     = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  // Post-session rating state: null = not yet rated, number = rating given, -1 = skipped
  const [afterScore, setAfterScore]     = useState<number | null>(null)
  const [rated, setRated]               = useState(false)

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef  = useRef<number>(0)
  const audioReadyRef = useRef(false)
  const elapsedAtEnd  = useRef(0)  // captures elapsed seconds at session end

  const totalSeconds = duration === 9999 ? Infinity : duration * 60
  const binaural = BINAURAL_PRESETS[activeBand]

  // ── Build persistent audio graph ─────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioReadyRef.current) return
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    audioReadyRef.current = true

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0
    masterGainRef.current = masterGain
    masterGain.connect(analyser)
    analyser.connect(ctx.destination)

    // 1. Solfeggio base
    const base = ctx.createOscillator()
    base.type = 'sine'
    base.frequency.value = hz
    const baseGain = ctx.createGain()
    baseGain.gain.value = 0.45
    base.connect(baseGain)
    baseGain.connect(masterGain)
    oscBaseRef.current = base
    base.start()

    // 2. Binaural stereo pair
    const merger = ctx.createChannelMerger(2)
    merger.connect(masterGain)

    const carrier = BINAURAL_PRESETS[initialBand].carrierHz
    const beat    = BINAURAL_PRESETS[initialBand].hz

    const oscL = ctx.createOscillator()
    oscL.type = 'sine'
    oscL.frequency.value = carrier
    const gainL = ctx.createGain()
    gainL.gain.value = 0.3
    oscL.connect(gainL)
    gainL.connect(merger, 0, 0)
    oscLeftRef.current = oscL
    oscL.start()

    const oscR = ctx.createOscillator()
    oscR.type = 'sine'
    oscR.frequency.value = carrier + beat
    const gainR = ctx.createGain()
    gainR.gain.value = 0.3
    oscR.connect(gainR)
    gainR.connect(merger, 0, 1)
    oscRightRef.current = oscR
    oscR.start()

    // 3. Secondary undertone (runner-up frequency)
    if (secondaryHz && secondaryHz !== hz) {
      const oscSec = ctx.createOscillator()
      oscSec.type = 'sine'
      oscSec.frequency.value = secondaryHz
      const secGain = ctx.createGain()
      secGain.gain.value = 0.07
      oscSec.connect(secGain)
      secGain.connect(masterGain)
      oscSec.start()
      oscSecondaryRef.current = oscSec
    }

    // 4. Schumann resonance layer (7.83 Hz binaural + LFO pulse)
    const schumannGain = ctx.createGain()
    schumannGain.gain.value = 0
    schumannGainRef.current = schumannGain
    schumannGain.connect(masterGain)

    const schumannMerger = ctx.createChannelMerger(2)
    schumannMerger.connect(schumannGain)

    const schumannL = ctx.createOscillator()
    schumannL.type = 'sine'
    schumannL.frequency.value = 100
    const sgL = ctx.createGain()
    sgL.gain.value = 0.5
    schumannL.connect(sgL)
    sgL.connect(schumannMerger, 0, 0)
    schumannLRef.current = schumannL
    schumannL.start()

    const schumannR = ctx.createOscillator()
    schumannR.type = 'sine'
    schumannR.frequency.value = 107.83
    const sgR = ctx.createGain()
    sgR.gain.value = 0.5
    schumannR.connect(sgR)
    sgR.connect(schumannMerger, 0, 1)
    schumannRRef.current = schumannR
    schumannR.start()

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 7.83
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.04
    lfo.connect(lfoGain)
    lfoGain.connect(schumannGain.gain)
    schumannLFORef.current = lfo
    lfo.start()

    // Fade in
    masterGain.gain.setValueAtTime(0, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, secondaryHz, initialBand])

  const muteAudio = useCallback(() => {
    const ctx = audioCtxRef.current
    const gain = masterGainRef.current
    if (!ctx || !gain) return
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
  }, [])

  const unmuteAudio = useCallback((toVolume: number) => {
    const ctx = audioCtxRef.current
    const gain = masterGainRef.current
    if (!ctx || !gain) return
    if (ctx.state === 'suspended') ctx.resume()
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(toVolume, ctx.currentTime + 1.2)
  }, [])

  const closeAudio = useCallback((fade = true) => {
    const ctx = audioCtxRef.current
    const gain = masterGainRef.current
    if (!ctx) return

    const destroy = () => {
      try {
        oscBaseRef.current?.stop();      oscBaseRef.current = null
        oscLeftRef.current?.stop();      oscLeftRef.current = null
        oscRightRef.current?.stop();     oscRightRef.current = null
        oscSecondaryRef.current?.stop(); oscSecondaryRef.current = null
        schumannLRef.current?.stop();    schumannLRef.current = null
        schumannRRef.current?.stop();    schumannRRef.current = null
        schumannLFORef.current?.stop();  schumannLFORef.current = null
        ctx.close()
      } catch { /* already closed */ }
      audioCtxRef.current = null
      audioReadyRef.current = false
    }

    if (fade && gain) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
      setTimeout(destroy, 950)
    } else {
      destroy()
    }
  }, [])

  // Volume live change
  useEffect(() => {
    const ctx = audioCtxRef.current
    const gain = masterGainRef.current
    if (!ctx || !gain || playerState !== 'playing') return
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.15)
  }, [volume, playerState])

  // Live binaural band switch
  useEffect(() => {
    const ctx = audioCtxRef.current
    if (!ctx || !oscLeftRef.current || !oscRightRef.current) return
    const preset = BINAURAL_PRESETS[activeBand]
    const now = ctx.currentTime
    oscLeftRef.current.frequency.linearRampToValueAtTime(preset.carrierHz, now + 2)
    oscRightRef.current.frequency.linearRampToValueAtTime(preset.carrierHz + preset.hz, now + 2)
  }, [activeBand])

  // Live Schumann toggle
  useEffect(() => {
    const ctx = audioCtxRef.current
    const gain = schumannGainRef.current
    if (!ctx || !gain) return
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(schumannOn ? 0.12 : 0, now + 1.5)
  }, [schumannOn])

  // Session timer
  useEffect(() => {
    if (playerState === 'playing') {
      startTimeRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsed(secs)
        if (secs >= totalSeconds) {
          elapsedAtEnd.current = secs
          const ctx = audioCtxRef.current
          if (ctx) playEndChime(ctx, hz)
          setTimeout(() => {
            closeAudio(true)
            setPlayerState('done')
            setSessionEnded(true)
          }, 800)
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, totalSeconds])

  useEffect(() => () => { closeAudio(false) }, [closeAudio])

  // ── Playback controls ────────────────────────────────────────────────────
  function play() { initAudio(); setPlayerState('playing') }
  function pause() { muteAudio(); setPlayerState('paused') }
  function resume() { unmuteAudio(volume); setPlayerState('playing') }

  function stop() {
    closeAudio(true)
    setPlayerState('idle')
    setElapsed(0)
    setSessionEnded(false)
    setRated(false)
    setAfterScore(null)
  }

  function switchBand(band: BinauralBand) {
    setActiveBand(band)
    setShowAdjust(false)
  }

  // ── Post-session rating handler ───────────────────────────────────────────
  function handleRate(score: number | null) {
    const finalAfter = score ?? 3  // neutral if skipped
    setAfterScore(finalAfter)
    setRated(true)

    const durationSecs = elapsedAtEnd.current || elapsed
    const beforeScore  = inferBeforeScore(answers)
    saveSession(hz, activeBand, durationSecs, answers, beforeScore, finalAfter)

    // Clear session storage after save
    try { sessionStorage.removeItem('solive_answers') } catch { /* ignore */ }
  }

  // ── Formatting ───────────────────────────────────────────────────────────
  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const timeLeft    = totalSeconds === Infinity ? null : Math.max(0, totalSeconds - elapsed)
  const progressPct = totalSeconds === Infinity ? 0 : Math.min(100, (elapsed / totalSeconds) * 100)
  const band        = BAND_META[activeBand]
  const improvement = afterScore !== null ? afterScore - inferBeforeScore(answers) : 0

  if (!frequency) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Frequency not found</div>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-void)' }}>

      {/* ── 3D Cymatic Visualizer ──────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ flex: '1 1 0', minHeight: '50vh' }}>
        <ThreeVisualizer
          hz={hz}
          isPlaying={playerState === 'playing'}
          analyserRef={analyserRef}
          colorHex={frequency.colorHex}
        />

        {/* Top-left: nav + frequency badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
          <a href="/"
             className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-100"
             style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Solive
          </a>
          <div className="glass px-3 py-2 rounded-xl">
            <p className="text-xs uppercase tracking-wider opacity-70" style={{ color: frequency.colorHex }}>
              {frequency.name}
            </p>
            <p className="text-2xl font-bold" style={{ color: frequency.colorHex }}>
              {hz}<span className="text-sm font-normal opacity-60 ml-0.5">Hz</span>
            </p>
          </div>
        </div>

        {/* Top-right: layer badges */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
          <div className="glass px-2.5 py-1 rounded-lg text-xs" style={{ color: 'var(--text-secondary)' }}>
            {band.symbol} {band.label} · {binaural.hz} Hz
          </div>
          {schumannOn && (
            <div className="glass px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                 style={{ color: '#10b981' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current breathe inline-block" />
              Schumann 7.83 Hz
            </div>
          )}
          {secondaryHz && FREQUENCIES[secondaryHz] && (
            <div className="glass px-2.5 py-1 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>
              +{secondaryHz} Hz undertone
            </div>
          )}
          <button onClick={() => { setShowInfo(v => !v); setShowAdjust(false) }}
                  className="glass px-2.5 py-1 rounded-lg text-xs hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}>
            {showInfo ? 'Close' : 'About'}
          </button>
        </div>

        {/* About overlay */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-x-4 bottom-4 z-10 glass p-5 rounded-2xl"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{frequency.name}</h3>
                  <p className="text-xs" style={{ color: frequency.colorHex }}>{frequency.tagline}</p>
                </div>
                <button onClick={() => setShowInfo(false)} className="text-lg leading-none"
                        style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                {frequency.description}
              </p>
              <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-muted)' }}>
                {frequency.researchNote}
              </p>
              <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Cymatics: {frequency.cymatics}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Session ended overlay (rating → completion) ─────────────── */}
        <AnimatePresence>
          {sessionEnded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: 'rgba(6,6,14,0.78)', backdropFilter: 'blur(10px)' }}
            >
              <AnimatePresence mode="wait">
                {!rated ? (
                  /* ── Step 1: Rate your feeling ──────────────────────── */
                  <motion.div
                    key="rate"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-center px-6 max-w-xs w-full"
                  >
                    {/* Completion badge */}
                    <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                         style={{ background: `${frequency.colorHex}22`, border: `1px solid ${frequency.colorHex}50` }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                           style={{ color: frequency.colorHex }}>
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <h2 className="text-lg font-bold mb-0.5">Session Complete</h2>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                      {fmt(elapsed)} · {frequency.name} · {band.label}
                    </p>

                    <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
                      How do you feel now?
                    </p>

                    <div className="flex justify-between gap-1.5 mb-5">
                      {RATING_OPTIONS.map(({ score, emoji, label }) => (
                        <motion.button
                          key={score}
                          onClick={() => handleRate(score)}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-xl flex-1 transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <span className="text-xl">{emoji}</span>
                          <span className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                        </motion.button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleRate(null)}
                      className="text-xs transition-opacity hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Skip →
                    </button>
                  </motion.div>
                ) : (
                  /* ── Step 2: Done + improvement delta ───────────────── */
                  <motion.div
                    key="done"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center px-8 max-w-sm w-full"
                  >
                    {afterScore !== null && afterScore > 0 && (
                      <div className="text-5xl mb-4">
                        {improvement > 1 ? '🌟' : improvement === 1 ? '🙂' : improvement === 0 ? '🎵' : '💙'}
                      </div>
                    )}

                    <h2 className="text-xl font-bold mb-1">
                      {improvement > 0
                        ? `Feeling ${improvement === 1 ? 'a bit' : improvement >= 3 ? 'much' : ''} better`
                        : improvement < 0 ? 'That was hard — rest helps'
                        : 'Session complete'}
                    </h2>

                    {afterScore !== null && afterScore > 0 && improvement !== 0 && (
                      <div className="flex items-center justify-center gap-2 my-3">
                        <span className="text-2xl font-bold tabular-nums"
                              style={{ color: improvement > 0 ? '#10b981' : '#ef4444' }}>
                          {improvement > 0 ? `+${improvement}` : improvement}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>wellbeing score</span>
                      </div>
                    )}

                    <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(elapsed)} · {frequency.name} · {band.label} binaural
                    </p>

                    <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                      <a href="/session" className="btn-primary text-center w-full"
                         style={{ background: frequency.colorHex, color: '#000' }}>
                        New Session
                      </a>
                      <a href="/history" className="btn-ghost text-center w-full text-sm">
                        View History
                      </a>
                      <button onClick={() => { setSessionEnded(false); stop() }}
                              className="text-xs py-1 transition-opacity hover:opacity-80"
                              style={{ color: 'var(--text-muted)' }}>
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-5 safe-bottom relative"
           style={{ background: 'rgba(6,6,14,0.94)', backdropFilter: 'blur(24px)',
                    borderTop: '1px solid var(--border)' }}>

        {/* Session timer progress */}
        {totalSeconds !== Infinity && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>{fmt(elapsed)}</span>
              <span style={{ color: frequency.colorHex }}>
                {timeLeft !== null ? `−${fmt(timeLeft)}` : ''}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill"
                   style={{ width: `${progressPct}%`, background: frequency.colorHex,
                            boxShadow: `0 0 10px ${frequency.colorHex}70` }} />
            </div>
          </div>
        )}

        {/* Effect tags */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {frequency.effects.map(e => (
            <span key={e} className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: `${frequency.colorHex}13`, color: frequency.colorHex,
                           border: `1px solid ${frequency.colorHex}30` }}>
              {e}
            </span>
          ))}
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3 mb-4">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
          </svg>
          <input type="range" min={0} max={1} step={0.01} value={volume}
                 onChange={e => setVolume(Number(e.target.value))}
                 style={{ ['--accent' as string]: frequency.colorHex,
                          ['--accent-glow' as string]: `${frequency.colorHex}40` }} />
          <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Playback row */}
        <div className="flex items-center justify-between">

          {/* Adjust */}
          <button
            onClick={() => { setShowAdjust(v => !v); setShowInfo(false) }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
            style={{ background: showAdjust ? 'rgba(255,255,255,0.07)' : 'transparent',
                     color: showAdjust ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" />
            </svg>
            <span className="text-xs">Adjust</span>
          </button>

          {/* Stop + Play/Pause */}
          <div className="flex items-center gap-4">
            {(playerState === 'playing' || playerState === 'paused') && (
              <button onClick={stop}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:opacity-75"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"
                     style={{ color: 'var(--text-muted)' }}>
                  <rect x="4" y="4" width="16" height="16" rx="2.5" />
                </svg>
              </button>
            )}

            <button
              onClick={playerState === 'playing' ? pause : playerState === 'paused' ? resume : play}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
              style={{
                background: frequency.colorHex,
                boxShadow: playerState === 'playing'
                  ? `0 0 40px ${frequency.colorHex}80, 0 0 80px ${frequency.colorHex}30`
                  : `0 0 20px ${frequency.colorHex}50`,
              }}>
              {playerState === 'playing' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              )}
            </button>
          </div>

          {/* Headphones indicator */}
          <div className="flex flex-col items-center gap-1 px-4 py-2"
               style={{ color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span className="text-xs">Required</span>
          </div>
        </div>
      </div>

      {/* ── Adjust Session bottom sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {showAdjust && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowAdjust(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 px-5 pt-5 pb-8 safe-bottom"
              style={{ background: '#0d0d1a', borderTop: '1px solid rgba(255,255,255,0.1)',
                       borderRadius: '24px 24px 0 0' }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <h3 className="font-semibold mb-1 text-center">Adjust Session</h3>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
                Changes apply live — oscillators ramp smoothly
              </p>

              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Binaural Band</p>
              <div className="space-y-2 mb-6">
                {(Object.keys(BAND_META) as BinauralBand[]).map(b => {
                  const m = BAND_META[b]
                  const active = activeBand === b
                  return (
                    <button key={b} onClick={() => switchBand(b)}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
                            style={{
                              background: active ? `${frequency.colorHex}18` : 'rgba(255,255,255,0.04)',
                              border: `1.5px solid ${active ? frequency.colorHex + '60' : 'rgba(255,255,255,0.07)'}`,
                            }}>
                      <span className="text-base w-6 text-center font-bold"
                            style={{ color: active ? frequency.colorHex : 'var(--text-muted)' }}>
                        {m.symbol}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{m.label} <span className="text-xs font-normal"
                             style={{ color: 'var(--text-muted)' }}>{m.hz}</span></p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.state}</p>
                      </div>
                      {active && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center"
                             style={{ background: frequency.colorHex }}>
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Schumann toggle */}
              <div className="flex items-start gap-4 px-4 py-4 rounded-xl"
                   style={{ background: schumannOn ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${schumannOn ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Schumann Resonance</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>7.83 Hz</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {"Earth's natural electromagnetic frequency. Binaural beat + 7.83 Hz LFO amplitude modulation. Adds a grounding \u2018breathing\u2019 pulse."}
                  </p>
                </div>
                <button
                  onClick={() => setSchumannOn(v => !v)}
                  className="flex-shrink-0 w-12 h-6 rounded-full transition-all relative mt-0.5"
                  style={{ background: schumannOn ? '#10b981' : 'rgba(255,255,255,0.15)' }}>
                  <motion.div
                    animate={{ x: schumannOn ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute top-1 w-4 h-4 rounded-full"
                    style={{ background: '#fff' }}
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
