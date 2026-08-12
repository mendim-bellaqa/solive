'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useBinaural } from '@/lib/useBinaural'
import { useDemoLimit, DEMO_SECONDS } from '@/lib/useDemoLimit'
import dynamic from 'next/dynamic'

// Third WebGL context on the page, so it stays out of the initial bundle and
// idles whenever it is off screen.
const HeadScene = dynamic(() => import('./HeadScene'), { ssr: false })

const CARRIER = 200
const BEAT = 9

type Mode = 'headphones' | 'speakers'

const COPY: Record<Mode, { title: string; body: string; verdict: string; tone: string }> = {
  headphones: {
    title: 'Each ear gets exactly one tone',
    body: 'The two frequencies stay separated until they reach the superior olivary complex — the first place in the auditory pathway where signals from both ears converge. Its job is comparing the timing of the two sides, accurate to about ten millionths of a second, which is how you locate a sound in space. Feed it two slightly mismatched tones and that same circuit reports a steady rhythmic drift. The beat is manufactured in your brainstem. No microphone in the room could record it.',
    verdict: 'Binaural beat · exists only in the brain',
    tone: 'var(--alpha)',
  },
  speakers: {
    title: 'The air mixes the tones before you do',
    body: 'Both speakers reach both ears, so the two waves add together out in the room. What arrives at each eardrum is already a single composite tone that swells and fades — a physical amplitude modulation you could capture on tape. Your ears receive identical signals, so there is no interaural difference left for the olivary complex to extract. You still hear a throb, but it is an acoustic event in the air, not an entrainment signal in the brainstem.',
    verdict: 'Monaural beat · an event in the room',
    tone: '#e0a060',
  },
}

export default function PathwayDiagram() {
  const [mode, setMode] = useState<Mode>('headphones')
  const { playing, start, stop, setMode: setAudioMode } = useBinaural()
  const { limited, spent, arm, clear } = useDemoLimit(stop, 'pathway')
  const ref = useRef<HTMLDivElement>(null)
  const onScreen = useInView(ref, { margin: '-30%' })

  const copy = COPY[mode]
  const speakers = mode === 'speakers'

  useEffect(() => {
    if (playing) setAudioMode(speakers ? 'monaural' : 'binaural')
  }, [speakers, playing, setAudioMode])

  useEffect(() => {
    if (!onScreen && playing) { stop(); clear() }
  }, [onScreen, playing, stop, clear])

  return (
    <div ref={ref} style={{ ['--tone' as string]: copy.tone }}>
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <span className="eyebrow">Why headphones are not a suggestion</span>
          <h2 className="h-section" style={{ margin: '14px 0 0' }}>
            The beat is built<br />
            <span className="spectral">inside your head.</span>
          </h2>
        </div>
        <div className="seg-toggle" role="group" aria-label="Playback method">
          {(['headphones', 'speakers'] as Mode[]).map(m => (
            <button
              key={m}
              className="seg-btn"
              data-on={mode === m || undefined}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {mode === m && (
                <motion.span
                  layoutId="segPill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  style={{
                    position: 'absolute', inset: 0, zIndex: -1,
                    borderRadius: 999, background: '#fff',
                  }}
                />
              )}
              {m === 'headphones' ? 'Headphones' : 'Speakers'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-8 items-center">

        {/* ── Diagram ─────────────────────────────────────────────────── */}
        <div
          className="viewport"
          style={{ background: 'radial-gradient(circle at 50% 42%, #0b1020 0%, #05050c 72%)', padding: 4 }}
        >
          <div style={{ position: 'relative', aspectRatio: '16 / 11', width: '100%' }}>
            <HeadScene speakers={speakers} tone={copy.tone} beat={BEAT} />

            {/* Labels stay as HTML: text baked into a WebGL canvas is blurry,
                unselectable and invisible to a screen reader. */}
            <div className="hs-label" style={{ left: 14, top: '46%' }}>
              <span className="hs-eyebrow">LEFT</span>
              <span className="hs-hz" style={{ color: '#7db4ff' }}>{CARRIER} Hz</span>
            </div>
            <div className="hs-label" style={{ right: 14, top: '46%', textAlign: 'right' }}>
              <span className="hs-eyebrow">RIGHT</span>
              <span className="hs-hz" style={{ color: '#b98cff' }}>{CARRIER + BEAT} Hz</span>
            </div>
            <div className="hs-caption">
              <span className="hs-eyebrow">Superior olivary complex</span>
              <span className="hs-sub">
                {speakers
                  ? 'nothing left to compare — both ears carry the same wave'
                  : `compares the two ears · resolves ~10 µs · ${BEAT} Hz beat ascends`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Copy ────────────────────────────────────────────────────── */}
        <div>
          <span className="verdict">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
            {copy.verdict}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              // Kept short: this panel exists to be flipped back and forth, and
              // a half-second swap would blunt the comparison it is making.
              transition={{ duration: 0.15 }}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.025em', margin: '18px 0 12px', lineHeight: 1.25 }}>
                {copy.title}
              </h3>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'var(--t2)' }}>
                {copy.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 24 }}>
            <button
              className="listen-btn"
              data-on={playing || undefined}
              onClick={() => {
                if (playing) { stop(); clear(); return }
                if (arm()) start(CARRIER, BEAT, speakers ? 'monaural' : 'binaural')
              }}
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
                  Hear the difference
                </>
              )}
            </button>
            <span style={{ fontSize: '0.74rem', color: 'var(--t4)', maxWidth: '15rem', lineHeight: 1.5 }}>
              Flip the switch while it plays — same two tones, audibly different result.
              {limited && (
                <span style={{ display: 'block', marginTop: 2 }}>
                  {spent
                    ? 'Today\u2019s demo is used \u2014 see the plans for unlimited audio'
                    : `${DEMO_SECONDS} seconds, once a day`}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
