'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false })

// ─── Frequency data ─────────────────────────────────────────────────────────
const FREQS = [
  {
    hz: 174, name: 'Foundation', color: '#f59e0b',
    tagline: 'Natural pain relief',
    effect: 'Lowers pain perception by acting directly on the autonomic nervous system. Functions as a natural analgesic without side effects.',
    research: 'ANS regulation studies show measurable pain reduction within 8–12 minutes of exposure.',
    wave: [0.3, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.6, 0.3, 0.5],
  },
  {
    hz: 285, name: 'Quantum Cognition', color: '#f97316',
    tagline: 'Cellular regeneration',
    effect: 'Promotes tissue regeneration and cellular energy field restoration. Signals the body\'s innate repair mechanisms.',
    research: 'Cellular resonance research indicates interaction with membrane potential signaling pathways.',
    wave: [0.5, 0.7, 0.4, 0.9, 0.5, 0.3, 0.8, 0.6, 0.4, 0.7],
  },
  {
    hz: 396, name: 'Liberation', color: '#ef4444',
    tagline: 'Release guilt & fear',
    effect: 'Deactivates deep-seated limbic fear responses. Releases emotional blockages stored in the body.',
    research: 'Limbic system resonance studies document emotional processing shifts during 396 Hz exposure.',
    wave: [0.6, 0.3, 0.8, 0.5, 0.9, 0.4, 0.6, 0.8, 0.3, 0.7],
  },
  {
    hz: 417, name: 'Transmutation', color: '#ec4899',
    tagline: 'Facilitate change',
    effect: 'Breaks down crystallized neural patterns. Activates neuroplasticity for lasting behavioral change.',
    research: 'Associated with enhanced neural pathway flexibility in longitudinal sound therapy studies.',
    wave: [0.4, 0.8, 0.5, 0.7, 0.3, 0.9, 0.4, 0.6, 0.8, 0.5],
  },
  {
    hz: 432, name: 'Cosmic Tuning', color: '#8b5cf6',
    tagline: 'Deep calm & alignment',
    effect: 'Aligns with Schumann resonance (Earth\'s pulse at 7.83 Hz). Dramatically reduces cortisol and stress hormones.',
    research: '432 Hz vs 440 Hz controlled study: 31.5% cortisol reduction in 5 minutes of exposure.',
    wave: [0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.9, 0.5, 0.7, 0.4],
  },
  {
    hz: 528, name: 'Transformation', color: '#10b981',
    tagline: 'The miracle tone',
    effect: 'Associated with DNA repair and cellular restoration. Reduces cortisol. Known as the "love frequency" for its emotional resonance.',
    research: 'Roth et al.: 528 Hz reduces cortisol in human salivary tests. Frequency used in DNA repair protocols.',
    wave: [0.5, 0.9, 0.4, 0.7, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7],
  },
  {
    hz: 639, name: 'Connection', color: '#3b82f6',
    tagline: 'Harmony & relationships',
    effect: 'Activates oxytocin signaling pathways. Enhances empathy, communication, and interpersonal resonance.',
    research: 'Interpersonal sound therapy research documents prosocial behavior enhancement.',
    wave: [0.8, 0.5, 0.7, 0.3, 0.9, 0.6, 0.4, 0.8, 0.5, 0.7],
  },
  {
    hz: 741, name: 'Awakening', color: '#6366f1',
    tagline: 'Focus & clarity',
    effect: 'Detoxifies cells and the field. Dramatically sharpens cognitive focus. Activates intuition and problem-solving capacity.',
    research: 'Beta wave entrainment studies link 741 Hz exposure with enhanced analytical clarity.',
    wave: [0.3, 0.7, 0.9, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9],
  },
  {
    hz: 852, name: 'Third Eye', color: '#a855f7',
    tagline: 'Intuition & insight',
    effect: 'Enhances melatonin production. Activates the pineal gland. Returns the mind to spiritual order and higher awareness.',
    research: 'Theta-gamma coupling studies document elevated intuitive processing during high-frequency exposure.',
    wave: [0.6, 0.4, 0.8, 0.6, 0.3, 0.7, 0.5, 0.9, 0.4, 0.6],
  },
  {
    hz: 963, name: 'Divine Connection', color: '#d946ef',
    tagline: 'Pineal activation',
    effect: 'Induces gamma brainwave coherence at rest. Associated with transcendent states, non-local awareness, and peak clarity.',
    research: 'Gamma coherence measured in meditators mirrors 963 Hz resonance patterns (neuroscience research).',
    wave: [0.9, 0.6, 0.4, 0.8, 0.5, 0.7, 0.3, 0.9, 0.6, 0.4],
  },
]

const STATS = [
  { value: '31.5', unit: '%', label: 'Cortisol reduction', sub: 'in 5 min at 432 Hz' },
  { value: '7', unit: 'min', label: 'Brainwave shift', sub: 'binaural beats take effect' },
  { value: '7.83', unit: 'Hz', label: 'Schumann resonance', sub: "Earth's electromagnetic pulse" },
  { value: '10', unit: 'Hz', label: 'Solfeggio frequencies', sub: 'each targeting a state' },
]

const HOW_STEPS = [
  {
    n: '01',
    title: 'Answer 5 questions',
    body: 'Tap through a short questionnaire about your current mental, physical, and emotional state. No typing — just tap. Takes 60 seconds.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
        <rect x="9" y="3" width="6" height="4" rx="1.5" />
        <path d="M9 12h6M9 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Receive your prescription',
    body: 'Our weighted scoring engine processes 50+ data points across all 10 frequencies and prescribes the exact Solfeggio tone + binaural beat with a score breakdown.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Experience your frequency',
    body: 'The studio plays your personalized session with a real-time 3D Lissajous visualization — the mathematical shape of your sound — reacting to every oscillation.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" strokeLinecap="round" />
      </svg>
    ),
  },
]

// ─── Fade-in section wrapper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.65, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Canvas oscilloscope background ─────────────────────────────────────────
function OscilloscopeBackground({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const colorRef  = useRef(color)
  useEffect(() => { colorRef.current = color }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let t = 0

    function parse(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    }

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      if (!canvasRef.current) return
      const cvs = canvasRef.current
      const w = cvs.offsetWidth
      const h = cvs.offsetHeight
      if (cvs.width !== w || cvs.height !== h) {
        cvs.width = w
        cvs.height = h
      }
      ctx.clearRect(0, 0, w, h)

      const [r, g, b] = parse(colorRef.current)
      const waves = [
        { amp: 0.055, freq: 0.0045, phase: 0,    opacity: 0.14, y: 0.50 },
        { amp: 0.035, freq: 0.0072, phase: 1.2,  opacity: 0.09, y: 0.50 },
        { amp: 0.080, freq: 0.0025, phase: 2.5,  opacity: 0.07, y: 0.50 },
        { amp: 0.025, freq: 0.0110, phase: 0.8,  opacity: 0.10, y: 0.50 },
        { amp: 0.120, freq: 0.0018, phase: 3.9,  opacity: 0.05, y: 0.50 },
        { amp: 0.040, freq: 0.0060, phase: 5.1,  opacity: 0.08, y: 0.50 },
      ]

      waves.forEach(({ amp, freq, phase, opacity, y }) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`
        ctx.lineWidth = 1.5
        for (let x = 0; x <= w; x += 3) {
          const wy = y * h + Math.sin(x * freq + t + phase) * h * amp
          if (x === 0) { ctx.moveTo(x, wy) } else { ctx.lineTo(x, wy) }
        }
        ctx.stroke()
      })

      t += 0.014
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  )
}

// ─── Mini SVG waveform for frequency cards ───────────────────────────────────
function MiniWave({ points, color }: { points: number[]; color: string }) {
  const n = points.length
  const w = 80
  const h = 24
  const pts = points.map((v, i) => `${(i / (n - 1)) * w},${h - v * h * 0.85}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

// ─── Binaural beats animated diagram ────────────────────────────────────────
function BinauralDiagram() {
  return (
    <div className="space-y-4">
      {[
        { label: 'Left ear', hz: '200 Hz', cycles: 4.0, color: '#3b82f6' },
        { label: 'Right ear', hz: '209 Hz', cycles: 4.45, color: '#a855f7' },
        { label: 'Brain hears', hz: '9 Hz · Alpha', cycles: 0.45, color: '#10b981', thick: true },
      ].map(({ label, hz, cycles, color, thick }) => (
        <div key={label} className="flex items-center gap-4">
          <div className="w-24 flex-shrink-0 text-right">
            <p className="text-xs font-medium" style={{ color }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hz}</p>
          </div>
          <div className="flex-1 overflow-hidden h-8 flex items-center">
            <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none">
              <path
                d={`M0,14 ${Array.from({ length: 200 }, (_, i) =>
                  `L${i},${14 + Math.sin((i / 200) * Math.PI * 2 * cycles) * (thick ? 10 : 8)}`
                ).join(' ')}`}
                fill="none"
                stroke={color}
                strokeWidth={thick ? 2 : 1.2}
                opacity={thick ? 1 : 0.7}
              />
            </svg>
          </div>
        </div>
      ))}
      <p className="text-xs text-right pt-2 pr-1" style={{ color: 'var(--text-muted)' }}>
        Brain entrains to the 9 Hz difference frequency → alpha state
      </p>
    </div>
  )
}

// ─── Animated stat counter ───────────────────────────────────────────────────
function StatCounter({ value, unit, label, sub }: { value: string; unit: string; label: string; sub: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="glass rounded-2xl p-5 text-center">
      <div className="flex items-baseline justify-center gap-1 mb-1">
        <motion.span
          className="text-3xl font-black tabular-nums"
          style={{ color: 'var(--text-primary)' }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, ease: 'backOut' }}
        >
          {value}
        </motion.span>
        <span className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>{unit}</span>
      </div>
      <p className="text-sm font-semibold mb-0.5">{label}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

// ─── Landing page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [hzIdx, setHzIdx]       = useState(5) // start at 528 Hz
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hoveredHz, setHoveredHz] = useState<number | null>(null)

  const displayIdx  = hoveredHz !== null ? FREQS.findIndex(f => f.hz === hoveredHz) : hzIdx
  const currentFreq = FREQS[displayIdx >= 0 ? displayIdx : hzIdx]

  // Cycle through Hz values every 2s
  useEffect(() => {
    const id = setInterval(() => setHzIdx(i => (i + 1) % FREQS.length), 2000)
    return () => clearInterval(id)
  }, [])

  // Auth check
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser()
        .then(({ data: { user } }) => setIsLoggedIn(!!user))
        .catch(() => {})
    })
  }, [])

  return (
    <div style={{ background: 'var(--bg-void)', color: 'var(--text-primary)' }}>
      <OnboardingModal />

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        <OscilloscopeBackground color={currentFreq.color} />

        {/* Radial glow from center */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${currentFreq.color}12 0%, transparent 70%)`,
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-6">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
              <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11"
                    stroke={currentFreq.color} strokeWidth="2" strokeLinecap="round" fill="none"
                    className="transition-all duration-700" />
            </svg>
            <span className="font-bold text-lg tracking-tight">Solive</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/history" className="btn-ghost text-sm py-2 px-4">My Sessions</Link>
            ) : (
              <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">Sign in</Link>
            )}
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-14 lg:px-20 max-w-6xl mx-auto w-full pt-6 pb-24">

          {/* Live Hz badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFreq.hz}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2.5 mb-8 text-sm px-4 py-2 rounded-full self-start"
              style={{ background: `${currentFreq.color}14`, border: `1px solid ${currentFreq.color}35` }}
            >
              <span className="w-2 h-2 rounded-full breathe" style={{ background: currentFreq.color }} />
              <span className="font-semibold tabular-nums" style={{ color: currentFreq.color }}>
                {currentFreq.hz} Hz
              </span>
              <span className="opacity-70" style={{ color: currentFreq.color }}>
                {currentFreq.name} — {currentFreq.tagline}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Main headline */}
          <h1 className="font-black tracking-tight leading-none mb-6"
              style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', lineHeight: 0.95 }}>
            Sound is<br />
            <AnimatePresence mode="wait">
              <motion.span
                key={currentFreq.hz}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                style={{
                  background: `linear-gradient(135deg, ${currentFreq.color} 0%, ${currentFreq.color}99 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >
                medicine.
              </motion.span>
            </AnimatePresence>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl mb-4 max-w-2xl leading-relaxed"
             style={{ color: 'var(--text-secondary)' }}>
            The right frequency at the right moment reduces stress hormones,
            activates cellular repair, and shifts your brainwave state in under 5 minutes.
          </p>
          <p className="text-base mb-10 max-w-xl" style={{ color: 'var(--text-muted)' }}>
            Solive analyzes your state across 5 dimensions and prescribes the exact Solfeggio frequency
            + binaural beat your nervous system needs — played with a real-time 3D cymatic visualization
            that reacts to every oscillation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link href="/session"
                  className="btn-primary text-center sm:text-left text-base py-4 px-8 transition-all duration-500"
                  style={{
                    background: currentFreq.color,
                    boxShadow: `0 8px 40px ${currentFreq.color}55`,
                    color: '#000',
                  }}>
              Begin Your Session →
            </Link>
            <a href="#frequencies" className="btn-ghost text-center sm:text-left text-base py-4 px-8">
              Explore the 10 Frequencies ↓
            </a>
          </div>

          {/* Research proof points */}
          <div className="flex flex-wrap gap-2.5">
            {[
              '528 Hz reduces cortisol by 31.5%',
              'Binaural beats shift brainwaves in 7 min',
              '7.83 Hz Schumann = Earth\'s pulse',
              '10 frequencies, each targeting a state',
            ].map(fact => (
              <span key={fact}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-muted)' }}>
                ✓ {fact}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
             style={{ color: 'var(--text-muted)' }}>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
              <rect x="1" y="1" width="12" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <motion.circle cx="7" cy="6" r="2.5" fill="currentColor"
                animate={{ cy: [6, 13, 6] }} transition={{ repeat: Infinity, duration: 1.8 }} />
            </svg>
          </motion.div>
          <span className="text-xs opacity-40">Scroll</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FREQUENCIES
      ═══════════════════════════════════════════════════════════════ */}
      <section id="frequencies" className="py-28 px-6 sm:px-12">
        <FadeIn className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              The frequency library
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              10 healing frequencies.
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>Each with a purpose.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Every Solfeggio frequency interacts differently with your physiology.
              Hover to explore each one — and let Solive prescribe which one you need today.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {FREQS.map((f, i) => (
              <FadeIn key={f.hz} delay={i * 0.04}>
                <motion.div
                  className="glass rounded-2xl p-5 cursor-pointer group relative overflow-hidden"
                  style={{ border: `1px solid ${f.color}20` }}
                  onHoverStart={() => setHoveredHz(f.hz)}
                  onHoverEnd={() => setHoveredHz(null)}
                  whileHover={{ scale: 1.02, borderColor: `${f.color}50` }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Background glow on hover */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 30% 40%, ${f.color}10, transparent 70%)` }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  />

                  <div className="relative z-10">
                    {/* Hz + waveform row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-black tabular-nums" style={{ color: f.color }}>
                          {f.hz}
                          <span className="text-sm font-normal ml-0.5 opacity-70">Hz</span>
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-wider mt-0.5"
                           style={{ color: 'var(--text-muted)' }}>
                          {f.name}
                        </p>
                      </div>
                      <MiniWave points={f.wave} color={f.color} />
                    </div>

                    {/* Tagline */}
                    <p className="text-sm font-medium mb-2" style={{ color: f.color }}>
                      {f.tagline}
                    </p>

                    {/* Effect (hidden until hover) */}
                    <motion.p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                      initial={{ opacity: 0.5 }}
                      whileHover={{ opacity: 1 }}
                    >
                      {f.effect}
                    </motion.p>

                    {/* Research note */}
                    <motion.p
                      className="text-xs mt-2 italic border-t pt-2"
                      style={{ color: 'var(--text-muted)', borderColor: `${f.color}20` }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      {f.research}
                    </motion.p>
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2} className="mt-10 text-center">
            <Link href="/session" className="btn-primary inline-block text-base py-4 px-10">
              Find My Frequency →
            </Link>
          </FadeIn>
        </FadeIn>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          THE SCIENCE
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 sm:px-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(59,130,246,0.06), transparent)' }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              The neuroscience
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              How your brain
              <br />
              <span style={{ color: '#3b82f6' }}>responds to sound.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Binaural beats exploit a quirk in how your auditory cortex processes
              stereo audio — generating a third frequency entirely inside your brain.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Binaural diagram */}
            <FadeIn delay={0.1}>
              <div className="glass rounded-3xl p-8">
                <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
                  Binaural beat mechanism
                </p>
                <BinauralDiagram />

                <div className="mt-8 pt-6 space-y-3"
                     style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#3b82f6' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Left ear receives carrier frequency (e.g. 200 Hz)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#a855f7' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Right ear receives a slightly offset frequency (e.g. 209 Hz)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#10b981' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      The brain&apos;s auditory cortex generates the 9 Hz difference — entraining your brainwaves to the alpha state
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Brainwave states */}
            <FadeIn delay={0.2}>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
                  Brainwave states & effects
                </p>
                {[
                  { band: 'Delta', hz: '1–4 Hz', state: 'Deep sleep & physical healing', color: '#f59e0b', desc: 'The deepest restoration state. Growth hormone release, immune repair, cellular regeneration.' },
                  { band: 'Theta', hz: '4–8 Hz', state: 'Deep meditation & emotional processing', color: '#ef4444', desc: 'Gateway between consciousness and sleep. Trauma processing, creativity, deep insight.' },
                  { band: 'Alpha', hz: '8–12 Hz', state: 'Calm wakefulness & stress relief', color: '#10b981', desc: 'The optimal learning and recovery state. Cortisol reduction, present-moment awareness.' },
                  { band: 'Beta', hz: '14–30 Hz', state: 'Alert concentration', color: '#3b82f6', desc: 'Active thinking, problem-solving, analytical focus. High performance cognition.' },
                  { band: 'Gamma', hz: '35–45 Hz', state: 'Peak cognition & transcendence', color: '#a855f7', desc: 'Highest frequency state. Peak awareness, cross-modal sensory binding, mystical experience.' },
                ].map((b, i) => (
                  <motion.div
                    key={b.band}
                    className="glass rounded-2xl p-4 flex items-start gap-4 cursor-default"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex-shrink-0">
                      <p className="text-lg font-black" style={{ color: b.color }}>{b.band}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{b.hz}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: b.color }}>{b.state}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Schumann section */}
          <FadeIn delay={0.15} className="mt-12">
            <div className="glass rounded-3xl p-8"
                 style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                       style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.3)' }}>
                    7.83
                  </div>
                  <p className="text-xs text-center mt-1.5" style={{ color: '#10b981' }}>Hz</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">Schumann Resonance</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      Earth&apos;s pulse
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                    The Earth&apos;s electromagnetic cavity resonates at a base frequency of 7.83 Hz —
                    the same frequency as a healthy human alpha brainwave. This isn&apos;t coincidence.
                    Human life evolved inside this frequency envelope for millions of years.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Solive can optionally add a Schumann layer to any session: a 7.83 Hz binaural beat
                    with LFO amplitude modulation that creates a subtle &ldquo;Earth breathing&rdquo; pulse —
                    grounding your session in the planet&apos;s own resonance.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          RESEARCH STATS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Measurable results
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              The numbers don&apos;t lie.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.08}>
                <StatCounter {...s} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 sm:px-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.05), transparent)' }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              The process
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Your session in
              <br />
              <span style={{ color: '#8b5cf6' }}>3 simple steps.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-[16.67%] right-[16.67%] h-px"
                 style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1), rgba(139,92,246,0.3))' }} />

            {HOW_STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.12}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative"
                       style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                          style={{ background: '#8b5cf6', color: '#fff' }}>
                      {i + 1}
                    </span>
                    <span style={{ color: '#8b5cf6' }}>{step.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HEADPHONE NOTICE + FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 sm:px-12 relative overflow-hidden">
        {/* Full-width wave decoration */}
        <OscilloscopeBackground color="#10b981" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.08), var(--bg-void) 70%)' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-sm"
                 style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              <span style={{ color: '#10b981' }}>Headphones required for binaural beats</span>
            </div>

            <h2 className="font-black tracking-tight mb-6"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)', lineHeight: 0.95 }}>
              Your healing
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                frequency is waiting.
              </span>
            </h2>

            <p className="text-xl mb-10 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Every moment you spend in the wrong resonance is a moment your body
              can&apos;t fully repair. It takes 60 seconds to find yours.
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/session"
                    className="btn-primary inline-block text-lg py-5 px-14"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 12px 50px rgba(16,185,129,0.45)',
                      color: '#000',
                    }}>
                Begin Your Session →
              </Link>
            </motion.div>

            <p className="mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              Free · No account required · Works on any device
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 sm:px-12 text-center"
              style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11"
                  stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
          <span className="font-bold text-sm">Solive</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Sound therapy research · Solfeggio frequencies · Binaural beats · Real-time cymatic 3D
        </p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <Link href="/session" className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            Start Session
          </Link>
          <Link href="/history" className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            History
          </Link>
          <Link href="/auth/login" className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
