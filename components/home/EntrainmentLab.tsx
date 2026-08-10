'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useBinaural } from '@/lib/useBinaural'
import type { BinauralBand } from '@/lib/frequencies'
import BeatCanvas from './BeatCanvas'

const NeuralBrain = dynamic(() => import('@/components/NeuralBrain'), { ssr: false })

/** 200 Hz sits far below the ~1.5 kHz phase-locking ceiling — see CarrierCeiling. */
const CARRIER = 200

interface Band {
  /** Also names the EEG band, so the brain can light the right region. */
  id: BinauralBand
  sym: string
  name: string
  range: string
  beat: number
  /** Beat cycles drawn across the scope window — higher bands visibly faster. */
  cycles: number
  /** Drives the brain's activation gradient, cool at rest to hot at peak. */
  activation: number
  /** CSS custom property, for anything styled through the cascade. */
  color: string
  /** The same colour as a literal — canvas cannot resolve a var(). */
  hex: string
  state: string
  /** What the band actually is in the EEG literature — no wellness filler. */
  body: string
}

const BANDS: Band[] = [
  {
    id: 'delta', sym: 'δ', name: 'Delta', range: '0.5–4 Hz', beat: 2, cycles: 1,
    activation: 0.10, color: 'var(--delta)', hex: '#6b8cff', state: 'Deep sleep · repair',
    body: 'The slowest and highest-amplitude rhythm the cortex produces. It dominates the deepest stage of non-REM sleep — the stage during which the fluid spaces between brain cells widen and metabolic waste is flushed out far faster than in waking.',
  },
  {
    id: 'theta', sym: 'θ', name: 'Theta', range: '4–8 Hz', beat: 6, cycles: 2,
    activation: 0.32, color: 'var(--theta)', hex: '#8b5cf6', state: 'Hypnagogia · memory',
    body: 'The rhythm of the drowsy threshold, and of the hippocampus while it encodes memory. Place cells fire at consistent phases of the theta cycle — the brain appears to use it as a clock for laying down where and when things happened.',
  },
  {
    id: 'alpha', sym: 'α', name: 'Alpha', range: '8–12 Hz', beat: 9, cycles: 3,
    activation: 0.54, color: 'var(--alpha)', hex: '#5CE8DC', state: 'Relaxed alertness',
    body: 'The first human brainwave ever recorded — Hans Berger, 1924. It surges the moment you close your eyes and collapses when you open them, which is why it reads as idling cortex: awake, unbothered, not yet working.',
  },
  {
    id: 'beta', sym: 'β', name: 'Beta', range: '13–30 Hz', beat: 18, cycles: 5,
    activation: 0.76, color: 'var(--beta)', hex: '#4a90e8', state: 'Engaged · analytical',
    body: 'Fast, low-amplitude activity that rises with active problem solving and sustained attention. Beta is also the rhythm motor cortex holds while you keep a posture steady — the brain running a task rather than resting.',
  },
  {
    id: 'gamma', sym: 'γ', name: 'Gamma', range: '30–100 Hz', beat: 40, cycles: 8,
    activation: 1.0, color: 'var(--gamma)', hex: '#ffd166', state: 'Binding · peak attention',
    body: 'Near 40 Hz the auditory system does something unusual: it follows a rhythmic sound more strongly here than at any other rate. This 40 Hz steady-state response is so reliable it is used clinically to test hearing in patients who cannot respond.',
  },
]

export default function EntrainmentLab() {
  const [idx, setIdx] = useState(2)   // open on alpha — the most legible state
  const band = BANDS[idx]
  const { playing, analyserRef, start, stop, setTones } = useBinaural()

  const wrapRef = useRef<HTMLDivElement>(null)
  // The brain is a second WebGL context; keep it unmounted until it's nearly
  // on screen so the hero orb owns the GPU during first paint.
  const near = useInView(wrapRef, { once: true, margin: '400px' })

  // Retune rather than restart, so moving down the rail is a continuous glide.
  useEffect(() => {
    if (playing) setTones(CARRIER, band.beat)
  }, [band.beat, playing, setTones])

  // Never leave a tone running once the module scrolls away.
  const onScreen = useInView(wrapRef, { margin: '-30%' })
  useEffect(() => {
    if (!onScreen && playing) stop()
  }, [onScreen, playing, stop])

  return (
    <div ref={wrapRef} className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-start">

      {/* ── Brain viewport ──────────────────────────────────────────────── */}
      <div>
        <div className="viewport" style={{ aspectRatio: '1 / 1' }}>
          {near && (
            <NeuralBrain
              isPlaying={playing}
              mode="session"
              band={band.id}
              progress={band.activation}
              analyserRef={analyserRef}
            />
          )}
          <div className="viewport-ticks" />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, transparent 45%, ${'rgba(5,5,12,0.55)'} 100%)`,
              zIndex: 3,
            }}
          />
          <div className="viewport-label" style={{ zIndex: 6 }}>
            <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Cortical activation</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={band.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}
              >
                {band.name} · {band.beat} Hz
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Scope */}
        <div
          className="relative mt-3"
          style={{
            height: 196,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            overflow: 'hidden',
          }}
        >
          <BeatCanvas
            beatHz={band.beat}
            beatCycles={band.cycles}
            colorHex={band.hex}
            playing={playing}
          />
          {/* One caption per trace, pinned to the top of its band so it never
              collides with the waveform drawn below it. */}
          <div
            className="absolute inset-0 grid pointer-events-none"
            style={{ gridTemplateRows: 'repeat(3, 1fr)', padding: '0 14px' }}
          >
            {[`Left ear · ${CARRIER} Hz`, `Right ear · ${CARRIER + band.beat} Hz`, `Perceived · ${band.beat} Hz beat`].map((l, i) => (
              <span
                key={l}
                style={{
                  alignSelf: 'start',
                  paddingTop: 7,
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: i === 2 ? band.color : 'var(--t4)',
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '0.68rem', color: 'var(--t4)', marginTop: 8, lineHeight: 1.5 }}>
          Carrier compressed for legibility. The relationship is exact: the two traces differ by{' '}
          <strong style={{ color: 'var(--t3)' }}>{band.cycles} cycle{band.cycles === 1 ? '' : 's'}</strong>{' '}
          across the window, and that difference is the beat.
        </p>
      </div>

      {/* ── Controls & copy ─────────────────────────────────────────────── */}
      <div style={{ ['--tone' as string]: band.color }}>
        <span className="eyebrow">Interactive · brainwave entrainment</span>
        <h2 className="h-section" style={{ margin: '14px 0 16px' }}>
          Two tones in.<br />
          <span className="spectral">A third one appears.</span>
        </h2>
        <p className="lede" style={{ marginBottom: 26 }}>
          Send {CARRIER} Hz to one ear and {CARRIER + band.beat} Hz to the other. Neither ear
          receives the difference — but you hear it anyway, because the brainstem computes it.
          Pick a band and listen to the same trick land in a different place.
        </p>

        <div className="band-rail" role="group" aria-label="Brainwave band">
          {BANDS.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIdx(i)}
              data-on={i === idx || undefined}
              aria-pressed={i === idx}
              className="band-btn"
              style={{ ['--tone' as string]: b.color }}
            >
              <span className="band-glyph">{b.sym}</span>
              <span style={{ minWidth: 0 }}>
                <span className="band-name block">{b.name}</span>
                <span className="band-state block truncate">{b.state}</span>
              </span>
              <span className="band-hz">{b.range}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={band.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: '0.88rem', lineHeight: 1.72, color: 'var(--t2)', margin: '22px 0 24px' }}
          >
            {band.body}
          </motion.p>
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="listen-btn"
            data-on={playing || undefined}
            onClick={() => (playing ? stop() : start(CARRIER, band.beat))}
          >
            {playing ? (
              <>
                <span className="eq" aria-hidden><span /><span /><span /><span /></span>
                Stop
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Hear {band.name.toLowerCase()}
              </>
            )}
          </button>
          <span style={{ fontSize: '0.74rem', color: 'var(--t4)', lineHeight: 1.5 }}>
            Live audio · headphones required
          </span>
        </div>
      </div>
    </div>
  )
}
