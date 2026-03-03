'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { BinauralBand, BINAURAL_PRESETS, FREQUENCIES } from '@/lib/frequencies'
import dynamic from 'next/dynamic'

const ThreeVisualizer = dynamic(() => import('./ThreeVisualizer'), { ssr: false })

interface Props {
  hz: number
  binauralBand: BinauralBand
  duration: number  // minutes; 9999 = open
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'done'

export default function FrequencyStudio({ hz, binauralBand, duration }: Props) {
  const frequency = FREQUENCIES[hz]
  const binaural = BINAURAL_PRESETS[binauralBand]

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const oscBaseRef = useRef<OscillatorNode | null>(null)
  const oscLeftRef = useRef<OscillatorNode | null>(null)
  const oscRightRef = useRef<OscillatorNode | null>(null)

  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [volume, setVolume] = useState(0.6)
  const [elapsed, setElapsed] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const totalSeconds = duration === 9999 ? Infinity : duration * 60

  // ─── Build audio graph ──────────────────────────────────────────────────
  const buildAudio = useCallback(() => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0
    gainRef.current = masterGain

    // Stereo merger for binaural
    const merger = ctx.createChannelMerger(2)

    // Solfeggio base tone (both ears, low gain)
    const base = ctx.createOscillator()
    base.type = 'sine'
    base.frequency.value = hz
    const baseGain = ctx.createGain()
    baseGain.gain.value = 0.45
    base.connect(baseGain)
    baseGain.connect(masterGain)
    oscBaseRef.current = base

    // Binaural: L = carrier, R = carrier + beat
    const carrier = binaural.carrierHz
    const beat = binaural.hz

    const oscL = ctx.createOscillator()
    oscL.type = 'sine'
    oscL.frequency.value = carrier
    const gainL = ctx.createGain()
    gainL.gain.value = 0.28
    oscL.connect(gainL)
    gainL.connect(merger, 0, 0)
    oscLeftRef.current = oscL

    const oscR = ctx.createOscillator()
    oscR.type = 'sine'
    oscR.frequency.value = carrier + beat
    const gainR = ctx.createGain()
    gainR.gain.value = 0.28
    oscR.connect(gainR)
    gainR.connect(merger, 0, 1)
    oscRightRef.current = oscR

    merger.connect(masterGain)
    masterGain.connect(analyser)
    analyser.connect(ctx.destination)

    // Fade in over 1.5s
    masterGain.gain.setValueAtTime(0, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5)

    base.start()
    oscL.start()
    oscR.start()
  }, [hz, binaural, volume])

  const stopAudio = useCallback((fade = true) => {
    const ctx = audioCtxRef.current
    const gain = gainRef.current
    if (!ctx || !gain) return

    const cleanup = () => {
      oscBaseRef.current?.stop()
      oscLeftRef.current?.stop()
      oscRightRef.current?.stop()
      ctx.close()
      audioCtxRef.current = null
    }

    if (fade) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
      setTimeout(cleanup, 900)
    } else {
      cleanup()
    }
  }, [])

  // ─── Volume sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(volume, audioCtxRef.current.currentTime + 0.1)
    }
  }, [volume])

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playerState === 'playing') {
      startTimeRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsed(secs)
        if (secs >= totalSeconds) {
          setPlayerState('done')
          stopAudio(true)
        }
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, totalSeconds, stopAudio])

  useEffect(() => () => { stopAudio(false) }, [stopAudio])

  // ─── Controls ───────────────────────────────────────────────────────────
  function play() { buildAudio(); setPlayerState('playing') }
  function pause() { stopAudio(true); setPlayerState('paused') }
  function resume() { buildAudio(); setPlayerState('playing') }
  function stop() { stopAudio(true); setPlayerState('idle'); setElapsed(0) }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  }

  const timeLeft = totalSeconds === Infinity ? null : Math.max(0, totalSeconds - elapsed)
  const progressPct = totalSeconds === Infinity ? 0 : Math.min(100, (elapsed / totalSeconds) * 100)

  const BAND_LABEL: Record<BinauralBand, string> = {
    delta: 'δ Delta', theta: 'θ Theta', alpha: 'α Alpha', beta: 'β Beta', gamma: 'γ Gamma'
  }

  if (!frequency) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">Frequency not found</div>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-void)' }}>

      {/* ── 3D Visualizer ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ flex: '1 1 0', minHeight: '50vh' }}>
        <ThreeVisualizer
          hz={hz}
          isPlaying={playerState === 'playing'}
          analyserRef={analyserRef}
          colorHex={frequency.colorHex}
        />

        {/* Top-left: back + frequency badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
          <a href="/"
             className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-100"
             style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Solive
          </a>
          <div className="glass px-3 py-2 rounded-xl inline-block">
            <p className="text-xs uppercase tracking-widest"
               style={{ color: frequency.colorHex, opacity: 0.8 }}>
              {frequency.name}
            </p>
            <p className="text-2xl font-bold leading-tight" style={{ color: frequency.colorHex }}>
              {hz} <span className="text-base font-normal opacity-70">Hz</span>
            </p>
          </div>
        </div>

        {/* Top-right: binaural + info */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          <div className="glass px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--text-secondary)' }}>
            {BAND_LABEL[binauralBand]} · {binaural.hz} Hz beat
          </div>
          <button onClick={() => setShowInfo(v => !v)}
                  className="glass px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}>
            {showInfo ? 'Close' : 'About'}
          </button>
        </div>

        {/* Info overlay */}
        {showInfo && (
          <div className="absolute inset-x-4 bottom-4 z-10 glass p-5 rounded-2xl fade-in">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{frequency.name}</h3>
                <p className="text-xs" style={{ color: frequency.colorHex }}>{frequency.tagline}</p>
              </div>
              <button onClick={() => setShowInfo(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
              {frequency.description}
            </p>
            <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {frequency.researchNote}
            </p>
          </div>
        )}
      </div>

      {/* ── Controls panel ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-6 safe-bottom"
           style={{ background: 'rgba(6,6,14,0.92)', backdropFilter: 'blur(20px)',
                    borderTop: '1px solid var(--border)' }}>

        {/* Timer progress */}
        {totalSeconds !== Infinity && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>{fmt(elapsed)}</span>
              <span>{timeLeft !== null ? `-${fmt(timeLeft)}` : ''}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill"
                   style={{ width: `${progressPct}%`, background: frequency.colorHex,
                            boxShadow: `0 0 8px ${frequency.colorHex}60` }} />
            </div>
          </div>
        )}

        {/* Effects */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {frequency.effects.map(e => (
            <span key={e} className="text-xs px-3 py-1 rounded-full flex-shrink-0"
                  style={{ background: `${frequency.colorHex}14`, color: frequency.colorHex,
                           border: `1px solid ${frequency.colorHex}30` }}>
              {e}
            </span>
          ))}
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3 mb-5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
          </svg>
          <input type="range" min={0} max={1} step={0.01} value={volume}
                 onChange={e => setVolume(Number(e.target.value))}
                 style={{ ['--accent' as string]: frequency.colorHex,
                          ['--accent-glow' as string]: `${frequency.colorHex}40` }} />
          <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-5">
          {(playerState === 'playing' || playerState === 'paused') && (
            <button onClick={stop}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                   style={{ color: 'var(--text-secondary)' }}>
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          )}

          <button
            onClick={
              playerState === 'playing' ? pause
              : playerState === 'paused' ? resume
              : play
            }
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
            style={{
              background: frequency.colorHex,
              boxShadow: playerState === 'playing'
                ? `0 0 35px ${frequency.colorHex}70, 0 0 70px ${frequency.colorHex}30`
                : `0 0 20px ${frequency.colorHex}50`
            }}>
            {playerState === 'playing' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {playerState === 'done' && (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Complete ✓
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Headphones required for binaural beats
        </p>
      </div>
    </div>
  )
}
