'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useBinaural } from '@/lib/useBinaural'

const CARRIER = 200
const BEAT = 9

const L_COLOR = '#7db4ff'
const R_COLOR = '#b98cff'
const MIX = '#9aa4c8'

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

function Ear({ x, flip }: { x: number; flip?: boolean }) {
  return (
    <path
      d={`M ${x} 176 c ${flip ? -12 : 12} -4 ${flip ? -19 : 19} 6 ${flip ? -17 : 17} 20 c ${flip ? -2 : 2} 13 ${flip ? -11 : 11} 16 ${flip ? -18 : 18} 12`}
      fill="none"
      stroke="var(--t3)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  )
}

export default function PathwayDiagram() {
  const [mode, setMode] = useState<Mode>('headphones')
  const { playing, start, stop, setMode: setAudioMode } = useBinaural()
  const ref = useRef<HTMLDivElement>(null)
  const onScreen = useInView(ref, { margin: '-30%' })

  const copy = COPY[mode]
  const speakers = mode === 'speakers'

  useEffect(() => {
    if (playing) setAudioMode(speakers ? 'monaural' : 'binaural')
  }, [speakers, playing, setAudioMode])

  useEffect(() => {
    if (!onScreen && playing) stop()
  }, [onScreen, playing, stop])

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
          <svg viewBox="0 0 760 420" style={{ width: '100%', display: 'block' }} role="img"
               aria-label={`Diagram: ${copy.title}`}>
            <defs>
              <radialGradient id="cortexGlow">
                <stop offset="0%"   stopColor={copy.tone} stopOpacity="0.5" />
                <stop offset="100%" stopColor={copy.tone} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mixGlow">
                <stop offset="0%"   stopColor="#e0a060" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#e0a060" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Sources */}
            {[{ x: 78, c: L_COLOR, hz: CARRIER, label: 'LEFT' },
              { x: 682, c: R_COLOR, hz: CARRIER + BEAT, label: 'RIGHT' }].map(s => (
              <g key={s.label}>
                <rect x={s.x - 26} y={166} width={52} height={62} rx={speakers ? 8 : 22}
                      fill="rgba(255,255,255,0.05)" stroke={s.c} strokeOpacity="0.55" strokeWidth="1.5"
                      style={{ transition: 'all 0.4s' }} />
                <circle cx={s.x} cy={197} r={speakers ? 13 : 9} fill={s.c} fillOpacity="0.28"
                        style={{ transition: 'all 0.4s' }} />
                <circle cx={s.x} cy={197} r={speakers ? 5 : 4} fill={s.c} />
                <text x={s.x} y={252} textAnchor="middle" fill="var(--t4)"
                      fontSize="11" fontWeight="700" letterSpacing="1.4">{s.label}</text>
                <text x={s.x} y={270} textAnchor="middle" fill={s.c} fontSize="13" fontWeight="800">
                  {s.hz} Hz
                </text>
              </g>
            ))}

            {/* Head */}
            <ellipse cx="380" cy="196" rx="98" ry="112" fill="rgba(255,255,255,0.022)"
                     stroke="var(--border-mid)" strokeWidth="1.5" />
            <Ear x={288} flip />
            <Ear x={472} />

            {/* Cortex glow — lit only when a neural beat is actually formed */}
            <circle cx="380" cy="150" r="72" fill="url(#cortexGlow)"
                    opacity={speakers ? 0 : 1} style={{ transition: 'opacity 0.5s' }} />

            {/* Direct paths: source → same-side ear */}
            <path d="M 106 197 L 284 197" fill="none" stroke={speakers ? MIX : L_COLOR}
                  strokeWidth="2.5" className="flow-line" style={{ transition: 'stroke 0.4s' }} />
            <path d="M 654 197 L 476 197" fill="none" stroke={speakers ? MIX : R_COLOR}
                  strokeWidth="2.5" className="flow-line flow-rev" style={{ transition: 'stroke 0.4s' }} />

            {/* Cross paths — only speakers reach the far ear */}
            <g opacity={speakers ? 1 : 0} style={{ transition: 'opacity 0.45s' }}>
              <path d="M 106 176 Q 380 42 654 176" fill="none" stroke={MIX} strokeWidth="1.8"
                    strokeOpacity="0.6" strokeDasharray="4 9" />
              <circle cx="380" cy="92" r="34" fill="url(#mixGlow)" />
              <text x="380" y="80" textAnchor="middle" fill="#e0a060" fontSize="11.5" fontWeight="800"
                    letterSpacing="0.6">SUMMED IN AIR</text>
              <text x="380" y="98" textAnchor="middle" fill="var(--t4)" fontSize="10.5">
                both tones reach both ears
              </text>
            </g>

            {/* Ear → brainstem */}
            <path d="M 292 214 Q 318 300 362 322" fill="none" stroke={speakers ? MIX : L_COLOR}
                  strokeWidth="2" strokeOpacity="0.8" className="flow-line"
                  style={{ transition: 'stroke 0.4s' }} />
            <path d="M 468 214 Q 442 300 398 322" fill="none" stroke={speakers ? MIX : R_COLOR}
                  strokeWidth="2" strokeOpacity="0.8" className="flow-line"
                  style={{ transition: 'stroke 0.4s' }} />

            {/* Superior olivary complex */}
            <g>
              {!speakers && [0, 1, 2].map(i => (
                <circle key={i} cx="380" cy="330" r="19" fill="none" stroke={copy.tone}
                        strokeWidth="1.5" className="soc-ring" style={{ animationDelay: `${i * 0.55}s` }} />
              ))}
              <circle cx="380" cy="330" r="19"
                      fill={speakers ? 'rgba(255,255,255,0.05)' : `color-mix(in srgb, ${copy.tone} 28%, transparent)`}
                      stroke={speakers ? 'var(--border-mid)' : copy.tone} strokeWidth="2"
                      style={{ transition: 'all 0.45s' }} />
              <circle cx="380" cy="330" r="6" fill={speakers ? 'var(--t-decor)' : copy.tone}
                      style={{ transition: 'fill 0.45s' }} />
            </g>

            {/* Ascending signal — the beat travelling up to cortex */}
            <g opacity={speakers ? 0 : 1} style={{ transition: 'opacity 0.5s' }}>
              <path d="M 380 308 L 380 250" fill="none" stroke={copy.tone} strokeWidth="2.5"
                    className="flow-line flow-rev" />
              <path d="M 373 258 L 380 246 L 387 258" fill="none" stroke={copy.tone}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            <text x="380" y="374" textAnchor="middle" fill="var(--t3)" fontSize="12" fontWeight="700">
              Superior olivary complex
            </text>
            <text x="380" y="392" textAnchor="middle" fill="var(--t4)" fontSize="10.5">
              {speakers ? 'nothing left to compare — ears are identical' : 'compares the two ears · resolves ~10 µs'}
            </text>
          </svg>
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
              onClick={() => (playing ? stop() : start(CARRIER, BEAT, speakers ? 'monaural' : 'binaural'))}
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
              Keep it playing and flip the switch — same two tones, audibly different result.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
