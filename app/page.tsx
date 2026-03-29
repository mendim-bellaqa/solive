'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Header from '@/components/Header'

// ─── Data ────────────────────────────────────────────────────────────────────
const FREQUENCIES = [
  { hz: 174,  name: 'Foundation',    tag: 'Pain relief & grounding' },
  { hz: 285,  name: 'Tissue',        tag: 'Cellular regeneration'   },
  { hz: 396,  name: 'Liberation',    tag: 'Release fear & guilt'    },
  { hz: 417,  name: 'Change',        tag: 'Break negative cycles'   },
  { hz: 432,  name: 'Earth Tone',    tag: 'Natural calm & alignment'},
  { hz: 528,  name: 'Miracle',       tag: 'Love frequency'          },
  { hz: 639,  name: 'Connection',    tag: 'Relationships & empathy' },
  { hz: 741,  name: 'Clarity',       tag: 'Focus & detox'           },
  { hz: 852,  name: 'Intuition',     tag: 'Inner vision'            },
  { hz: 963,  name: 'Crown',         tag: 'Unity consciousness'     },
]

const STATS = [
  { value: '31.5%', label: 'Cortisol reduction', sub: '432 Hz · 5 min session' },
  { value: '7 min',  label: 'Brainwave shift',    sub: 'Binaural entrainment'  },
  { value: '7.83',   label: 'Schumann Hz',        sub: "Earth's own frequency" },
  { value: '10',     label: 'Solfeggio tones',    sub: 'Each precisely mapped' },
]

// ─── Lissajous SVG ────────────────────────────────────────────────────────────
function LissajousSVG({ hz, size = 48, opacity = 0.7 }: { hz: number; size?: number; opacity?: number }) {
  function getParams(hz: number) {
    if (hz <= 285) return { a: 1, b: 2, loops: 2 }
    if (hz <= 417) return { a: 2, b: 3, loops: 3 }
    if (hz <= 528) return { a: 3, b: 4, loops: 4 }
    if (hz <= 741) return { a: 4, b: 5, loops: 5 }
    return { a: 5, b: 7, loops: 7 }
  }
  const { a, b, loops } = getParams(hz)
  const N = 180, h = size / 2, r = h * 0.80
  const d = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * Math.PI * 2 * loops
    const x = (h + Math.sin(a * t) * r).toFixed(1)
    const y = (h + Math.sin(b * t) * r).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity }}>
      <path d={d + ' Z'} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
            className="spin-slow" style={{ transformOrigin: `${h}px ${h}px` }} />
      <circle cx={h} cy={h} r="2" fill="currentColor" opacity="0.5" className="breathe" />
    </svg>
  )
}

// ─── Wave canvas background ──────────────────────────────────────────────────
function WaveCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let t = 0

    function draw() {
      raf.current = requestAnimationFrame(draw)
      const c = ref.current!
      const W = c.offsetWidth, H = c.offsetHeight
      const dpr = Math.min(window.devicePixelRatio, 2)
      if (c.width !== W * dpr || c.height !== H * dpr) {
        c.width = W * dpr; c.height = H * dpr
        ctx.scale(dpr, dpr)
      }
      ctx.clearRect(0, 0, W, H)

      // 4 delicate sine waves — pure white, very low opacity
      const lines = [
        { amp: 0.055, freq: 0.0038, phase: 0,   op: 0.055, y: 0.50 },
        { amp: 0.030, freq: 0.0062, phase: 1.8,  op: 0.035, y: 0.50 },
        { amp: 0.080, freq: 0.0020, phase: 3.3,  op: 0.028, y: 0.50 },
        { amp: 0.018, freq: 0.0110, phase: 5.5,  op: 0.042, y: 0.50 },
      ]

      lines.forEach(({ amp, freq, phase, op, y }) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${op})`
        ctx.lineWidth = 1
        for (let x = 0; x <= W; x += 2) {
          const py = y * H + Math.sin(x * freq + t + phase) * H * amp
          x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py)
        }
        ctx.stroke()
      })
      t += 0.008
    }
    draw()
    return () => cancelAnimationFrame(raf.current)
  }, [])

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  )
}

// ─── Fade-in on scroll ────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Hz Input ─────────────────────────────────────────────────────────────────
function HzInput({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError]  = useState(false)

  const go = useCallback(() => {
    const n = Number(value)
    if (n >= 1 && n <= 20000) {
      router.push(`/studio?hz=${n}&binaural=alpha&duration=30`)
    } else {
      setError(true)
      setTimeout(() => setError(false), 600)
    }
  }, [value, router])

  const sm = size === 'sm'

  return (
    <motion.div
      animate={error ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className="hz-input-group"
      style={{ borderRadius: sm ? 12 : 16 }}
    >
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()}
        placeholder="432"
        min={1}
        max={20000}
        aria-label="Enter frequency in Hz"
        style={{
          fontSize: sm ? '1.1rem' : '1.45rem',
          padding: sm ? '10px 6px 10px 14px' : undefined,
          width: sm ? 88 : 108,
        }}
      />
      <span className="hz-unit" style={{ fontSize: sm ? '0.72rem' : undefined }}>Hz</span>
      <button
        className="hz-play-btn"
        onClick={go}
        disabled={!value}
        style={{ padding: sm ? '0 14px' : undefined, minHeight: sm ? 38 : 48 }}
        aria-label="Play this frequency"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        Play
      </button>
    </motion.div>
  )
}

// ─── Frequency card ───────────────────────────────────────────────────────────
function FreqCard({ hz, name, tag, index }: {
  hz: number; name: string; tag: string; index: number
}) {
  const router  = useRouter()
  const [hover, setHover] = useState(false)

  return (
    <motion.button
      className="freq-cell text-left"
      onClick={() => router.push(`/studio?hz=${hz}&binaural=alpha&duration=30`)}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.035, duration: 0.4 }}
      whileHover={{ y: -5, boxShadow: '0 24px 56px rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.14)' }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Lissajous + Hz */}
        <div className="flex items-start justify-between">
          <div style={{ color: 'var(--t2)' }}>
            <LissajousSVG hz={hz} size={44} opacity={hover ? 0.9 : 0.55} />
          </div>
          <div className="text-right">
            <p className="text-xs font-black tabular leading-none" style={{ color: hover ? 'var(--t1)' : 'var(--t2)', letterSpacing: '-0.02em' }}>
              {hz}
            </p>
            <p className="text-xs" style={{ color: 'var(--t4)', fontSize: '0.65rem' }}>Hz</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-xs font-bold leading-snug mb-0.5" style={{ color: hover ? 'var(--t1)' : 'var(--t2)' }}>
            {name}
          </p>
          <p style={{ color: 'var(--t3)', fontSize: '0.68rem', lineHeight: 1.4 }}>{tag}</p>
        </div>

        {/* Play arrow on hover */}
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="flex items-center gap-1"
              style={{ color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 700 }}
            >
              Play
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="w-full h-px my-2" style={{
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)'
    }} />
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()

  return (
    <>
      <Header />

      {/* Ambient blobs */}
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" />
        <div className="ambient-orb" />
        <div className="ambient-orb" />
      </div>

      <main className="relative z-10">

        {/* ══════════════════ HERO ══════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col justify-center px-5 pt-28 pb-20 overflow-hidden">
          <WaveCanvas />

          <div className="relative z-10 max-w-3xl mx-auto w-full">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10 glass"
            >
              <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--accent)' }} aria-hidden />
              <span style={{ color: 'var(--t3)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                SOUND HEALING · BINAURAL BEATS · 3D CYMATICS
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              style={{
                fontSize: 'clamp(2.6rem, 7vw, 5.2rem)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                marginBottom: '1.25rem',
              }}
            >
              Every frequency
              <br />
              <span style={{ color: 'var(--t2)' }}>has a purpose.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ color: 'var(--t2)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '30rem' }}
            >
              10 Solfeggio tones. Real-time 3D cymatics.
              Personalized to how you feel right now.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4"
            >
              <HzInput />
              <span style={{ color: 'var(--t4)', fontSize: '0.8rem', padding: '0 4px' }}>or</span>
              <button
                onClick={() => router.push('/session')}
                className="pill-btn"
              >
                Find my frequency
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58 }}
              style={{ color: 'var(--t4)', fontSize: '0.75rem' }}
            >
              Type any Hz · 1 – 20 000 · No account needed · Headphones recommended
            </motion.p>

            {/* Quick access — clean Hz list */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap gap-2 mt-8"
            >
              {FREQUENCIES.map(f => (
                <button
                  key={f.hz}
                  onClick={() => router.push(`/studio?hz=${f.hz}&binaural=alpha&duration=30`)}
                  style={{
                    background: 'var(--glass-1)',
                    border: '1px solid var(--border)',
                    color: 'var(--t3)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    padding: '5px 12px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'var(--glass-2)'
                    el.style.borderColor = 'var(--border-mid)'
                    el.style.color = 'var(--t1)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'var(--glass-1)'
                    el.style.borderColor = 'var(--border)'
                    el.style.color = 'var(--t3)'
                  }}
                >
                  {f.hz} Hz
                </button>
              ))}
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{ color: 'var(--t4)' }}
            aria-hidden
          >
            <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════ STATS ═════════════════════════════════════════ */}
        <section className="px-5 py-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.07}>
                <div className="stat-card">
                  <p style={{
                    fontSize: '1.85rem',
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    marginBottom: 6,
                    color: 'var(--t1)',
                  }} className="tabular">
                    {s.value}
                  </p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>{s.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Divider />

        {/* ══════════════════ FREQUENCIES GRID ═════════════════════════════ */}
        <section className="px-5 py-20 max-w-5xl mx-auto">
          <Reveal>
            <div className="mb-12">
              <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>
                THE SOLFEGGIO SCALE
              </p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 12 }}>
                10 tones.{' '}
                <span style={{ color: 'var(--t2)' }}>Click any to play.</span>
              </h2>
              <p style={{ color: 'var(--t2)', fontSize: '0.95rem', maxWidth: '28rem', lineHeight: 1.6 }}>
                Each Solfeggio frequency targets a specific domain — healing, focus, release, connection.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {FREQUENCIES.map((f, i) => (
              <FreqCard key={f.hz} {...f} index={i} />
            ))}
          </div>

          {/* Custom Hz callout */}
          <Reveal delay={0.25}>
            <div
              className="glass-card grain mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 px-6 py-5"
              style={{ borderRadius: 18 }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, color: 'var(--t1)' }}>
                  Not in the list? Play any frequency.
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '0.78rem' }}>
                  7.83 Hz Schumann · 432 Hz Earth · 40 Hz Gamma · anything you want
                </p>
              </div>
              <HzInput size="sm" />
            </div>
          </Reveal>
        </section>

        <Divider />

        {/* ══════════════════ HOW IT WORKS ══════════════════════════════════ */}
        <section className="px-5 py-20 max-w-4xl mx-auto">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>HOW IT WORKS</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 48 }}>
              Three steps to a{' '}
              <span style={{ color: 'var(--t2)' }}>different state.</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                n: '01',
                title: 'Choose your frequency',
                body: 'Type any Hz directly — 432, 528, 963 — or answer 6 quick questions and let the algorithm find your match.',
              },
              {
                n: '02',
                title: 'Watch sound become shape',
                body: 'Real-time Lissajous cymatics morph in 3D. Every Hz creates a unique geometric signature. Binaural beats layer underneath.',
              },
              {
                n: '03',
                title: 'Let the waves do the work',
                body: 'Wear headphones. Close your eyes. Brainwave entrainment is measurable, peer-reviewed, and begins in under 7 minutes.',
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className="glass-card grain h-full p-6">
                  <div className="relative z-10">
                    <p style={{ fontWeight: 900, fontSize: '2.2rem', color: 'var(--t4)', letterSpacing: '-0.04em', marginBottom: 20, lineHeight: 1 }}>
                      {step.n}
                    </p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--t1)' }}>{step.title}</p>
                    <p style={{ fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--t2)' }}>{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Divider />

        {/* ══════════════════ BINAURAL SCIENCE ═════════════════════════════ */}
        <section className="px-5 py-20 max-w-4xl mx-auto">
          <div className="glass-premium grain" style={{ borderRadius: 28 }}>
            <div className="relative z-10 px-8 sm:px-14 py-12">
              <div className="grid sm:grid-cols-2 gap-12 items-center">
                <Reveal>
                  <div>
                    <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>
                      THE SCIENCE
                    </p>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 18 }}>
                      Binaural beats<br />rewire your brain.
                    </h2>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--t2)', marginBottom: 24 }}>
                      Play slightly different frequencies in each ear and your brain
                      creates a third — the difference. This matches delta, theta, alpha,
                      beta, or gamma waves exactly. It&apos;s entrainment: real, measurable, studied.
                    </p>
                    <Link
                      href="/session"
                      className="pill-btn"
                      style={{ display: 'inline-flex' }}
                    >
                      Get my prescription →
                    </Link>
                  </div>
                </Reveal>

                <Reveal delay={0.15}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Left ear',    hz: '200 Hz', cycles: 3.8  },
                      { label: 'Right ear',   hz: '209 Hz', cycles: 4.25 },
                      { label: 'Brain hears', hz: '9 Hz alpha', cycles: 0.45, highlight: true },
                    ].map(({ label, hz, cycles, highlight }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 80, flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: highlight ? 'var(--accent)' : 'var(--t2)' }}>{label}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>{hz}</p>
                        </div>
                        <div style={{ flex: 1, height: 28, overflow: 'hidden' }}>
                          <svg viewBox="0 0 200 28" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                            <path
                              d={Array.from({ length: 201 }, (_, i) => {
                                const x = i
                                const y = 14 + Math.sin((i / 200) * Math.PI * 2 * cycles) * (highlight ? 10 : 8)
                                return `${i === 0 ? 'M' : 'L'}${x},${y}`
                              }).join(' ')}
                              fill="none"
                              stroke={highlight ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}
                              strokeWidth={highlight ? 1.8 : 1}
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                    <p style={{ fontSize: '0.72rem', color: 'var(--t4)', textAlign: 'right', marginTop: 4 }}>
                      = Alpha entrainment · calm focus
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════ BRAINWAVE BANDS ═══════════════════════════════ */}
        <section className="px-5 py-20 max-w-4xl mx-auto">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>BRAINWAVE STATES</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 40 }}>
              Five states.{' '}
              <span style={{ color: 'var(--t2)' }}>All accessible.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { sym: 'δ', name: 'Delta',  hz: '1–4 Hz',   state: 'Deep sleep · healing',       note: 'Tissue repair, immunity boost' },
              { sym: 'θ', name: 'Theta',  hz: '4–8 Hz',   state: 'Meditation · creativity',    note: 'Emotional processing, insights' },
              { sym: 'α', name: 'Alpha',  hz: '8–12 Hz',  state: 'Calm focus · flow',          note: 'Relaxed alertness, stress relief' },
              { sym: 'β', name: 'Beta',   hz: '14–30 Hz', state: 'Alert · concentration',      note: 'Problem solving, active thinking' },
              { sym: 'γ', name: 'Gamma',  hz: '35–45 Hz', state: 'Peak cognition · presence',  note: 'High attention, perception' },
            ].map((b, i) => (
              <Reveal key={b.name} delay={i * 0.06}>
                <div className="stat-card">
                  <p style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1, marginBottom: 6 }}>{b.sym}</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>{b.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--t3)', fontFamily: 'monospace', marginBottom: 6 }}>{b.hz}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--t2)', lineHeight: 1.4 }}>{b.state}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════ FINAL CTA ═════════════════════════════════════ */}
        <section className="px-5 py-28 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <Reveal>
            <div className="max-w-xl mx-auto">
              <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>START NOW</p>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 16 }}>
                Your frequency<br />
                <span style={{ color: 'var(--t2)' }}>is waiting.</span>
              </h2>
              <p style={{ color: 'var(--t2)', fontSize: '0.95rem', marginBottom: 36, lineHeight: 1.6 }}>
                Put on headphones. Close your eyes. Let sound do the work.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => router.push('/session')} className="btn-primary px-10 py-3.5 text-sm">
                  Find my frequency →
                </button>
                <HzInput size="sm" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer
          className="px-5 py-8 flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p style={{ fontSize: '0.75rem', color: 'var(--t4)' }}>
            Solive · Not a substitute for medical care
          </p>
          <div className="flex gap-5" style={{ color: 'var(--t4)', fontSize: '0.75rem' }}>
            <Link href="/session" className="hover:opacity-70 transition-opacity">Questionnaire</Link>
            <Link href="/history" className="hover:opacity-70 transition-opacity">History</Link>
            <Link href="/auth/login" className="hover:opacity-70 transition-opacity">Sign in</Link>
          </div>
        </footer>

      </main>
    </>
  )
}
