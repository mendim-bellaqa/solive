'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const HeroOrb        = dynamic(() => import('@/components/HeroOrb'), { ssr: false })
const EntrainmentLab = dynamic(() => import('@/components/home/EntrainmentLab'), { ssr: false })
const PathwayDiagram = dynamic(() => import('@/components/home/PathwayDiagram'), { ssr: false })
const CarrierCeiling = dynamic(() => import('@/components/home/CarrierCeiling'), { ssr: false })
const StateSelector  = dynamic(() => import('@/components/home/StateSelector'), { ssr: false })

// ─── Data ─────────────────────────────────────────────────────────────────────

/** Four numbers that are all verifiable, and that set up the sections below. */
const THRESHOLDS = [
  {
    value: '10⁻¹¹ m', label: 'Eardrum travel',
    sub: 'Movement at the quietest audible sound — a shorter distance than the width of a hydrogen atom.',
  },
  {
    value: '~10 µs', label: 'Interaural resolution',
    sub: 'The timing gap between your two ears that the brainstem can still measure. Binaural beats run on this circuit.',
  },
  {
    value: '1839', label: 'First described',
    sub: 'Heinrich Wilhelm Dove documents the binaural beat. It stays a curiosity for another 134 years.',
  },
  {
    value: '1.5 kHz', label: 'The hard ceiling',
    sub: 'Above this carrier, auditory nerves stop firing in step with the wave and the beat simply never forms.',
  },
]

const QUICK_HZ = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963]

const FACTS = [
  {
    title: 'Your ears emit sound',
    body: 'The cochlea does not just receive — outer hair cells actively amplify quiet sound, and that amplifier leaks. A healthy ear produces faint tones a microphone in the ear canal can record. Newborn hearing screening works by playing a click and listening for the echo that comes back.',
    source: 'Otoacoustic emissions · Kemp, 1978',
  },
  {
    title: 'You hear notes that are not there',
    body: 'Strip the lowest harmonic out of a musical tone and the pitch you perceive does not move. The brain reconstructs the fundamental from the spacing of what remains. It is why a phone speaker physically incapable of reproducing a bass line still lets you hear one.',
    source: 'The missing fundamental · Seebeck, 1841',
  },
  {
    title: 'The brain adjusts its own microphone',
    body: 'A bundle of nerve fibres runs the wrong way — down from the brainstem into the cochlea. It lets the brain turn the ear\'s own amplifier down, sharpening a voice out of background noise. Hearing is an outgoing instruction as much as an incoming signal.',
    source: 'Medial olivocochlear efferents',
  },
  {
    title: 'Deep bass is partly a balance sense',
    body: 'The saccule is a vestibular organ, part of the apparatus that tells you which way is up. It also keeps measurable sensitivity to low frequencies at high levels. Some of what a heavy bass note does to you is not being heard at all.',
    source: 'Todd & Cody, acoustic vestibular response',
  },
  {
    title: 'Forgotten for 134 years',
    body: 'Dove\'s 1839 binaural beat sat unexamined until Gerald Oster revived it in Scientific American in 1973. His interest was diagnostic, not therapeutic: a person who cannot perceive the beat may have a neurological difference worth investigating.',
    source: 'Oster, "Auditory Beats in the Brain", 1973',
  },
  {
    title: '40 Hz is the auditory system\'s favourite rate',
    body: 'Drive the ear with a rhythm and the brain follows it best at around 40 Hz — the response peaks there and falls away either side. It is reliable enough to be used clinically to test hearing in patients who cannot tell you what they hear.',
    source: '40 Hz auditory steady-state response · Galambos, 1981',
  },
]

// ─── Fade in on scroll ────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Hz input ─────────────────────────────────────────────────────────────────
function HzInput({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const sm = size === 'sm'

  const go = useCallback(() => {
    const n = Number(value)
    if (n >= 1 && n <= 20000) {
      router.push(`/studio?hz=${n}&binaural=alpha&duration=30`)
    } else {
      setError(true)
      setTimeout(() => setError(false), 600)
    }
  }, [value, router])

  return (
    <motion.div
      animate={error ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className="hz-input-group"
    >
      <span className="hz-glyph" aria-hidden>
        <svg width={sm ? 16 : 18} height={sm ? 16 : 18} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 12 Q5 5 8 12 Q11 19 14 12 Q17 5 20 12" />
        </svg>
      </span>
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()}
        placeholder="432"
        min={1}
        max={20000}
        aria-label="Enter frequency in Hz"
        style={{ fontSize: sm ? '1.15rem' : undefined, width: sm ? 86 : undefined }}
      />
      <span className="hz-unit" style={{ fontSize: sm ? '0.72rem' : undefined }}>Hz</span>
      <button
        className="hz-play-btn"
        onClick={go}
        disabled={!value}
        style={{ padding: sm ? '0 16px' : undefined, minHeight: sm ? 40 : 46 }}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const heroRef = useRef<HTMLElement>(null)

  // Reading-progress hairline under the header.
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  // The orb sinks and dims as the hero leaves — the page reads as one camera
  // move rather than a stack of unrelated screens.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  // Both fades hold at full opacity through the first stretch of the scroll —
  // dimming type that is still comfortably on screen reads as a glitch, not as
  // depth. They only give way once the element is genuinely on its way out.
  const orbY        = useTransform(heroProgress, [0, 1], ['0%', '18%'])
  const orbScale    = useTransform(heroProgress, [0, 1], [1, 0.88])
  const orbFade     = useTransform(heroProgress, [0.25, 0.95], [1, 0])
  const contentFade = useTransform(heroProgress, [0.35, 0.9], [1, 0])

  // Suppress the parallax entirely when the visitor has asked for less motion.
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return (
    <>
      <Header />
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden />

      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" />
        <div className="ambient-orb" />
        <div className="ambient-orb" />
      </div>

      <main className="relative z-10">

        {/* ═══════════════ HERO ═══════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative flex flex-col justify-center overflow-hidden px-5"
          style={{
            minHeight: '100svh',
            paddingTop: 'calc(env(safe-area-inset-top) + 7rem)',
            paddingBottom: '5rem',
          }}
        >
          <div className="hero-floor" aria-hidden />

          <div className="wrap relative z-10 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-8 items-center">

            {/* Copy */}
            <motion.div
              className="order-2 lg:order-1"
              style={reduced ? undefined : { opacity: contentFade }}
            >
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass"
                style={{ marginBottom: 'clamp(24px, 4vw, 40px)' }}
              >
                <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--accent)' }} aria-hidden />
                <span style={{ color: 'var(--t3)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                  PSYCHOACOUSTIC ENGINE · LIVE 3D
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="display"
                style={{ fontSize: 'clamp(2.6rem, 6.2vw, 5rem)', marginBottom: '1.4rem' }}
              >
                Tune the instrument<br />
                <span className="spectral">you think with.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="lede"
                style={{ marginBottom: '2.4rem', maxWidth: '31rem' }}
              >
                Sessions built on how the auditory system actually behaves — beats carried
                where the nerves can still track them, targeted at a named brainwave band,
                and drawn in real time as 3D cymatics. Any tone from 1 to 20,000 Hz.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <HzInput />
                <span style={{ color: 'var(--t4)', fontSize: '0.8rem', padding: '0 4px' }}>or</span>
                <button onClick={() => router.push('/session')} className="pill-btn">
                  Find my frequency
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ color: 'var(--t4)', fontSize: '0.75rem', marginTop: 16 }}
              >
                No account needed · Headphones strongly recommended
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 }}
                className="flex flex-wrap gap-2"
                style={{ marginTop: 28 }}
              >
                {QUICK_HZ.map(hz => (
                  <button
                    key={hz}
                    onClick={() => router.push(`/studio?hz=${hz}&binaural=alpha&duration=30`)}
                    style={{
                      background: 'var(--glass-1)',
                      border: '1px solid var(--border)',
                      color: 'var(--t3)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: 999,
                      transition: 'all 0.18s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.background = 'var(--glass-2)'
                      el.style.borderColor = 'var(--border-mid)'
                      el.style.color = 'var(--t1)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.background = 'var(--glass-1)'
                      el.style.borderColor = 'var(--border)'
                      el.style.color = 'var(--t3)'
                    }}
                  >
                    {hz} Hz
                  </button>
                ))}
              </motion.div>
            </motion.div>

            {/* Orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="order-1 lg:order-2 relative mx-auto w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[580px]"
              style={{ aspectRatio: '1 / 1' }}
            >
              <motion.div
                style={
                  reduced
                    ? { position: 'absolute', inset: 0 }
                    : { position: 'absolute', inset: 0, y: orbY, scale: orbScale, opacity: orbFade }
                }
              >
                <div
                  aria-hidden
                  className="absolute breathe-ring"
                  style={{
                    inset: '-8%',
                    background: 'radial-gradient(circle at 50% 50%, rgba(92,232,220,0.14), rgba(139,92,246,0.07) 45%, transparent 68%)',
                    filter: 'blur(26px)',
                    pointerEvents: 'none',
                  }}
                />
                <HeroOrb />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-7 left-1/2 -translate-x-1/2"
            style={{ color: 'var(--t4)' }}
            aria-hidden
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════════════ THRESHOLDS ════════════════════════════════════ */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal>
              <p style={{ fontSize: '0.86rem', color: 'var(--t3)', maxWidth: '38rem', marginBottom: 28, lineHeight: 1.7 }}>
                Four measurements that decide what sound can and cannot do to you.
                Everything below follows from them.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {THRESHOLDS.map((t, i) => (
                <Reveal key={t.label} delay={i * 0.08}>
                  <div className="card">
                    <p style={{
                      fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 900,
                      letterSpacing: '-0.045em', lineHeight: 1, marginBottom: 10, color: 'var(--t1)',
                    }}>
                      {t.value}
                    </p>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>
                      {t.label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--t3)', lineHeight: 1.6 }}>{t.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ═══════════════ ENTRAINMENT LAB ═══════════════════════════════ */}
        <section className="section">
          <div className="wrap">
            <EntrainmentLab />
          </div>
        </section>

        <hr className="rule" />

        {/* ═══════════════ WHY HEADPHONES ════════════════════════════════ */}
        <section className="section">
          <div className="wrap">
            <PathwayDiagram />
          </div>
        </section>

        <hr className="rule" />

        {/* ═══════════════ CARRIER CEILING ═══════════════════════════════ */}
        <section className="section">
          <div className="wrap">
            <CarrierCeiling />
          </div>
        </section>

        <hr className="rule" />

        {/* ═══════════════ STATES ════════════════════════════════════════ */}
        <section className="section">
          <div className="wrap">
            <StateSelector />
          </div>
        </section>

        <hr className="rule" />

        {/* ═══════════════ FACTS ═════════════════════════════════════════ */}
        <section className="section">
          <div className="wrap">
            <Reveal>
              <div style={{ marginBottom: 40 }}>
                <span className="eyebrow">Things that are true and rarely said</span>
                <h2 className="h-section" style={{ margin: '14px 0 16px' }}>
                  Hearing is stranger<br />
                  <span className="h-quiet">than the brochure version.</span>
                </h2>
                <p className="lede">
                  None of this is metaphor. Each one is a measured, replicated finding from
                  the auditory sciences — and each one is more interesting than the claims
                  usually made in their place.
                </p>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FACTS.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 0.08}>
                  <motion.div className="card" whileHover={{ y: -4 }}>
                    <span className="fact-index">{String(i + 1).padStart(2, '0')}</span>
                    <h3 style={{
                      fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.02em',
                      margin: '12px 0 10px', color: 'var(--t1)', lineHeight: 1.3,
                    }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: '0.83rem', lineHeight: 1.7, color: 'var(--t2)' }}>{f.body}</p>
                    <span className="fact-source">{f.source}</span>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ HONEST NOTE ═══════════════════════════════════ */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap-sm">
            <Reveal>
              <div className="card" style={{ padding: 'clamp(24px, 4vw, 34px)' }}>
                <span className="eyebrow" style={{ marginBottom: 12 }}>Where the evidence actually stands</span>
                <p style={{ fontSize: '0.86rem', lineHeight: 1.75, color: 'var(--t2)' }}>
                  Entrainment, binaural beats and cymatics are real, measurable phenomena, and
                  everything explained on this page is drawn from published auditory science.
                  The size of the <em>behavioural</em> effect is a separate question: reviews
                  find small-to-moderate benefits for anxiety, attention and memory, with
                  results that vary by person and by protocol. Claims attaching a specific
                  healing property to a specific Hz value are tradition rather than evidence —
                  we name those tones because people look for them, not because a study
                  established them.
                </p>
                <p style={{ fontSize: '0.86rem', lineHeight: 1.75, color: 'var(--t2)', marginTop: 14 }}>
                  hzaura is built for calm, focus and curiosity. It is not a medical device
                  and not a treatment. If you have epilepsy or a seizure disorder, talk to a
                  doctor before using rhythmic audio.
                </p>
                <Link
                  href="/science"
                  className="pill-btn"
                  style={{ display: 'inline-flex', marginTop: 20 }}
                >
                  Read the full science page
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════ FINAL CTA ═════════════════════════════════════ */}
        <section
          className="section text-center"
          style={{ borderTop: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(60% 70% at 50% 100%, rgba(92,232,220,0.10), transparent 70%)',
            }}
          />
          <div className="wrap-sm relative">
            <Reveal>
              <span className="eyebrow">Start now</span>
              <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 5.4vw, 3.8rem)', margin: '18px 0 18px' }}>
                Put on headphones.<br />
                <span className="spectral">Give it seven minutes.</span>
              </h2>
              <p className="lede" style={{ margin: '0 auto 34px' }}>
                Pick a tone, or answer six questions and let hzaura choose the carrier,
                the beat and the band for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => router.push('/session')} className="btn-primary px-10 py-3.5 text-sm">
                  Find my frequency →
                </button>
                <HzInput size="sm" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
