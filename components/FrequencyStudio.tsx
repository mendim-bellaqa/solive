'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BinauralBand, BINAURAL_PRESETS, FREQUENCIES, getOrCreateFrequency } from '@/lib/frequencies'
import { startSession, updateSessionProgress, rateSession } from '@/lib/firebase/sessions'
import { usePlan, PLANS } from '@/lib/plan'
import type { QuestionnaireAnswers } from '@/lib/recommendation'
import dynamic from 'next/dynamic'

const ThreeVisualizer = dynamic(() => import('./ThreeVisualizer'), { ssr: false })
const Biofield = dynamic(() => import('./Biofield'), { ssr: false })
const NeuralBrain = dynamic(() => import('./NeuralBrain'), { ssr: false })

export type SceneMode = 'brain' | 'aura' | 'frequency'

interface Props {
  hz: number
  binauralBand: BinauralBand
  duration: number
  secondaryHz?: number
  answers?: QuestionnaireAnswers
  initialScene?: SceneMode
  /** Existing session doc to continue writing to (resumed from history). */
  sessionId?: string
  /** Seconds already listened to, when resuming. */
  resumeFrom?: number
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'done'

const BAND_META: Record<BinauralBand, { label: string; hz: string; state: string; symbol: string; color: string }> = {
  delta: { label:'Delta', hz:'1–4 Hz',   state:'Deep sleep & healing',                symbol:'δ', color:'#e8a020' },
  theta: { label:'Theta', hz:'4–8 Hz',   state:'Deep meditation & emotional processing',symbol:'θ', color:'#e05050' },
  alpha: { label:'Alpha', hz:'8–12 Hz',  state:'Calm wakefulness & stress relief',    symbol:'α', color:'#00c896' },
  beta:  { label:'Beta',  hz:'14–30 Hz', state:'Alert concentration',                 symbol:'β', color:'#4a90e8' },
  gamma: { label:'Gamma', hz:'35–45 Hz', state:'Peak cognition & high performance',   symbol:'γ', color:'#b06ef5' },
}

function inferBeforeScore(ans: QuestionnaireAnswers | undefined): number {
  if (!ans) return 3
  const map: Record<string, number> = {
    anxious:2, exhausted:2, in_pain:2, unfocused:3, disconnected:2, sad_heavy:2, calm_seeking:4,
  }
  return map[ans.currentFeeling] ?? 3
}


function playEndChime(ctx: AudioContext, baseHz: number) {
  const partials = [
    { freq:baseHz,         gain:0.3,  decay:5.5 },
    { freq:baseHz*2.756,  gain:0.15, decay:3.8 },
    { freq:baseHz*5.31,   gain:0.06, decay:2.2 },
  ]
  partials.forEach(({ freq, gain, decay }) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = Math.min(freq, 6000)
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay)
    osc.connect(env); env.connect(ctx.destination)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + decay + 0.1)
  })
}

const RATING_OPTIONS = [
  { score:1, emoji:'😞', label:'Worse' },
  { score:2, emoji:'😕', label:'Bit worse' },
  { score:3, emoji:'😐', label:'Same' },
  { score:4, emoji:'🙂', label:'Better' },
  { score:5, emoji:'😊', label:'Much better' },
]

// ─── Component ──────────────────────────────────────────────────────────────
export default function FrequencyStudio({ hz, binauralBand:initialBand, duration, secondaryHz, answers, initialScene = 'frequency', sessionId, resumeFrom = 0 }: Props) {
  const frequency = getOrCreateFrequency(hz)

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

  const [playerState, setPlayerState]     = useState<PlayerState>('idle')
  const [volume, setVolume]               = useState(0.65)
  const [elapsed, setElapsed]             = useState(resumeFrom)
  const [activeBand, setActiveBand]       = useState<BinauralBand>(initialBand)
  const [schumannOn, setSchumannOn]       = useState(false)
  const [showInfo, setShowInfo]           = useState(false)
  const [showAdjust, setShowAdjust]       = useState(false)
  const [sessionEnded, setSessionEnded]   = useState(false)
  const [afterScore, setAfterScore]       = useState<number | null>(null)
  const [rated, setRated]                 = useState(false)
  const [isFullscreen, setIsFullscreen]   = useState(false)
  const [pseudoFs, setPseudoFs]           = useState(false)   // CSS fullscreen fallback (iOS Safari)
  const [vizMode, setVizMode]             = useState<'lissajous' | 'waveform'>('lissajous')
  const [sceneMode, setSceneMode]         = useState<SceneMode>(initialScene)
  const [showPaywall, setShowPaywall]     = useState(false)  // free 30s teaser gate
  const [openingPlan, setOpeningPlan]     = useState<string | null>(null)
  const gatedRef                          = useRef(false)
  const containerRef                      = useRef<HTMLDivElement>(null)

  const timerRef     = useRef<number>(0)           // requestAnimationFrame id
  const startTimeRef = useRef<number>(0)
  const audioReadyRef= useRef(false)
  const elapsedAtEnd = useRef(0)
  const lastTickRef  = useRef(0)                   // last elapsed value rendered
  const barRef       = useRef<HTMLDivElement>(null)
  const scrubbingRef = useRef(false)

  // Firestore session tracking. The doc is created on first play so a session
  // still shows up in history if the user pauses and leaves without finishing.
  const sessionIdRef = useRef<string | null>(sessionId ?? null)
  const elapsedRef   = useRef(resumeFrom)   // readable from cleanup without re-subscribing
  const playerStateRef = useRef<PlayerState>('idle')

  const router = useRouter()
  const { limits } = usePlan()

  // Free-plan gating: cap session length; Brain & Aura are a paid experience
  const requestedMinutes = duration === 9999 ? Infinity : duration
  const cappedMinutes = Math.min(requestedMinutes, limits.maxMinutes)
  const durationCapped = requestedMinutes > limits.maxMinutes
  const totalSeconds = cappedMinutes === Infinity ? Infinity : cappedMinutes * 60
  const vizLocked = !limits.allViz && sceneMode !== 'frequency'
  const previewSeconds = limits.previewSeconds   // Infinity for paid plans

  // Warm the checkout routes while the free preview is still playing, so the
  // paywall's plan links resolve instantly instead of waiting on a slow
  // connection at the exact moment we interrupt the user.
  useEffect(() => {
    if (previewSeconds === Infinity) return
    router.prefetch('/checkout')
    router.prefetch('/pricing')
  }, [previewSeconds, router])

  const binaural = BINAURAL_PRESETS[activeBand]
  const band     = BAND_META[activeBand]

  // ── Audio init ───────────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioReadyRef.current) return
    if (typeof AudioContext === 'undefined' && typeof (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === 'undefined') {
      console.warn('[Solive] Web Audio API not supported')
      return
    }
    const AudioCtx = (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)!
    const ctx = new AudioCtx()
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

    // Base Solfeggio tone
    const base = ctx.createOscillator()
    base.type = 'sine'; base.frequency.value = hz
    const baseGain = ctx.createGain(); baseGain.gain.value = 0.45
    base.connect(baseGain); baseGain.connect(masterGain)
    oscBaseRef.current = base; base.start()

    // Binaural stereo pair
    const merger = ctx.createChannelMerger(2)
    merger.connect(masterGain)
    const carrier = BINAURAL_PRESETS[initialBand].carrierHz
    const beat    = BINAURAL_PRESETS[initialBand].hz

    const oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = carrier
    const gainL = ctx.createGain(); gainL.gain.value = 0.3
    oscL.connect(gainL); gainL.connect(merger, 0, 0)
    oscLeftRef.current = oscL; oscL.start()

    const oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = carrier + beat
    const gainR = ctx.createGain(); gainR.gain.value = 0.3
    oscR.connect(gainR); gainR.connect(merger, 0, 1)
    oscRightRef.current = oscR; oscR.start()

    // Secondary undertone
    if (secondaryHz && secondaryHz !== hz) {
      const oscSec = ctx.createOscillator(); oscSec.type = 'sine'; oscSec.frequency.value = secondaryHz
      const secGain = ctx.createGain(); secGain.gain.value = 0.07
      oscSec.connect(secGain); secGain.connect(masterGain)
      oscSec.start(); oscSecondaryRef.current = oscSec
    }

    // Schumann layer
    const schumannGain = ctx.createGain(); schumannGain.gain.value = 0
    schumannGainRef.current = schumannGain; schumannGain.connect(masterGain)
    const schumannMerger = ctx.createChannelMerger(2)
    schumannMerger.connect(schumannGain)
    const schumannL = ctx.createOscillator(); schumannL.type = 'sine'; schumannL.frequency.value = 100
    const sgL = ctx.createGain(); sgL.gain.value = 0.5
    schumannL.connect(sgL); sgL.connect(schumannMerger, 0, 0)
    schumannLRef.current = schumannL; schumannL.start()
    const schumannR = ctx.createOscillator(); schumannR.type = 'sine'; schumannR.frequency.value = 107.83
    const sgR = ctx.createGain(); sgR.gain.value = 0.5
    schumannR.connect(sgR); sgR.connect(schumannMerger, 0, 1)
    schumannRRef.current = schumannR; schumannR.start()
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 7.83
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.04
    lfo.connect(lfoGain); lfoGain.connect(schumannGain.gain)
    schumannLFORef.current = lfo; lfo.start()

    masterGain.gain.setValueAtTime(0, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, secondaryHz, initialBand])

  const muteAudio = useCallback(() => {
    const ctx = audioCtxRef.current, gain = masterGainRef.current
    if (!ctx || !gain) return
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
  }, [])

  const unmuteAudio = useCallback((toVol: number) => {
    const ctx = audioCtxRef.current, gain = masterGainRef.current
    if (!ctx || !gain) return
    if (ctx.state === 'suspended') ctx.resume()
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(toVol, ctx.currentTime + 1.2)
  }, [])

  const closeAudio = useCallback((fade = true) => {
    const ctx = audioCtxRef.current, gain = masterGainRef.current
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
      audioCtxRef.current = null; audioReadyRef.current = false
    }
    if (fade && gain) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
      setTimeout(destroy, 950)
    } else { destroy() }
  }, [])

  // Volume live change — cancel any in-flight ramp first to prevent glitching
  useEffect(() => {
    const ctx = audioCtxRef.current, gain = masterGainRef.current
    if (!ctx || !gain || playerState !== 'playing') return
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.08)
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

  // Schumann toggle
  useEffect(() => {
    const ctx = audioCtxRef.current, gain = schumannGainRef.current
    if (!ctx || !gain) return
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(schumannOn ? 0.12 : 0, now + 1.5)
  }, [schumannOn])

  // Session timer — RAF-based, only updates state when the second changes
  useEffect(() => {
    if (playerState !== 'playing') {
      cancelAnimationFrame(timerRef.current)
      return
    }
    startTimeRef.current = Date.now() - elapsed * 1000

    function tick() {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (secs !== lastTickRef.current) {
        lastTickRef.current = secs
        setElapsed(secs)
        elapsedRef.current = secs
        // Free-plan teaser: cut the sound at the preview limit and show the paywall.
        if (secs >= previewSeconds && !gatedRef.current) {
          gatedRef.current = true
          muteAudio()
          setPlayerState('paused')
          setShowPaywall(true)
          saveProgress('in_progress')
          return // stop loop
        }
        if (secs >= totalSeconds) {
          elapsedAtEnd.current = secs
          const ctx = audioCtxRef.current
          if (ctx) { try { playEndChime(ctx, hz) } catch { /* ignore */ } }
          saveProgress('completed')
          setTimeout(() => {
            closeAudio(true)
            setPlayerState('done')
            setSessionEnded(true)
          }, 800)
          return // stop loop
        }
      }
      timerRef.current = requestAnimationFrame(tick)
    }
    timerRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, totalSeconds])

  // Manual time scrubbing — drag the progress bar to move through the session.
  // Works while playing or paused; the brain-scan dissolve follows the scrubbed time.
  const seekTo = useCallback((secs: number) => {
    if (totalSeconds === Infinity) return
    const clamped = Math.max(0, Math.min(totalSeconds, secs))
    lastTickRef.current = Math.floor(clamped)
    startTimeRef.current = Date.now() - clamped * 1000
    setElapsed(clamped)
    if (playerState === 'done' && clamped < totalSeconds) setSessionEnded(false)
  }, [totalSeconds, playerState])

  const seekFromClientX = useCallback((clientX: number) => {
    const bar = barRef.current
    if (!bar || totalSeconds === Infinity) return
    const rect = bar.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seekTo(frac * totalSeconds)
  }, [seekTo, totalSeconds])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (playerState === 'playing') { muteAudio(); setPlayerState('paused') }
        else if (playerState === 'paused') {
          if (gatedRef.current) { setShowPaywall(true) }
          else { unmuteAudio(volume); setPlayerState('playing') }
        }
        else if (playerState === 'idle') { initAudio(); setPlayerState('playing') }
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault()
        setVolume(v => Math.min(1, Math.round((v + 0.05) * 100) / 100))
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        setVolume(v => Math.max(0, Math.round((v - 0.05) * 100) / 100))
      }
      if (e.code === 'KeyF') {
        e.preventDefault()
        handleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, volume])

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Mirror playerState into a ref so the unmount cleanup can read it.
  useEffect(() => { playerStateRef.current = playerState }, [playerState])

  // Tear down audio on unmount, and flush whatever progress was reached so
  // leaving mid-session (Back, nav, tab close) still lands in history.
  useEffect(() => () => {
    closeAudio(false)
    const id = sessionIdRef.current
    if (id && elapsedRef.current > 0) {
      updateSessionProgress(id, elapsedRef.current, playerStateRef.current === 'done' ? 'completed' : 'in_progress')
    }
  }, [closeAudio])

  // ── Controls ─────────────────────────────────────────────────────────────
  // ── Session tracking ─────────────────────────────────────────────────────
  /** Create the doc on first play; later plays reuse the same id. */
  async function ensureSessionDoc() {
    if (sessionIdRef.current) return
    const id = await startSession({
      hz,
      band: activeBand,
      viz: sceneMode,
      plannedSeconds: totalSeconds === Infinity ? 0 : totalSeconds,
      beforeScore: inferBeforeScore(answers),
    })
    if (id) sessionIdRef.current = id
  }

  function saveProgress(status: 'in_progress' | 'completed') {
    const id = sessionIdRef.current
    if (id) updateSessionProgress(id, elapsedRef.current, status)
  }

  function play()   {
    // Same guard as resume(): once the free preview is spent, starting over
    // must re-open the paywall rather than grant another 30 seconds.
    if (gatedRef.current) { setShowPaywall(true); return }
    try { initAudio() } catch { /* unsupported */ }
    setPlayerState('playing')
    ensureSessionDoc()
  }
  function pause()  { muteAudio(); setPlayerState('paused'); saveProgress('in_progress') }
  function resume() {
    if (gatedRef.current) { setShowPaywall(true); return }  // free teaser used up
    unmuteAudio(volume); setPlayerState('playing')
  }

  function stop() {
    // If meaningful time elapsed, show rating overlay
    if (elapsed >= 60) {
      elapsedAtEnd.current = elapsed
      closeAudio(true)
      setPlayerState('done')
      setSessionEnded(true)
      saveProgress('completed')
    } else {
      saveProgress('in_progress')
      closeAudio(true)
      setPlayerState('idle')
      setElapsed(0)
      setSessionEnded(false)
      setRated(false)
      setAfterScore(null)
      setShowPaywall(false)
      // gatedRef is deliberately NOT reset: on the free plan, restarting from
      // zero would otherwise hand out another 30 seconds every time.
      if (previewSeconds === Infinity) gatedRef.current = false
    }
  }

  // Resize the WebGL canvases after a fullscreen layout change
  function nudgeResize() {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 90)
  }

  function enterPseudoFullscreen() {
    setPseudoFs(true)
    setIsFullscreen(true)
    // Best-effort landscape lock (works on some Android; iOS ignores it)
    try {
      const o = window.screen?.orientation as { lock?: (o: string) => Promise<void> } | undefined
      o?.lock?.('landscape').catch(() => {})
    } catch { /* not supported */ }
    nudgeResize()
  }

  function exitPseudoFullscreen() {
    setPseudoFs(false)
    setIsFullscreen(false)
    try {
      const o = window.screen?.orientation as { unlock?: () => void } | undefined
      o?.unlock?.()
    } catch { /* not supported */ }
    nudgeResize()
  }

  function handleFullscreen() {
    if (!isFullscreen) {
      const el = containerRef.current
      if (el && document.fullscreenEnabled) {
        el.requestFullscreen().catch(() => enterPseudoFullscreen())
      } else {
        enterPseudoFullscreen()   // iOS Safari & anything without the Fullscreen API
      }
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      if (pseudoFs) exitPseudoFullscreen()
    }
  }

  function switchBand(band: BinauralBand) {
    setActiveBand(band)
    setShowAdjust(false)
  }

  function handleRate(score: number | null) {
    const finalAfter = score ?? 3
    setAfterScore(finalAfter)
    setRated(true)
    elapsedRef.current = elapsedAtEnd.current || elapsed
    const id = sessionIdRef.current
    if (id) {
      updateSessionProgress(id, elapsedRef.current, 'completed')
      rateSession(id, finalAfter)
    }
    try { sessionStorage.removeItem('solive_answers') } catch { /* ignore */ }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  }

  const timeLeft    = totalSeconds === Infinity ? null : Math.max(0, totalSeconds - elapsed)
  const progressPct = totalSeconds === Infinity ? 0 : Math.min(100, (elapsed / totalSeconds) * 100)
  const improvement = afterScore !== null ? afterScore - inferBeforeScore(answers) : 0
  const currentDisplayHz = hz

  // getOrCreateFrequency always returns a value — this is just a safety net
  if (!frequency) return null

  return (
    <div ref={containerRef} className="flex flex-col overflow-hidden"
         style={{
           height: '100dvh',
           paddingTop: isFullscreen ? 0 : 'calc(env(safe-area-inset-top) + 64px)',
           paddingBottom: isFullscreen ? 0 : 'env(safe-area-inset-bottom)',
           background:'var(--bg-void)',
         }}>

      {/* ── 3D Visualizer ─────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden studio-visualizer${isFullscreen ? ' viz-fullscreen' : ''}`}
           style={pseudoFs
             ? { position: 'fixed', inset: 0, zIndex: 9998, minHeight: 0, background: 'var(--bg-void)' }
             : { flex: '1 1 0', minHeight: 0 }}>
        {vizLocked ? (
          <div className="absolute inset-0 flex items-center justify-center px-6" style={{ background: 'radial-gradient(circle at 50% 45%, #0a1024, #05050c 75%)' }}>
            <div className="glass-card grain text-center" style={{ padding: '30px 26px', borderRadius: 22, maxWidth: 340 }}>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </div>
                <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--t1)', marginBottom: 6 }}>
                  {sceneMode === 'brain' ? 'Brain' : 'Aura'} is a Plus experience
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--t3)', lineHeight: 1.5, marginBottom: 18 }}>
                  Unlock the Brain and Aura 3D visualizations and unlimited sessions with Plus.
                </p>
                <button onClick={() => router.push('/pricing')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)', color: '#04140f', marginBottom: 8 }}>
                  Upgrade to Plus
                </button>
                <button onClick={() => setSceneMode('frequency')} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  Use Cymatics instead
                </button>
              </div>
            </div>
          </div>
        ) : sceneMode === 'frequency' ? (
          <ThreeVisualizer
            hz={hz}
            isPlaying={playerState === 'playing'}
            analyserRef={analyserRef}
            colorHex={frequency.colorHex}
            vizMode={vizMode}
          />
        ) : sceneMode === 'brain' ? (
          <NeuralBrain
            isPlaying={playerState === 'playing'}
            analyserRef={analyserRef}
            mode="session"
            progress={
              sessionEnded ? 1
              : totalSeconds === Infinity ? Math.min(1, elapsed / 1800)
              : Math.min(1, elapsed / totalSeconds)
            }
          />
        ) : (
          <Biofield
            colorHex={frequency.colorHex}
            isPlaying={playerState === 'playing'}
            analyserRef={analyserRef}
            quality="full"
            interactive
          />
        )}

        {/* ── Top-left: frequency live display ───────────────────────── */}
        <div className="absolute z-10 flex flex-col gap-2"
             style={{ top: isFullscreen ? 'calc(env(safe-area-inset-top) + 12px)' : 12, left: 'calc(env(safe-area-inset-left) + 12px)' }}>
          {/* Live Hz display */}
          <motion.div
            className="glass-card px-3 py-2 rounded-xl min-w-[90px]"
            animate={{ borderColor: `${frequency.colorHex}40` }}
            style={{ border:`1px solid ${frequency.colorHex}30` }}>
            <div className="shimmer-overlay" />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wider opacity-70 mb-0.5" style={{ color:frequency.colorHex }}>
                {frequency.name}
              </p>
              <AnimatePresence mode="wait">
                <motion.p key={currentDisplayHz}
                  initial={{ opacity:0, y:-4 }}
                  animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, y:4 }}
                  className="text-2xl font-bold leading-none" style={{ color:frequency.colorHex }}>
                  {currentDisplayHz}
                  <span className="text-xs font-normal opacity-60 ml-0.5">Hz</span>
                </motion.p>
              </AnimatePresence>
              {/* Live indicator */}
              {playerState === 'playing' && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="live-dot" style={{ background:frequency.colorHex, width:5, height:5 }} />
                  <span className="text-xs opacity-50" style={{ color:frequency.colorHex }}>LIVE</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Top-right: badges ──────────────────────────────────────── */}
        <div className="absolute z-10 flex flex-col items-end gap-1.5"
             style={{ top: isFullscreen ? 'calc(env(safe-area-inset-top) + 12px)' : 12, right: 'calc(env(safe-area-inset-right) + 12px)' }}>
          {/* Binaural band badge */}
          <div className="glass px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs"
               style={{ color: band.color, border:`1px solid ${band.color}25` }}>
            <span className="font-bold">{band.symbol}</span>
            <span>{band.label} · {binaural.hz} Hz</span>
          </div>

          {schumannOn && (
            <div className="glass px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5" style={{ color:'#00c896' }}>
              <span className="live-dot" style={{ background:'#00c896', width:5, height:5 }} />
              Schumann 7.83 Hz
            </div>
          )}
          {secondaryHz && FREQUENCIES[secondaryHz] && (
            <div className="glass px-2.5 py-1 rounded-lg text-xs" style={{ color:'var(--text-muted)' }}>
              +{secondaryHz} Hz undertone
            </div>
          )}

          {/* Scene switcher — Brain / Aura / Frequency */}
          <div className="glass rounded-xl flex items-center p-0.5 gap-0.5" style={{ border: '1px solid var(--border)' }}>
            {([
              { id: 'brain' as SceneMode, title: 'Brain',
                icon: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8A3 3 0 0 0 7 18a2.5 2.5 0 0 0 5 .5V5a2 2 0 0 0-3-1ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8A3 3 0 0 1 17 18a2.5 2.5 0 0 1-5 .5" strokeLinejoin="round"/> },
              { id: 'aura' as SceneMode, title: 'Aura',
                icon: <><circle cx="12" cy="6" r="2"/><path d="M12 8v7M12 15l-3 5M12 15l3 5M8 11h8" strokeLinecap="round"/><ellipse cx="12" cy="12" rx="9" ry="10"/></> },
              { id: 'frequency' as SceneMode, title: 'Cymatics',
                icon: <><path d="M12 3 C18 3 21 8 21 12 C21 16 18 21 12 21 C6 21 3 16 3 12 C3 8 6 3 12 3 Z"/><path d="M6 12 Q9 6 12 12 Q15 18 18 12" strokeLinecap="round"/></> },
            ]).map(s => {
              const active = sceneMode === s.id
              return (
                <button key={s.id} onClick={() => setSceneMode(s.id)} title={s.title}
                  className="rounded-lg px-2 py-1.5 transition-all flex items-center justify-center"
                  style={{
                    background: active ? `${frequency.colorHex}22` : 'transparent',
                    color: active ? frequency.colorHex : 'var(--text-muted)',
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    {s.icon}
                  </svg>
                </button>
              )
            })}
          </div>

          {/* Viz mode toggle (cymatics only) */}
          {sceneMode === 'frequency' && (
            <button onClick={() => setVizMode(v => v === 'lissajous' ? 'waveform' : 'lissajous')}
                    className="glass px-2.5 py-1.5 rounded-xl text-xs hover:opacity-80 transition-opacity flex items-center gap-1.5"
                    style={{ color: 'var(--text-muted)' }}
                    title="Toggle visualization mode">
              {vizMode === 'lissajous' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12 Q5 5 8 12 Q11 19 14 12 Q17 5 20 12 Q23 19 26 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline">Wave</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 C18 3 21 8 21 12 C21 16 18 21 12 21 C6 21 3 16 3 12 C3 8 6 3 12 3 Z" strokeLinecap="round"/>
                    <path d="M8 12 Q10 7 12 12 Q14 17 16 12" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">3D</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={handleFullscreen}
                  className="glass px-2.5 py-1.5 rounded-xl text-xs hover:opacity-80 transition-opacity flex items-center gap-1.5"
                  style={{ color:'var(--text-muted)' }}
                  title="Fullscreen (F)">
            {isFullscreen ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
              </svg>
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>

          <button onClick={() => { setShowInfo(v => !v); setShowAdjust(false) }}
                  className="glass px-2.5 py-1.5 rounded-xl text-xs hover:opacity-80 transition-opacity"
                  style={{ color: showInfo ? frequency.colorHex : 'var(--text-muted)' }}>
            About
          </button>
        </div>

        {/* ── Session ended overlay ──────────────────────────────────── */}
        <AnimatePresence>
          {sessionEnded && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background:'rgba(5,5,12,0.82)', backdropFilter:'blur(12px)' }}>
              <AnimatePresence mode="wait">
                {!rated ? (
                  <motion.div key="rate"
                    initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
                    transition={{ duration:0.25 }}
                    className="text-center px-6 max-w-xs w-full">
                    <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                         style={{ background:`${frequency.colorHex}20`, border:`1px solid ${frequency.colorHex}45` }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color:frequency.colorHex }}>
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold mb-0.5">Session Complete</h2>
                    <p className="text-xs mb-6" style={{ color:'var(--text-muted)' }}>
                      {fmt(elapsed)} · {frequency.name} · {band.label}
                    </p>
                    <p className="text-sm font-medium mb-4" style={{ color:'var(--text-secondary)' }}>
                      How do you feel now?
                    </p>
                    <div className="flex justify-between gap-1.5 mb-5">
                      {RATING_OPTIONS.map(({ score, emoji, label }) => (
                        <motion.button key={score} onClick={() => handleRate(score)}
                          whileHover={{ scale:1.08 }} whileTap={{ scale:0.95 }}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-xl flex-1 transition-all"
                          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                          <span className="text-xl">{emoji}</span>
                          <span className="text-xs leading-tight" style={{ color:'var(--text-muted)' }}>{label}</span>
                        </motion.button>
                      ))}
                    </div>
                    <button onClick={() => handleRate(null)} className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color:'var(--text-muted)' }}>
                      Skip →
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="done"
                    initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
                    transition={{ duration:0.3 }}
                    className="text-center px-8 max-w-sm w-full">
                    {afterScore !== null && afterScore > 0 && (
                      <div className="text-5xl mb-4">
                        {improvement > 1 ? '🌟' : improvement === 1 ? '🙂' : improvement === 0 ? '🎵' : '💙'}
                      </div>
                    )}
                    <h2 className="text-xl font-bold mb-1">
                      {improvement > 0 ? `Feeling ${improvement >= 3 ? 'much' : improvement === 1 ? 'a bit' : ''} better` : improvement < 0 ? 'That was hard — rest helps' : 'Session complete'}
                    </h2>
                    {afterScore !== null && afterScore > 0 && improvement !== 0 && (
                      <div className="flex items-center justify-center gap-2 my-3">
                        <span className="text-2xl font-bold tabular-nums"
                              style={{ color: improvement > 0 ? '#00c896' : '#e05050' }}>
                          {improvement > 0 ? `+${improvement}` : improvement}
                        </span>
                        <span className="text-sm" style={{ color:'var(--text-muted)' }}>wellbeing score</span>
                      </div>
                    )}
                    <p className="text-sm mb-7" style={{ color:'var(--text-secondary)' }}>
                      {fmt(elapsed)} · {frequency.name} · {band.label} binaural
                    </p>
                    <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                      <a href="/session" className="btn-primary text-center w-full"
                         style={{ background:frequency.colorHex, color:'#000' }}>New Session</a>
                      <a href="/history" className="btn-ghost text-center w-full text-sm">View History</a>
                      <button onClick={() => { setSessionEnded(false); setPlayerState('idle'); setElapsed(0); setRated(false); setAfterScore(null); gatedRef.current = false; setShowPaywall(false) }}
                              className="text-xs py-1 hover:opacity-80 transition-opacity" style={{ color:'var(--text-muted)' }}>
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen minimal overlay (just play/volume) */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 pt-6"
              style={{ background:'linear-gradient(0deg, rgba(5,5,12,0.7) 0%, transparent 100%)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}>
              {/* Volume */}
              <div className="flex items-center gap-3 w-40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={{ color:'var(--text-muted)', flexShrink:0 }}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                </svg>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                       onChange={e => setVolume(Number(e.target.value))}
                       style={{ ['--accent' as string]:frequency.colorHex, ['--accent-glow' as string]:`${frequency.colorHex}40` }} />
              </div>
              {/* Play/Pause */}
              <button
                onClick={playerState === 'playing' ? pause : playerState === 'paused' ? resume : play}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{ background:frequency.colorHex, boxShadow:`0 0 30px ${frequency.colorHex}70` }}>
                {playerState === 'playing' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </button>
              {/* Exit */}
              <button onClick={handleFullscreen}
                      className="glass px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                      style={{ color:'var(--t1)', fontWeight:600 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls panel (hidden in fullscreen) ─────────────────────── */}
      {!isFullscreen && (
        <div className="flex-shrink-0 px-4 pt-3 pb-4 safe-bottom relative"
             style={{ background:'rgba(5,5,12,0.96)', backdropFilter:'blur(24px)', borderTop:'1px solid var(--border)' }}>

          {/* Free-plan cap notice */}
          {durationCapped && (
            <button onClick={() => router.push('/pricing')} className="mb-2 w-full flex items-center justify-center gap-2 rounded-xl"
                    style={{ padding: '7px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Free plan · {limits.maxMinutes}-min sessions — Upgrade for unlimited →
            </button>
          )}

          {/* Session progress — draggable scrubber */}
          {totalSeconds !== Infinity && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color:'var(--text-muted)' }}>
                <span style={{ fontVariantNumeric:'tabular-nums' }}>{fmt(Math.round(elapsed))}</span>
                <span style={{ color:frequency.colorHex, fontVariantNumeric:'tabular-nums' }}>{timeLeft !== null ? `−${fmt(Math.round(timeLeft))}` : ''}</span>
              </div>
              <div
                ref={barRef}
                role="slider"
                aria-label="Session time"
                aria-valuemin={0}
                aria-valuemax={Math.round(totalSeconds)}
                aria-valuenow={Math.round(elapsed)}
                tabIndex={0}
                onPointerDown={e => {
                  scrubbingRef.current = true
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  seekFromClientX(e.clientX)
                }}
                onPointerMove={e => { if (scrubbingRef.current) seekFromClientX(e.clientX) }}
                onPointerUp={e => {
                  scrubbingRef.current = false
                  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                }}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft')  { e.preventDefault(); seekTo(elapsed - (e.shiftKey ? 60 : 10)) }
                  if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(elapsed + (e.shiftKey ? 60 : 10)) }
                }}
                style={{ position:'relative', padding:'8px 0', cursor:'pointer', touchAction:'none' }}
              >
                <div className="progress-bar">
                  <div className="progress-fill"
                       style={{ width:`${progressPct}%`, background:frequency.colorHex, boxShadow:`0 0 10px ${frequency.colorHex}70` }} />
                </div>
                {/* Draggable knob */}
                <div
                  style={{
                    position:'absolute', top:'50%', left:`${progressPct}%`,
                    width:14, height:14, borderRadius:'50%',
                    transform:'translate(-50%, -50%)',
                    background:'#fff', border:`2px solid ${frequency.colorHex}`,
                    boxShadow:`0 0 10px ${frequency.colorHex}, 0 2px 6px rgba(0,0,0,0.5)`,
                    pointerEvents:'none',
                  }}
                />
              </div>
              <p style={{ fontSize:'0.62rem', color:'var(--text-muted)', opacity:0.6, marginTop:2 }}>
                Drag to move through the session
              </p>
            </div>
          )}

          {/* Effect tags */}
          <div className="scroll-row mb-3">
            {frequency.effects.map(e => (
              <span key={e} className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background:`${frequency.colorHex}12`, color:frequency.colorHex, border:`1px solid ${frequency.colorHex}28` }}>
                {e}
              </span>
            ))}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ color:'var(--text-muted)', flexShrink:0 }}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
            </svg>
            <input type="range" min={0} max={1} step={0.01} value={volume}
                   onChange={e => setVolume(Number(e.target.value))}
                   style={{ ['--accent' as string]:frequency.colorHex, ['--accent-glow' as string]:`${frequency.colorHex}40` }} />
            <span className="text-xs w-8 text-right flex-shrink-0" style={{ color:'var(--text-muted)' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Playback row — 3 equal columns keep the play button dead-centre */}
          <div className="flex items-center">

            {/* Left column — justify-end so Back & Adjust sit right beside the
                play controls instead of stranded at the far edge */}
            <div className="flex items-center justify-end flex-1 gap-1">
              {/* Back */}
              <button onClick={() => router.back()}
                      aria-label="Go back"
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[52px] hover:bg-white/[0.06]"
                      style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs">Back</span>
              </button>

              {/* Adjust */}
              <button onClick={() => { setShowAdjust(v => !v); setShowInfo(false) }}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[52px]"
                      style={{
                        background: showAdjust ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: showAdjust ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" />
                </svg>
                <span className="text-xs">Adjust</span>
              </button>
            </div>

            {/* Stop + Play/Pause */}
            <div className="flex items-center gap-3 flex-none">
              {(playerState === 'playing' || playerState === 'paused') && (
                <button onClick={stop}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-75"
                        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color:'var(--text-muted)' }}>
                    <rect x="4" y="4" width="16" height="16" rx="2.5" />
                  </svg>
                </button>
              )}

              <motion.button
                onClick={playerState === 'playing' ? pause : playerState === 'paused' ? resume : play}
                className="w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all"
                style={{
                  background: frequency.colorHex,
                  boxShadow: playerState === 'playing'
                    ? `0 0 40px ${frequency.colorHex}80, 0 0 80px ${frequency.colorHex}28`
                    : `0 0 20px ${frequency.colorHex}45`,
                }}
                whileTap={{ scale: 0.94 }}
                animate={playerState === 'playing' ? { boxShadow:[`0 0 30px ${frequency.colorHex}70`,`0 0 60px ${frequency.colorHex}90`,`0 0 30px ${frequency.colorHex}70`] } : {}}
                transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}>
                {playerState === 'playing' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </motion.button>
            </div>

            {/* Right column — mirrors the left, hugging the centre cluster */}
            <div className="flex items-center justify-start flex-1">
              {/* Headphones */}
              <div className="flex flex-col items-center gap-1 px-3 py-2 min-w-[52px]" style={{ color:'var(--text-muted)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
                  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                <span className="text-xs">Req&apos;d</span>
              </div>

              {/* Keyboard hint */}
              <div className="hidden sm:flex flex-col items-center gap-1 px-3 py-2 min-w-[52px]"
                   style={{ color:'var(--text-muted)' }}>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  ⎵
                </span>
                <span className="text-xs">Play</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Session bottom sheet ───────────────────────────────── */}
      <AnimatePresence>
        {showAdjust && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-30" style={{ background:'rgba(0,0,0,0.5)' }}
              onClick={() => setShowAdjust(false)} />
            <motion.div
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:300 }}
              className="fixed bottom-0 left-0 right-0 z-40 px-5 pt-5 pb-8 safe-bottom"
              style={{ background:'#080813', borderTop:'1px solid rgba(255,255,255,0.1)', borderRadius:'24px 24px 0 0' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background:'rgba(255,255,255,0.14)' }} />
              <h3 className="font-semibold mb-0.5 text-center">Adjust Session</h3>
              <p className="text-xs text-center mb-5" style={{ color:'var(--text-muted)' }}>
                Changes apply live — oscillators ramp smoothly in real-time
              </p>

              {/* Binaural band selector as orbs */}
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>Binaural Band</p>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {(Object.keys(BAND_META) as BinauralBand[]).map(b => {
                  const m = BAND_META[b]
                  const active = activeBand === b
                  return (
                    <motion.button key={b} onClick={() => switchBand(b)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                      style={{
                        background: active ? `${m.color}18` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${active ? m.color + '60' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      whileTap={{ scale:0.95 }}>
                      {/* Symbol orb */}
                      <motion.div
                        className="glass-orb w-9 h-9 flex items-center justify-center text-base font-black"
                        style={{
                          color: active ? m.color : 'var(--text-muted)',
                          border: `1px solid ${active ? m.color + '50' : 'rgba(255,255,255,0.1)'}`,
                          background: active ? `${m.color}20` : 'rgba(255,255,255,0.05)',
                        }}
                        animate={active ? { boxShadow:`0 0 16px ${m.color}50` } : { boxShadow:'none' }}>
                        {m.symbol}
                      </motion.div>
                      <span className="text-xs font-medium" style={{ color: active ? m.color : 'var(--text-muted)' }}>
                        {m.label}
                      </span>
                      <span className="text-xs opacity-60" style={{ color:'var(--text-muted)', fontSize:'10px' }}>
                        {m.hz}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Active band info */}
              <motion.div
                className="mb-5 p-3 rounded-xl text-sm"
                style={{ background:`${band.color}0c`, border:`1px solid ${band.color}25`, color:band.color }}>
                <p className="font-semibold">{band.label} — {band.state}</p>
                <p className="text-xs opacity-70 mt-0.5">{band.hz} binaural beat offset</p>
              </motion.div>

              {/* Schumann toggle */}
              <div className="flex items-start gap-4 px-4 py-4 rounded-xl"
                   style={{ background: schumannOn ? 'rgba(0,200,150,0.07)' : 'rgba(255,255,255,0.04)',
                            border:`1.5px solid ${schumannOn ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Schumann Resonance</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(0,200,150,0.12)', color:'#00c896' }}>7.83 Hz</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>
                    Earth&apos;s natural electromagnetic pulse. Adds a grounding &ldquo;breathing&rdquo; layer to your session.
                  </p>
                </div>
                <button onClick={() => setSchumannOn(v => !v)}
                        className="flex-shrink-0 w-12 h-6 rounded-full transition-all relative mt-0.5"
                        style={{ background: schumannOn ? '#00c896' : 'rgba(255,255,255,0.14)' }}>
                  <motion.div animate={{ x: schumannOn ? 24 : 2 }}
                    transition={{ type:'spring', stiffness:400, damping:25 }}
                    className="absolute top-1 w-4 h-4 rounded-full" style={{ background:'#fff' }} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── About This Tone bottom sheet ──────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-30" style={{ background:'rgba(0,0,0,0.55)' }}
              onClick={() => setShowInfo(false)} />
            <motion.div
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:300 }}
              className="fixed bottom-0 left-0 right-0 z-40 px-5 pt-5 pb-8 safe-bottom"
              style={{ background:'#080813', borderTop:'1px solid rgba(255,255,255,0.1)', borderRadius:'24px 24px 0 0', maxHeight:'80vh', overflowY:'auto' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background:'rgba(255,255,255,0.14)' }} />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-base">{frequency.name}</h3>
                  <p className="text-sm mt-0.5" style={{ color:frequency.colorHex }}>{frequency.tagline}</p>
                </div>
                <button onClick={() => setShowInfo(false)} className="text-xl leading-none p-1"
                        style={{ color:'var(--text-muted)' }}>✕</button>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color:'var(--text-secondary)' }}>
                {frequency.description}
              </p>
              <p className="text-xs leading-relaxed italic mb-4" style={{ color:'var(--text-muted)' }}>
                {frequency.researchNote}
              </p>
              <div className="pt-3 text-xs" style={{ borderTop:'1px solid var(--border)', color:'var(--text-muted)' }}>
                Cymatics: {frequency.cymatics}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Free-plan paywall (after the 30s teaser) ──────────────────────
          Lives at the root of the studio, not inside the visualiser, and is
          `fixed` at z-index 100 so it sits above the site header (z-50) and
          the transport controls. When it was scoped to the visualiser box the
          controls underneath stayed live, so a stray tap on stop() wiped the
          gate and handed out a fresh 30 seconds. */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 overflow-y-auto"
            style={{ zIndex:100, background:'rgba(4,4,10,0.94)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)' }}>
            <div className="min-h-full flex items-center justify-center px-6"
                 style={{ paddingTop:'calc(env(safe-area-inset-top) + 28px)', paddingBottom:'calc(env(safe-area-inset-bottom) + 32px)' }}>
              <motion.div
                initial={{ scale:0.94, opacity:0, y:12 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.94, opacity:0 }}
                transition={{ duration:0.28, ease:[0.4,0,0.2,1] }}
                className="w-full max-w-sm text-center">

                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                     style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-mid)' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  </svg>
                </div>

                <p className="text-[0.62rem] font-bold tracking-[0.14em] mb-2" style={{ color:'var(--accent)' }}>
                  YOUR 30-SECOND PREVIEW IS UP
                </p>
                <h2 className="text-xl font-black mb-1.5" style={{ letterSpacing:'-0.02em' }}>
                  Keep the sound going
                </h2>
                <p className="text-sm mb-6" style={{ color:'var(--text-secondary)', lineHeight:1.55 }}>
                  Free sessions stop after 30 seconds. Upgrade to play any frequency for as long as you like — uninterrupted.
                </p>

                {/* Plan choices.
                    These are real <Link>s, not buttons with a router.push handler.
                    Next prefetches the checkout payload as soon as the paywall
                    mounts, so the tap resolves from cache instead of waiting on
                    the network — and if the client router can't complete (patchy
                    mobile data), the browser still follows the href. As buttons
                    with a JS-only handler, a slow connection made them look
                    completely dead: no navigation, no feedback, nothing. */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {PLANS.filter(p => p.id !== 'free').map(p => (
                    <Link key={p.id} href={`/checkout?plan=${p.id}`} prefetch
                      onClick={() => setOpeningPlan(p.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
                      style={{
                        background: p.highlight ? 'var(--accent-dim)' : 'rgba(255,255,255,0.045)',
                        border: `1px solid ${p.highlight ? 'var(--accent-mid)' : 'rgba(255,255,255,0.1)'}`,
                        opacity: openingPlan && openingPlan !== p.id ? 0.5 : 1,
                      }}>
                      <span className="text-left">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color:'var(--text-primary)' }}>{p.name}</span>
                          {p.highlight && (
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background:'var(--accent)', color:'#04140f' }}>POPULAR</span>
                          )}
                        </span>
                        <span className="block text-[0.7rem] mt-0.5" style={{ color:'var(--text-muted)' }}>
                          {openingPlan === p.id ? 'Opening checkout…' : p.tagline}
                        </span>
                      </span>
                      <span className="text-right flex-shrink-0">
                        <span className="font-black text-base" style={{ color:'var(--text-primary)' }}>${p.price}</span>
                        <span className="block text-[0.6rem]" style={{ color:'var(--text-muted)' }}>/mo</span>
                      </span>
                    </Link>
                  ))}
                </div>

                <Link href="/pricing" prefetch className="block text-xs mb-4 hover:opacity-80 transition-opacity"
                      style={{ color:'var(--accent)' }}>
                  Compare all plans →
                </Link>

                {/* Dismiss in place — no navigation, so this can't fail offline. */}
                <button
                  onClick={() => setShowPaywall(false)}
                  className="text-xs hover:opacity-80 transition-opacity" style={{ color:'var(--text-muted)' }}>
                  Maybe later
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
