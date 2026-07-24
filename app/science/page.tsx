'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'

const ThreeVisualizer = dynamic(() => import('@/components/ThreeVisualizer'), { ssr: false })

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Floating 3D cymatic object ───────────────────────────────────────────────
function Object3D({ hz, color, label }: { hz: number; color: string; label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      className="player-surface relative"
      style={{ aspectRatio: '1 / 1', width: '100%', borderRadius: 28, overflow: 'hidden' }}
    >
      <ThreeVisualizer hz={hz} isPlaying={false} analyserRef={{ current: null }} colorHex={color} vizMode="lissajous" />
      <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 5, pointerEvents: 'none' }}>
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--t3)', fontWeight: 700 }}>CYMATIC FORM</p>
        <p style={{ fontSize: '1.15rem', fontWeight: 900, color, letterSpacing: '-0.02em' }}>
          {hz}<span style={{ fontSize: '0.7rem', color: 'var(--t3)', marginLeft: 3, fontWeight: 500 }}>Hz</span>
        </p>
        {label && <p style={{ fontSize: '0.68rem', color: 'var(--t2)' }}>{label}</p>}
      </div>
    </motion.div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '20–20k', unit: 'Hz', label: 'Human hearing range', sub: 'From a deep rumble to a high whistle' },
  { value: '7.83', unit: 'Hz', label: "Earth's resonance", sub: 'The Schumann frequency of the planet' },
  { value: '1,480', unit: 'm/s', label: 'Sound in water', sub: '≈4× faster than in air — and you are ~60% water' },
  { value: '100', unit: 'yrs', label: 'Of brainwave science', sub: 'EEG has mapped neural rhythms since 1924' },
]

const SCIENCE = [
  {
    icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
    title: 'Brainwave entrainment',
    body: 'Expose the brain to a steady rhythm — a pulsing light or tone — and its electrical activity tends to fall into step with it. This "frequency-following response" is how sound can gently nudge you toward calm, focus, or sleep states.',
  },
  {
    icon: 'M4 12a8 8 0 0 1 16 0M8 12a4 4 0 0 1 8 0M2 12h2M20 12h2',
    title: 'Binaural beats',
    body: 'Play 200 Hz in one ear and 209 Hz in the other and your brain invents a third tone — a 9 Hz "beat" that exists only in your head. Discovered by Heinrich Wilhelm Dove in 1839, it lets sound target specific brainwave bands.',
  },
  {
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM6 12h12M12 6v12M8 8l8 8M16 8l-8 8',
    title: 'Cymatics — sound has shape',
    body: 'Ernst Chladni (1787) scattered sand on a vibrating plate and watched it snap into geometric patterns. Every frequency draws a different figure. What you see in a session is this made visible in 3D.',
  },
  {
    icon: 'M3 12h4l2-7 4 14 2-7h4',
    title: 'Resonance & the body',
    body: 'Everything that can vibrate has a natural frequency. Because tissue is largely water, vibration travels through the body readily — the basis of vibroacoustic therapy, now studied for relaxation, pain and sleep.',
  },
]

const BANDS = [
  { sym: 'δ', name: 'Delta',  hz: '1–4 Hz',   state: 'Deep sleep & healing',     color: '#e8a020' },
  { sym: 'θ', name: 'Theta',  hz: '4–8 Hz',   state: 'Meditation & creativity',  color: '#e05050' },
  { sym: 'α', name: 'Alpha',  hz: '8–12 Hz',  state: 'Calm focus & flow',        color: '#00c896' },
  { sym: 'β', name: 'Beta',   hz: '14–30 Hz', state: 'Alert concentration',      color: '#4a90e8' },
  { sym: 'γ', name: 'Gamma',  hz: '35–45 Hz', state: 'Peak cognition',           color: '#b06ef5' },
]

const FUN_FACTS = [
  { emoji: '🕳️', title: 'A black hole sings B♭', body: 'NASA detected pressure waves from a black hole in the Perseus cluster — a note ~57 octaves below middle C, the deepest sound ever recorded.' },
  { emoji: '🐈', title: 'A purr may heal bones', body: 'Cats purr between 25–150 Hz — the same range shown to promote bone density and tissue repair. Comfort, engineered.' },
  { emoji: '🦴', title: '40,000-year-old music', body: 'The oldest known instrument is a flute carved from bird bone and mammoth ivory — humans have chased frequency since the Ice Age.' },
  { emoji: '🌊', title: 'You are an instrument', body: 'Your eardrum moves less than the width of a hydrogen atom to hear the quietest sounds your brain can register.' },
  { emoji: '🎼', title: '440 is surprisingly new', body: 'Concert pitch (A = 440 Hz) was only standardized internationally in 1955. Orchestras once tuned all over the map.' },
  { emoji: '🐘', title: 'Conversations you can’t hear', body: 'Elephants and whales talk in infrasound below 20 Hz — travelling for miles through ground and ocean, beneath human hearing.' },
]

const QUOTES = [
  { text: 'If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.', who: 'Nikola Tesla', role: 'attributed' },
  { text: 'There is geometry in the humming of the strings, there is music in the spacing of the spheres.', who: 'Pythagoras', role: 'c. 500 BCE' },
  { text: 'Music is the arithmetic of sounds as optics is the geometry of light.', who: 'Claude Debussy', role: 'composer' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SciencePage() {
  const router = useRouter()

  return (
    <>
      <Header />

      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main className="relative z-10">

        {/* ══════════════ HERO ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 pt-32 pb-16"
                 style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8rem)' }}>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 16 }}>
                THE SCIENCE OF SOUND
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
                style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 20 }}>
                Sound is a force<br /><span style={{ color: 'var(--t2)' }}>you can feel.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                style={{ color: 'var(--t2)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 28, maxWidth: '30rem' }}>
                Every tone is a wave of pressure moving through the air — and through you.
                Here&apos;s what science actually knows about how frequency shapes the mind and body.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }}
                className="flex flex-wrap gap-3">
                <button onClick={() => router.push('/frequencies')} className="btn-primary" style={{ padding: '12px 26px' }}>
                  Explore frequencies →
                </button>
                <button onClick={() => router.push('/session')} className="pill-btn">
                  Start a session
                </button>
              </motion.div>
            </div>
            <Object3D hz={528} color="#5CE8DC" label="528 Hz · the 'love' tone" />
          </div>
        </section>

        {/* ══════════════ STAT BAND ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.07}>
                <div className="stat-card h-full">
                  <p className="tabular" style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6, color: 'var(--t1)' }}>
                    {s.value}<span style={{ fontSize: '0.85rem', color: 'var(--t3)', marginLeft: 4, fontWeight: 600 }}>{s.unit}</span>
                  </p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: 3 }}>{s.label}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--t3)', lineHeight: 1.4 }}>{s.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════ WHAT SCIENCE KNOWS ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>WHAT SCIENCE KNOWS</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 40, maxWidth: '32rem' }}>
              Four ideas behind{' '}<span style={{ color: 'var(--t2)' }}>sound healing.</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {SCIENCE.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <div className="glass-card grain h-full p-6">
                  <div className="relative z-10">
                    <div className="mb-5 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={c.icon} />
                      </svg>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{c.title}</h3>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--t2)' }}>{c.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════ BRAINWAVE BANDS ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>THE FIVE BRAINWAVE STATES</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 36 }}>
              Your brain runs on{' '}<span style={{ color: 'var(--t2)' }}>rhythms.</span>
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BANDS.map((b, i) => (
              <Reveal key={b.name} delay={i * 0.06}>
                <motion.div className="stat-card h-full" whileHover={{ y: -4 }} style={{ transition: 'transform 0.2s' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: 8, color: b.color }}>{b.sym}</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--t1)', marginBottom: 2 }}>{b.name}</p>
                  <p className="tabular" style={{ fontSize: '0.68rem', color: 'var(--t3)', fontFamily: 'monospace', marginBottom: 6 }}>{b.hz}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--t2)', lineHeight: 1.4 }}>{b.state}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════ FEATURE QUOTE + 3D ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <div className="glass-premium grain" style={{ borderRadius: 28 }}>
            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center p-8 sm:p-12">
              <Object3D hz={963} color="#a855f7" label="963 Hz · the 'crown' tone" />
              <Reveal>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="var(--accent)" style={{ opacity: 0.6, marginBottom: 16 }}>
                  <path d="M7 7h4v6H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm10 0h-4v6h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" opacity="0.35" />
                  <text x="3" y="19" fontSize="20" fontWeight="900" fill="var(--accent)">“</text>
                </svg>
                <p style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.02em', color: 'var(--t1)', marginBottom: 18 }}>
                  If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.
                </p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--t2)' }}>
                  Nikola Tesla <span style={{ color: 'var(--t4)', fontWeight: 500 }}>· attributed</span>
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════ FUN FACTS ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>FUN FACTS</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 40 }}>
              Sound is{' '}<span style={{ color: 'var(--t2)' }}>stranger than you think.</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FUN_FACTS.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <motion.div className="glass-card grain h-full p-6" whileHover={{ y: -5 }} style={{ transition: 'transform 0.2s' }}>
                  <div className="relative z-10">
                    <div style={{ fontSize: '1.9rem', marginBottom: 14 }}>{f.emoji}</div>
                    <h3 style={{ fontWeight: 800, fontSize: '0.98rem', marginBottom: 8, color: 'var(--t1)' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--t2)' }}>{f.body}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════ FAMOUS WORDS ══════════════ */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>FAMOUS WORDS</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 36 }}>
              Minds that listened{' '}<span style={{ color: 'var(--t2)' }}>closely.</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4">
            {QUOTES.map((q, i) => (
              <Reveal key={q.who} delay={i * 0.1}>
                <div className="glass-card grain h-full p-7 flex flex-col">
                  <div className="relative z-10 flex flex-col h-full">
                    <span style={{ fontSize: '2.4rem', lineHeight: 0.5, color: 'var(--accent)', opacity: 0.5, marginBottom: 18, fontFamily: 'Georgia, serif' }}>“</span>
                    <p style={{ fontSize: '0.98rem', lineHeight: 1.55, color: 'var(--t1)', fontWeight: 600, marginBottom: 20, flex: 1 }}>{q.text}</p>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--t1)' }}>{q.who}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>{q.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════ HONEST NOTE ══════════════ */}
        <section className="max-w-3xl mx-auto px-5 py-12">
          <Reveal>
            <div className="glass p-6 rounded-2xl" style={{ borderRadius: 18 }}>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.65, color: 'var(--t3)' }}>
                <span style={{ color: 'var(--t2)', fontWeight: 700 }}>A note on evidence:</span>{' '}
                Brainwave entrainment, binaural beats and cymatics are real, measurable phenomena. Many specific
                healing claims around individual frequencies are still being explored and aren&apos;t a substitute for
                medical care. Solive is built for relaxation, focus and curiosity — use it as a tool, not a treatment.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ══════════════ CTA ══════════════ */}
        <section className="px-5 py-24 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <Reveal>
            <div className="max-w-xl mx-auto">
              <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 16 }}>
                Now hear it<br /><span style={{ color: 'var(--t2)' }}>for yourself.</span>
              </h2>
              <p style={{ color: 'var(--t2)', fontSize: '0.95rem', marginBottom: 30, lineHeight: 1.6 }}>
                Pick a frequency, put on headphones, and feel the theory become experience.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => router.push('/frequencies')} className="btn-primary px-9 py-3.5 text-sm">
                  Browse frequencies →
                </button>
                <button onClick={() => router.push('/session')} className="btn-ghost px-8 py-3">
                  Build a session
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  )
}
