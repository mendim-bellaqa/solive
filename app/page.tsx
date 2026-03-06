'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'

const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false })

// ─── Frequency data ─────────────────────────────────────────────────────────
const FREQS = [
  { hz: 174,  name: 'Foundation',       color: '#e8a020', tagline: 'Natural pain relief',       effect: 'Lowers pain perception by acting directly on the autonomic nervous system.', research: 'ANS regulation studies show measurable pain reduction within 8–12 minutes of exposure.', wave: [0.3,0.5,0.8,0.6,0.4,0.7,0.9,0.6,0.3,0.5] },
  { hz: 285,  name: 'Quantum Cognition',color: '#e8a020', tagline: 'Cellular regeneration',     effect: 'Promotes tissue regeneration and cellular energy field restoration.', research: 'Cellular resonance research indicates interaction with membrane potential signaling.', wave: [0.5,0.7,0.4,0.9,0.5,0.3,0.8,0.6,0.4,0.7] },
  { hz: 396,  name: 'Liberation',       color: '#e05050', tagline: 'Release guilt & fear',       effect: 'Deactivates deep-seated limbic fear responses. Releases emotional blockages.', research: 'Limbic system resonance studies document emotional processing shifts.', wave: [0.6,0.3,0.8,0.5,0.9,0.4,0.6,0.8,0.3,0.7] },
  { hz: 417,  name: 'Transmutation',    color: '#e05050', tagline: 'Facilitate change',          effect: 'Breaks down crystallized neural patterns. Activates neuroplasticity.', research: 'Associated with enhanced neural pathway flexibility in longitudinal studies.', wave: [0.4,0.8,0.5,0.7,0.3,0.9,0.4,0.6,0.8,0.5] },
  { hz: 432,  name: 'Cosmic Tuning',    color: '#00c896', tagline: 'Deep calm & alignment',      effect: 'Aligns with Schumann resonance. Dramatically reduces cortisol and stress.', research: '432 Hz vs 440 Hz controlled study: 31.5% cortisol reduction in 5 minutes.', wave: [0.7,0.4,0.6,0.8,0.5,0.3,0.9,0.5,0.7,0.4] },
  { hz: 528,  name: 'Transformation',   color: '#00c896', tagline: 'The miracle tone',           effect: 'Reduces cortisol. Associated with DNA repair. Deep inner peace and calm.', research: 'Roth et al.: 528 Hz reduces cortisol in human salivary tests. DNA repair protocols.', wave: [0.5,0.9,0.4,0.7,0.8,0.3,0.6,0.9,0.4,0.7] },
  { hz: 639,  name: 'Connection',       color: '#4a90e8', tagline: 'Harmony & relationships',   effect: 'Activates oxytocin signaling pathways. Enhances empathy and communication.', research: 'Interpersonal sound therapy research documents prosocial behavior enhancement.', wave: [0.8,0.5,0.7,0.3,0.9,0.6,0.4,0.8,0.5,0.7] },
  { hz: 741,  name: 'Awakening',        color: '#7c6ff7', tagline: 'Focus & clarity',            effect: 'Detoxifies cells. Sharpens cognitive focus. Activates problem-solving capacity.', research: 'Beta wave entrainment studies link 741 Hz with enhanced analytical clarity.', wave: [0.3,0.7,0.9,0.4,0.6,0.8,0.5,0.3,0.7,0.9] },
  { hz: 852,  name: 'Third Eye',        color: '#b06ef5', tagline: 'Intuition & insight',        effect: 'Enhances melatonin production. Activates pineal gland. Higher awareness.', research: 'Theta-gamma coupling studies document elevated intuitive processing.', wave: [0.6,0.4,0.8,0.6,0.3,0.7,0.5,0.9,0.4,0.6] },
  { hz: 963,  name: 'Divine Connection',color: '#b06ef5', tagline: 'Pineal activation',          effect: 'Induces gamma brainwave coherence. Transcendent states and peak clarity.', research: 'Gamma coherence measured in meditators mirrors 963 Hz resonance patterns.', wave: [0.9,0.6,0.4,0.8,0.5,0.7,0.3,0.9,0.6,0.4] },
]

const STATS = [
  { value: '31.5', unit: '%', label: 'Cortisol reduction', sub: 'in 5 min at 432 Hz' },
  { value: '7',    unit: 'min', label: 'Brainwave shift',   sub: 'binaural beats take effect' },
  { value: '7.83', unit: 'Hz',  label: 'Schumann resonance',sub: "Earth's electromagnetic pulse" },
  { value: '10',   unit: '',    label: 'Solfeggio tones',   sub: 'each targeting a unique state' },
]

// Global popular mock data
const GLOBAL_POPULAR = [
  { hz: 528,  sessions: 24831, pct: 28 },
  { hz: 432,  sessions: 18244, pct: 21 },
  { hz: 396,  sessions: 12156, pct: 14 },
  { hz: 741,  sessions: 8902,  pct: 10 },
  { hz: 639,  sessions: 7823,  pct: 9  },
  { hz: 852,  sessions: 6411,  pct: 7  },
  { hz: 174,  sessions: 4231,  pct: 5  },
  { hz: 285,  sessions: 2890,  pct: 3  },
  { hz: 963,  sessions: 2102,  pct: 2  },
  { hz: 417,  sessions: 981,   pct: 1  },
]

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 5,
    period: 'month',
    tagline: 'For beginners',
    color: '#e8a020',
    features: ['5 sessions / month', 'All 10 frequencies', 'Basic 3D visualization', 'Session history (30 days)'],
    highlight: false,
  },
  {
    name: 'Healer',
    price: 10,
    period: 'month',
    tagline: 'Most popular',
    color: '#00c896',
    features: ['Unlimited sessions', 'All 10 frequencies', 'Advanced 3D visualization', 'Full session history', 'Binaural band control', 'Schumann layer'],
    highlight: true,
  },
  {
    name: 'Practitioner',
    price: 20,
    period: 'month',
    tagline: 'For professionals',
    color: '#4a90e8',
    features: ['Everything in Healer', 'Custom frequency blends', 'Download session recordings', 'Progress analytics', 'Priority support', 'Early access features'],
    highlight: false,
  },
  {
    name: 'Studio',
    price: 50,
    period: 'month',
    tagline: 'Full power',
    color: '#b06ef5',
    features: ['Everything in Practitioner', 'Unlimited devices', 'API access', 'White-label option', 'Custom brainwave profiles', 'Dedicated support'],
    highlight: false,
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.65, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}>
      {children}
    </motion.div>
  )
}

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
    function parse(hex: string): [number,number,number] {
      return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]
    }
    function draw() {
      animRef.current = requestAnimationFrame(draw)
      if (!canvasRef.current) return
      const cvs = canvasRef.current
      const w = cvs.offsetWidth, h = cvs.offsetHeight
      if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h }
      ctx.clearRect(0, 0, w, h)
      const [r,g,b] = parse(colorRef.current)
      const waves = [
        { amp:0.055, freq:0.0045, phase:0,   opacity:0.12, y:0.50 },
        { amp:0.035, freq:0.0072, phase:1.2, opacity:0.07, y:0.50 },
        { amp:0.080, freq:0.0025, phase:2.5, opacity:0.06, y:0.50 },
        { amp:0.025, freq:0.0110, phase:0.8, opacity:0.09, y:0.50 },
        { amp:0.120, freq:0.0018, phase:3.9, opacity:0.04, y:0.50 },
        { amp:0.040, freq:0.0060, phase:5.1, opacity:0.07, y:0.50 },
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
      t += 0.012
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

// Mini SVG Lissajous for frequency cards
function MiniLissajous({ hz, color, size = 72 }: { hz: number; color: string; size?: number }) {
  const getParams = (hz: number) => {
    if (hz <= 285) return { a:1, b:2, loops:2 }
    if (hz <= 417) return { a:2, b:3, loops:3 }
    if (hz <= 528) return { a:3, b:4, loops:4 }
    if (hz <= 741) return { a:4, b:5, loops:5 }
    return { a:5, b:7, loops:7 }
  }
  const { a, b, loops } = getParams(hz)
  const N = 180
  const half = size / 2
  const r = half * 0.82
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * Math.PI * 2 * loops
    const x = half + Math.sin(a * t) * r
    const y = half + Math.sin(b * t) * r
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pts + ' Z'} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round"
            opacity="0.8" className="spin-slow" style={{ transformOrigin: `${half}px ${half}px` }} />
      <circle cx={half} cy={half} r={3} fill={color} opacity="0.6" className="breathe" />
    </svg>
  )
}

function MiniWave({ points, color }: { points: number[]; color: string }) {
  const n = points.length, w = 80, h = 24
  const pts = points.map((v, i) => `${(i/(n-1))*w},${h - v*h*0.85}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

function BinauralDiagram() {
  return (
    <div className="space-y-4">
      {[
        { label:'Left ear',   hz:'200 Hz',     cycles:4.0,  color:'#4a90e8' },
        { label:'Right ear',  hz:'209 Hz',     cycles:4.45, color:'#b06ef5' },
        { label:'Brain hears',hz:'9 Hz · Alpha',cycles:0.45, color:'#00c896', thick:true },
      ].map(({ label, hz, cycles, color, thick }) => (
        <div key={label} className="flex items-center gap-4">
          <div className="w-24 flex-shrink-0 text-right">
            <p className="text-xs font-medium" style={{ color }}>{label}</p>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>{hz}</p>
          </div>
          <div className="flex-1 overflow-hidden h-8 flex items-center">
            <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none">
              <path
                d={`M0,14 ${Array.from({length:200},(_,i)=>`L${i},${14+Math.sin((i/200)*Math.PI*2*cycles)*(thick?10:8)}`).join(' ')}`}
                fill="none" stroke={color} strokeWidth={thick?2:1.2} opacity={thick?1:0.7}
              />
            </svg>
          </div>
        </div>
      ))}
      <p className="text-xs text-right pt-2" style={{ color:'var(--text-muted)' }}>
        Brain entrains to 9 Hz difference → alpha state
      </p>
    </div>
  )
}

function StatCounter({ value, unit, label, sub }: { value:string; unit:string; label:string; sub:string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once:true })
  return (
    <div ref={ref} className="glass-card p-5 text-center">
      <div className="shimmer-overlay" />
      <div className="flex items-baseline justify-center gap-1 mb-1">
        <motion.span className="text-3xl font-black tabular-nums" style={{ color:'var(--text-primary)' }}
          initial={{ opacity:0, scale:0.7 }}
          animate={isInView ? { opacity:1, scale:1 } : {}}
          transition={{ duration:0.5, ease:'backOut' }}>
          {value}
        </motion.span>
        <span className="text-lg font-bold" style={{ color:'var(--text-secondary)' }}>{unit}</span>
      </div>
      <p className="text-sm font-semibold mb-0.5">{label}</p>
      <p className="text-xs" style={{ color:'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

// ─── Recent Sessions (client-side Supabase) ─────────────────────────────────
function RecentSessions() {
  const [sessions, setSessions] = useState<Array<{
    id:string; hz:number; created_at:string; before_score:number|null; after_score:number|null; duration_seconds:number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<boolean>(false)

  useEffect(() => {
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (!u) { setLoading(false); return }
      setUser(true)
      const { data } = await supabase
        .from('sessions')
        .select('id,hz,created_at,before_score,after_score,duration_seconds')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setSessions(data ?? [])
      setLoading(false)
    })
  }, [])

  if (!user && !loading) return null
  if (loading) return (
    <section className="py-20 px-5 sm:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="skeleton h-6 w-48 mb-8 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      </div>
    </section>
  )
  if (sessions.length === 0) return null

  // Count per Hz for percentage
  const counts: Record<number, number> = {}
  sessions.forEach(s => { counts[s.hz] = (counts[s.hz] || 0) + 1 })
  const total = sessions.length

  return (
    <FadeIn>
      <section className="py-20 px-5 sm:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Your recent activity
              </p>
              <h2 className="text-2xl sm:text-3xl font-black">Last listened frequencies</h2>
            </div>
            <Link href="/history" className="btn-ghost text-sm py-2 px-4">View all →</Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sessions.slice(0, 10).map((s, i) => {
              const freq = FREQS.find(f => f.hz === s.hz) || FREQS[5]
              const pct  = Math.round((counts[s.hz] / total) * 100)
              const improvement = s.before_score !== null && s.after_score !== null
                ? s.after_score - s.before_score : null
              const date = new Date(s.created_at)

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="glass-card p-4 text-center group cursor-default"
                >
                  <div className="shimmer-overlay" />
                  <div className="relative z-10">
                    {/* Mini Lissajous */}
                    <div className="flex justify-center mb-2">
                      <MiniLissajous hz={freq.hz} color={freq.color} size={60} />
                    </div>

                    {/* Hz */}
                    <p className="text-lg font-black tabular-nums mb-0.5" style={{ color: freq.color }}>
                      {freq.hz}<span className="text-xs font-normal opacity-60 ml-0.5">Hz</span>
                    </p>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{freq.name}</p>

                    {/* % listened */}
                    <div className="mb-1.5">
                      <div className="h-1 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.05 + 0.3, duration: 0.6, ease: 'easeOut' }}
                          style={{ background: freq.color, boxShadow: `0 0 6px ${freq.color}80` }} />
                      </div>
                      <p className="text-xs" style={{ color: freq.color }}>{pct}%</p>
                    </div>

                    {/* Meta */}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {date.toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                    </p>
                    {improvement !== null && (
                      <p className="text-xs font-bold mt-0.5"
                         style={{ color: improvement > 0 ? '#00c896' : improvement < 0 ? '#e05050' : 'var(--text-muted)' }}>
                        {improvement > 0 ? `+${improvement}` : improvement === 0 ? '±0' : improvement} feeling
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </FadeIn>
  )
}

// ─── Global Popular ──────────────────────────────────────────────────────────
function GlobalPopularSection() {
  return (
    <section className="py-24 px-5 sm:px-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,144,232,0.05), transparent)' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Community data
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
            What humans prefer most.
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
            Based on global Solive sessions. The frequencies your body & mind gravitates toward most.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <FadeIn delay={0.1}>
            <div className="glass-card p-6">
              <div className="shimmer-overlay" />
              <p className="text-xs uppercase tracking-widest mb-5 relative z-10" style={{ color:'var(--text-muted)' }}>
                Frequency popularity ranking
              </p>
              <div className="space-y-3 relative z-10">
                {GLOBAL_POPULAR.map(({ hz, sessions, pct }, i) => {
                  const f = FREQS.find(f => f.hz === hz) || FREQS[5]
                  return (
                    <motion.div key={hz} className="flex items-center gap-3"
                      initial={{ opacity:0, x:-12 }}
                      whileInView={{ opacity:1, x:0 }}
                      viewport={{ once:true }}
                      transition={{ delay: i * 0.06 }}>
                      {/* Rank */}
                      <span className="text-xs font-bold w-4 text-right flex-shrink-0"
                            style={{ color: i < 3 ? f.color : 'var(--text-muted)' }}>
                        {i+1}
                      </span>
                      {/* Mini Lissajous */}
                      <div className="flex-shrink-0">
                        <MiniLissajous hz={hz} color={f.color} size={28} />
                      </div>
                      {/* Label */}
                      <div className="w-16 flex-shrink-0">
                        <p className="text-xs font-bold tabular-nums" style={{ color: f.color }}>{hz} Hz</p>
                        <p className="text-xs truncate" style={{ color:'var(--text-muted)' }}>{f.name}</p>
                      </div>
                      {/* Bar */}
                      <div className="flex-1 h-2 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: f.color, boxShadow:`0 0 8px ${f.color}60` }}
                          initial={{ width:0 }}
                          whileInView={{ width:`${pct}%` }}
                          viewport={{ once:true }}
                          transition={{ delay: i*0.06+0.2, duration:0.7, ease:'easeOut' }} />
                      </div>
                      {/* Pct + count */}
                      <div className="w-14 flex-shrink-0 text-right">
                        <p className="text-xs font-semibold" style={{ color: f.color }}>{pct}%</p>
                        <p className="text-xs" style={{ color:'var(--text-muted)' }}>{(sessions/1000).toFixed(1)}k</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </FadeIn>

          {/* Top 3 podium */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-6">
              <div className="shimmer-overlay" />
              <p className="text-xs uppercase tracking-widest mb-5 relative z-10" style={{ color:'var(--text-muted)' }}>
                Most transformative
              </p>
              <div className="space-y-4 relative z-10">
                {GLOBAL_POPULAR.slice(0,3).map(({ hz, sessions, pct }, i) => {
                  const f = FREQS.find(f => f.hz === hz) || FREQS[5]
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <motion.div key={hz}
                      className="flex items-center gap-5 p-4 rounded-2xl"
                      style={{ background:`${f.color}0d`, border:`1px solid ${f.color}25` }}
                      initial={{ opacity:0, scale:0.95 }}
                      whileInView={{ opacity:1, scale:1 }}
                      viewport={{ once:true }}
                      transition={{ delay: i * 0.1 }}>
                      <span className="text-2xl">{medals[i]}</span>
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                        <MiniLissajous hz={hz} color={f.color} size={48} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-base" style={{ color:f.color }}>{hz} Hz</p>
                        <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{f.name}</p>
                        <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{f.tagline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black tabular-nums" style={{ color:f.color }}>{pct}%</p>
                        <p className="text-xs" style={{ color:'var(--text-muted)' }}>{sessions.toLocaleString()}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-5 pt-4 relative z-10" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                  Based on {GLOBAL_POPULAR.reduce((a,b) => a+b.sessions,0).toLocaleString()} global sessions.
                  528 Hz consistently chosen for anxiety relief and emotional transformation.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing Section ─────────────────────────────────────────────────────────
function PricingSection() {
  return (
    <section className="py-28 px-5 sm:px-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(176,110,245,0.06), transparent)' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Plans
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Choose your journey.
          </h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
            Start free. Upgrade when you&apos;re ready to go deeper.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm"
               style={{ background:'rgba(176,110,245,0.1)', border:'1px solid rgba(176,110,245,0.25)', color:'#b06ef5' }}>
            <span className="live-dot" style={{ background:'#b06ef5', width:6, height:6 }} />
            Payments coming soon — plans shown for preview
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.08}>
              <motion.div
                className={plan.highlight ? 'glass-premium' : 'glass-card'}
                style={{
                  border: plan.highlight ? `1.5px solid ${plan.color}55` : undefined,
                  boxShadow: plan.highlight ? `0 0 60px ${plan.color}18` : undefined,
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="shimmer-overlay" />

                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: plan.color, color: '#000' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="relative z-10 p-6">
                  {/* Header */}
                  <div className="mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                         style={{ background:`${plan.color}18`, border:`1px solid ${plan.color}35` }}>
                      <MiniLissajous hz={[174,528,741,963][i]} color={plan.color} size={28} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                       style={{ color: plan.color }}>{plan.tagline}</p>
                    <h3 className="text-xl font-black">{plan.name}</h3>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black tabular-nums" style={{ color: plan.color }}>
                      ${plan.price}
                    </span>
                    <span className="text-sm" style={{ color:'var(--text-muted)' }}>/ {plan.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(feat => (
                      <li key={feat} className="flex items-start gap-2 text-sm"
                          style={{ color:'var(--text-secondary)' }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                          <circle cx="8" cy="8" r="7" fill={`${plan.color}20`} />
                          <path d="M5 8l2 2 4-4" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all opacity-50 cursor-not-allowed"
                    style={{
                      background: plan.highlight ? plan.color : 'rgba(255,255,255,0.07)',
                      color: plan.highlight ? '#000' : 'var(--text-secondary)',
                      border: plan.highlight ? 'none' : `1px solid rgba(255,255,255,0.12)`,
                    }}
                  >
                    Coming Soon
                  </button>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3} className="text-center mt-10">
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>
            All sessions are free during the beta period. No card required.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Landing page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [hzIdx, setHzIdx]       = useState(5)
  const [hoveredHz, setHoveredHz] = useState<number | null>(null)

  const displayIdx  = hoveredHz !== null ? FREQS.findIndex(f => f.hz === hoveredHz) : hzIdx
  const currentFreq = FREQS[displayIdx >= 0 ? displayIdx : hzIdx]

  useEffect(() => {
    const id = setInterval(() => setHzIdx(i => (i + 1) % FREQS.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ background: 'var(--bg-void)', color: 'var(--text-primary)' }}>
      <OnboardingModal />
      <Header />

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden pt-16">
        <OscilloscopeBackground color={currentFreq.color} />

        {/* Radial glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${currentFreq.color}10 0%, transparent 70%)` }}
          transition={{ duration: 1.2 }}
        />

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-14 lg:px-20 max-w-6xl mx-auto w-full pt-8 pb-28">

          {/* Live Hz badge */}
          <AnimatePresence mode="wait">
            <motion.div key={currentFreq.hz}
              initial={{ opacity:0, y:-8, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:8, scale:0.95 }}
              transition={{ duration:0.35 }}
              className="inline-flex items-center gap-2.5 mb-8 text-sm px-4 py-2 rounded-full self-start"
              style={{ background:`${currentFreq.color}12`, border:`1px solid ${currentFreq.color}30` }}>
              <span className="live-dot" style={{ background:currentFreq.color }} />
              <span className="font-semibold tabular-nums" style={{ color:currentFreq.color }}>{currentFreq.hz} Hz</span>
              <span className="opacity-70" style={{ color:currentFreq.color }}>{currentFreq.name} — {currentFreq.tagline}</span>
            </motion.div>
          </AnimatePresence>

          {/* Headline */}
          <h1 className="font-black tracking-tight leading-none mb-6"
              style={{ fontSize:'clamp(3rem, 9vw, 8rem)', lineHeight:0.95 }}>
            Sound is<br />
            <AnimatePresence mode="wait">
              <motion.span key={currentFreq.hz}
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-20 }}
                transition={{ duration:0.4 }}
                style={{
                  background:`linear-gradient(135deg, ${currentFreq.color} 0%, ${currentFreq.color}99 100%)`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                  display:'inline-block',
                }}>
                medicine.
              </motion.span>
            </AnimatePresence>
          </h1>

          {/* Sub */}
          <p className="text-xl sm:text-2xl mb-4 max-w-2xl leading-relaxed" style={{ color:'var(--text-secondary)' }}>
            The right frequency at the right moment reduces stress hormones,
            activates cellular repair, and shifts your brainwave state in under 5 minutes.
          </p>
          <p className="text-base mb-10 max-w-xl" style={{ color:'var(--text-muted)' }}>
            Solive analyzes your state across 5 dimensions and prescribes the exact Solfeggio frequency
            + binaural beat — played with a real-time 3D cymatic visualization that reacts to every oscillation.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}>
              <Link href="/session" className="btn-primary text-center block text-base py-4 px-8"
                    style={{ background:currentFreq.color, boxShadow:`0 8px 40px ${currentFreq.color}50`, color:'#000', transition:'all 0.5s ease' }}>
                Begin Your Session →
              </Link>
            </motion.div>
            <a href="#frequencies" className="btn-ghost text-center text-base py-4 px-8">
              Explore the 10 Frequencies ↓
            </a>
          </div>

          {/* Proof points */}
          <div className="flex flex-wrap gap-2.5">
            {['528 Hz reduces cortisol by 31.5%','Binaural beats shift brainwaves in 7 min',"7.83 Hz Schumann = Earth's pulse",'10 frequencies, each targeting a state'].map(fact => (
              <span key={fact} className="text-xs px-3 py-1.5 rounded-full"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text-muted)' }}>
                ✓ {fact}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" style={{ color:'var(--text-muted)' }}>
          <motion.div animate={{ y:[0,7,0] }} transition={{ repeat:Infinity, duration:1.8 }}>
            <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
              <rect x="1" y="1" width="12" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <motion.circle cx="7" cy="6" r="2.5" fill="currentColor" animate={{ cy:[6,13,6] }} transition={{ repeat:Infinity, duration:1.8 }} />
            </svg>
          </motion.div>
          <span className="text-xs opacity-40">Scroll</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          RECENT SESSIONS (logged in users)
      ═══════════════════════════════════════════════════════════════ */}
      <RecentSessions />

      {/* ═══════════════════════════════════════════════════════════════
          FREQUENCIES
      ═══════════════════════════════════════════════════════════════ */}
      <section id="frequencies" className="py-28 px-5 sm:px-12">
        <FadeIn className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>
              The frequency library
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              10 healing frequencies.
              <br />
              <span style={{ color:'var(--text-secondary)' }}>Each with a purpose.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color:'var(--text-muted)' }}>
              Every Solfeggio frequency interacts differently with your physiology.
              Hover to explore — let Solive prescribe which one you need today.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {FREQS.map((f, i) => (
              <FadeIn key={f.hz} delay={i * 0.04}>
                <motion.div
                  className="glass-card rounded-2xl p-5 cursor-pointer group relative overflow-hidden"
                  style={{ border:`1px solid ${f.color}20` }}
                  onHoverStart={() => setHoveredHz(f.hz)}
                  onHoverEnd={() => setHoveredHz(null)}
                  whileHover={{ scale:1.02, borderColor:`${f.color}50` }}
                  transition={{ duration:0.2 }}
                >
                  <div className="shimmer-overlay" />

                  {/* Hover glow */}
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background:`radial-gradient(ellipse at 30% 40%, ${f.color}12, transparent 70%)` }}
                    initial={{ opacity:0 }}
                    whileHover={{ opacity:1 }} />

                  <div className="relative z-10">
                    {/* Hz + Lissajous */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-black tabular-nums" style={{ color:f.color }}>
                          {f.hz}<span className="text-sm font-normal ml-0.5 opacity-70">Hz</span>
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color:'var(--text-muted)' }}>
                          {f.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <MiniLissajous hz={f.hz} color={f.color} size={40} />
                        <MiniWave points={f.wave} color={f.color} />
                      </div>
                    </div>

                    <p className="text-sm font-medium mb-2" style={{ color:f.color }}>{f.tagline}</p>

                    <motion.p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}
                      initial={{ opacity:0.5 }} whileHover={{ opacity:1 }}>
                      {f.effect}
                    </motion.p>

                    <motion.p className="text-xs mt-2 italic border-t pt-2"
                      style={{ color:'var(--text-muted)', borderColor:`${f.color}20` }}
                      initial={{ opacity:0 }} whileHover={{ opacity:1 }} transition={{ delay:0.05 }}>
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
          GLOBAL POPULAR
      ═══════════════════════════════════════════════════════════════ */}
      <GlobalPopularSection />

      {/* ═══════════════════════════════════════════════════════════════
          THE SCIENCE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="science" className="py-28 px-5 sm:px-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background:'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(74,144,232,0.05), transparent)' }} />
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>The neuroscience</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              How your brain<br /><span style={{ color:'#4a90e8' }}>responds to sound.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color:'var(--text-muted)' }}>
              Binaural beats exploit a quirk in how your auditory cortex processes stereo audio — generating a third frequency inside your brain.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <FadeIn delay={0.1}>
              <div className="glass-card p-8">
                <div className="shimmer-overlay" />
                <p className="text-xs uppercase tracking-widest mb-6 relative z-10" style={{ color:'var(--text-muted)' }}>Binaural beat mechanism</p>
                <div className="relative z-10"><BinauralDiagram /></div>
                <div className="mt-8 pt-6 space-y-3 relative z-10" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                  {[
                    { color:'#4a90e8', text:'Left ear receives carrier frequency (e.g. 200 Hz)' },
                    { color:'#b06ef5', text:'Right ear receives a slightly offset frequency (e.g. 209 Hz)' },
                    { color:'#00c896', text:"The brain's auditory cortex generates the 9 Hz difference — entraining your brainwaves to the alpha state" },
                  ].map(({ color, text }) => (
                    <div key={text} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background:color }} />
                      <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-widest mb-6" style={{ color:'var(--text-muted)' }}>Brainwave states & effects</p>
                {[
                  { band:'Delta', hz:'1–4 Hz',   state:'Deep sleep & physical healing',          color:'#e8a020', desc:'Growth hormone release, immune repair, cellular regeneration.' },
                  { band:'Theta', hz:'4–8 Hz',   state:'Deep meditation & emotional processing', color:'#e05050', desc:'Gateway between consciousness and sleep. Trauma processing, creativity.' },
                  { band:'Alpha', hz:'8–12 Hz',  state:'Calm wakefulness & stress relief',       color:'#00c896', desc:'The optimal learning and recovery state. Cortisol reduction.' },
                  { band:'Beta',  hz:'14–30 Hz', state:'Alert concentration',                    color:'#4a90e8', desc:'Active thinking, problem-solving, analytical focus.' },
                  { band:'Gamma', hz:'35–45 Hz', state:'Peak cognition & transcendence',         color:'#b06ef5', desc:'Highest frequency state. Peak awareness, mystical experience.' },
                ].map((b, i) => (
                  <motion.div key={b.band}
                    className="glass-card p-4 flex items-start gap-4 cursor-default"
                    initial={{ opacity:0, x:20 }}
                    whileInView={{ opacity:1, x:0 }}
                    viewport={{ once:true }}
                    transition={{ delay:i*0.07 }}
                    whileHover={{ x:4 }}>
                    <div className="shimmer-overlay" />
                    <div className="flex-shrink-0 relative z-10">
                      <p className="text-lg font-black" style={{ color:b.color }}>{b.band}</p>
                      <p className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{b.hz}</p>
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-semibold mb-0.5" style={{ color:b.color }}>{b.state}</p>
                      <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Schumann */}
          <FadeIn delay={0.15} className="mt-12">
            <div className="glass-card p-8" style={{ border:'1px solid rgba(0,200,150,0.2)' }}>
              <div className="shimmer-overlay" />
              <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl glass-orb flex items-center justify-center text-lg font-black"
                       style={{ color:'#00c896', border:'1px solid rgba(0,200,150,0.35)' }}>
                    7.83
                  </div>
                  <p className="text-xs text-center mt-1.5" style={{ color:'#00c896' }}>Hz</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">Schumann Resonance</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(0,200,150,0.12)', color:'#00c896' }}>Earth&apos;s pulse</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color:'var(--text-secondary)' }}>
                    The Earth&apos;s electromagnetic cavity resonates at 7.83 Hz — the same frequency as a healthy human alpha brainwave. Human life evolved inside this frequency for millions of years.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color:'var(--text-muted)' }}>
                    Solive can optionally add a Schumann layer to any session — a 7.83 Hz binaural beat with LFO modulation creating an &ldquo;Earth breathing&rdquo; pulse.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-5 sm:px-12">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>Measurable results</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">The numbers don&apos;t lie.</h2>
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
      <section className="py-28 px-5 sm:px-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background:'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,111,247,0.05), transparent)' }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>The process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Your session in<br /><span style={{ color:'#7c6ff7' }}>3 simple steps.</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-10 left-[16.67%] right-[16.67%] h-px"
                 style={{ background:'linear-gradient(90deg, rgba(124,111,247,0.3), rgba(124,111,247,0.1), rgba(124,111,247,0.3))' }} />
            {[
              { n:'01', title:'Answer 5 questions',       desc:'Tap through a short questionnaire about your current state. No typing — just tap.', icon:'📋' },
              { n:'02', title:'Receive your prescription', desc:'Our weighted scoring engine processes 50+ data points and prescribes your exact frequency combination.', icon:'⚗️' },
              { n:'03', title:'Experience your frequency', desc:'The studio plays your personalized session with a real-time 3D Lissajous visualization reacting to every oscillation.', icon:'🌀' },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.12}>
                <div className="flex flex-col items-center text-center">
                  <motion.div className="glass-card w-20 h-20 rounded-2xl mb-5 flex items-center justify-center relative"
                    style={{ border:'1px solid rgba(124,111,247,0.25)' }}
                    whileHover={{ scale:1.05, rotate:3 }}>
                    <div className="shimmer-overlay" />
                    <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                          style={{ background:'#7c6ff7', color:'#fff' }}>{i+1}</span>
                    <span className="text-2xl relative z-10">{step.icon}</span>
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:'var(--text-muted)' }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════════════ */}
      <PricingSection />

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-12 relative overflow-hidden">
        <OscilloscopeBackground color="#00c896" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background:'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,200,150,0.07), var(--bg-void) 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-sm"
                 style={{ background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.22)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="1.5">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              <span style={{ color:'#00c896' }}>Headphones required for binaural beats</span>
            </div>

            <h2 className="font-black tracking-tight mb-6"
                style={{ fontSize:'clamp(2.5rem, 7vw, 6rem)', lineHeight:0.95 }}>
              Your healing<br />
              <span style={{ background:'linear-gradient(135deg, #00c896, #4a90e8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                frequency is waiting.
              </span>
            </h2>

            <p className="text-xl mb-10 max-w-lg mx-auto" style={{ color:'var(--text-secondary)' }}>
              Every moment in the wrong resonance is a moment your body can&apos;t fully repair.
              It takes 60 seconds to find yours.
            </p>

            <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}>
              <Link href="/session" className="btn-primary inline-block text-lg py-5 px-14"
                    style={{ background:'linear-gradient(135deg, #00c896, #059669)', boxShadow:'0 12px 50px rgba(0,200,150,0.4)', color:'#000' }}>
                Begin Your Session →
              </Link>
            </motion.div>

            <p className="mt-6 text-sm" style={{ color:'var(--text-muted)' }}>
              Free · No account required · Works on any device
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-5 sm:px-12 text-center" style={{ borderTop:'1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11" stroke="#00c896" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
          <span className="font-bold text-sm">Solive</span>
        </div>
        <p className="text-xs" style={{ color:'var(--text-muted)' }}>
          Sound therapy research · Solfeggio frequencies · Binaural beats · Real-time cymatic 3D
        </p>
        <div className="flex items-center justify-center gap-6 mt-4">
          {[
            { label:'Start Session', href:'/session' },
            { label:'History', href:'/history' },
            { label:'Sign in', href:'/auth/login' },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="text-xs hover:opacity-80 transition-opacity" style={{ color:'var(--text-muted)' }}>
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
