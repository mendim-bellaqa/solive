'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { PLANS, PlanId, usePlan } from '@/lib/plan'

const HeroOrb = dynamic(() => import('@/components/HeroOrb'), { ssr: false })

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 22 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: 'M9 18V5l12-2v13M9 13l12-2', title: 'Any frequency', body: 'Play any tone from 1 to 20,000 Hz, plus a curated library of 50+ presets.' },
  { icon: 'M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2z', title: '3D experiences', body: 'Watch sound become shape — Brain, Aura and Cymatics, rendered in real time.' },
  { icon: 'M4 12a8 8 0 0 1 16 0M8 12a4 4 0 0 1 8 0M2 12h2M20 12h2', title: 'Binaural beats', body: 'Entrain delta → gamma brainwave states with precision stereo tones.' },
  { icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18', title: 'Schumann grounding', body: "Layer in the Earth's 7.83 Hz resonance for a deeper, grounded session." },
  { icon: 'M3 3v18h18M7 14l3-4 4 3 5-7', title: 'Track your progress', body: 'Before/after mood, streaks and history keep your practice on course.' },
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Private & ad-free', body: 'No ads, no noise. Your sessions and data stay yours.' },
]

const COMPARE: { label: string; free: string | boolean; plus: string | boolean; pro: string | boolean }[] = [
  { label: 'Session length',              free: '15 min', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Any frequency (1–20,000 Hz)', free: true,     plus: true,        pro: true },
  { label: 'Curated frequency library',   free: true,     plus: true,        pro: true },
  { label: 'Binaural beats',              free: true,     plus: true,        pro: true },
  { label: 'Cymatic visualization',       free: true,     plus: true,        pro: true },
  { label: 'Brain & Aura 3D',             free: false,    plus: true,        pro: true },
  { label: 'Fullscreen immersive mode',   free: false,    plus: true,        pro: true },
  { label: 'Schumann & undertone layers', free: false,    plus: true,        pro: true },
  { label: 'Session history & tracking',  free: false,    plus: false,       pro: true },
  { label: 'Before/after insights',       free: false,    plus: false,       pro: true },
  { label: 'Downloadable sessions',       free: false,    plus: false,       pro: 'Soon' },
]

const FAQ = [
  { q: 'Is Solive a medical treatment?', a: 'No. Solive is built for relaxation, focus and curiosity. Brainwave entrainment and binaural beats are real, studied phenomena, but this is not a substitute for professional medical care.' },
  { q: 'Do I need headphones?', a: 'For binaural beats, yes — the effect relies on a slightly different tone in each ear. Everything else (pure tones, cymatics) works on any speaker.' },
  { q: 'What frequencies can I play?', a: 'Any frequency from 1 to 20,000 Hz on every plan — type a number and press play. Plus and Pro also unlock the Brain and Aura 3D experiences.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Plans are month-to-month (or annual) and you can cancel whenever you like — you keep access until the period ends.' },
  { q: 'Is my data private?', a: 'Always. There are no ads, and your sessions and history stay yours. You can use most of the app with no account at all.' },
  { q: 'How does billing work?', a: 'Billing isn’t connected in this build yet — selecting a plan unlocks it locally so you can preview the paid experience. Connect a payment provider (e.g. Stripe) to charge real cards.' },
]

function Check({ on, color }: { on: boolean; color: string }) {
  return on
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter()
  const { plan, choosePlan } = usePlan()
  const [annual, setAnnual] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  function select(id: PlanId) {
    if (id === plan) return
    choosePlan(id)
    setToast(id === 'free' ? 'You are on the Free plan.' : `${id === 'plus' ? 'Plus' : 'Pro'} unlocked — enjoy the full studio.`)
    setTimeout(() => setToast(null), 3200)
  }

  const priceOf = (p: number) => annual ? (p * 0.8) : p

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden><div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" /></div>

      <main className="relative z-10">
        {/* ══════════ HERO ══════════ */}
        <section className="relative overflow-hidden px-5 pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8rem)' }}>
          {/* faded 3D orb behind */}
          <div aria-hidden className="absolute pointer-events-none" style={{ top: '-6%', left: '50%', transform: 'translateX(-50%)', width: 620, height: 620, maxWidth: '110vw', opacity: 0.4, maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 70%)' }}>
            <HeroOrb />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 14 }}>
              PLANS & PRICING
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 16 }}>
              Tune your practice.<br /><span style={{ color: 'var(--t2)' }}>Unlock the whole studio.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}
              style={{ color: 'var(--t2)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: 28 }}>
              Start free — no account needed. Upgrade any time for unlimited sessions,
              every 3D experience, and progress tracking.
            </motion.p>

            {/* Billing toggle */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }}
              className="inline-flex items-center gap-1 p-1 rounded-full glass" style={{ border: '1px solid var(--border-mid)' }}>
              {([['Monthly', false], ['Yearly', true]] as const).map(([label, val]) => (
                <button key={label} onClick={() => setAnnual(val)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
                  style={{ background: annual === val ? 'var(--t1)' : 'transparent', color: annual === val ? 'var(--bg)' : 'var(--t2)' }}>
                  {label}
                  {label === 'Yearly' && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: annual ? 'var(--bg)' : 'var(--accent-dim)', color: annual ? 'var(--accent)' : 'var(--accent)', border: annual ? 'none' : '1px solid var(--accent-mid)' }}>
                      –20%
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════ PLAN CARDS ══════════ */}
        <section className="px-5 pb-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4 items-stretch">
            {PLANS.map((p, i) => {
              const current = plan === p.id
              const accent = !!p.highlight
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}
                  className={accent ? 'glass-premium grain' : 'glass-card grain'}
                  style={{ padding: '28px 24px', borderRadius: 24, position: 'relative', border: accent ? '1px solid var(--accent)' : undefined, transform: accent ? 'scale(1.02)' : undefined }}>
                  {accent && (
                    <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', color: '#04140f', background: 'var(--accent)', padding: '5px 12px', borderRadius: 999, boxShadow: '0 4px 16px var(--accent-mid)' }}>
                      MOST POPULAR
                    </span>
                  )}
                  <div className="relative z-10">
                    <p style={{ fontSize: '0.95rem', fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--t1)', marginBottom: 8 }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4, minHeight: 46 }}>
                      <AnimatePresence mode="wait">
                        <motion.span key={annual ? 'y' : 'm'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}
                          style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--t1)' }}>
                          {p.price === 0 ? 'Free' : `$${priceOf(p.price).toFixed(2)}`}
                        </motion.span>
                      </AnimatePresence>
                      {p.price > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--t3)' }}>/mo</span>}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--t4)', marginBottom: 14, minHeight: 16 }}>
                      {p.price > 0 ? (annual ? `Billed $${(priceOf(p.price) * 12).toFixed(2)} yearly` : 'Billed monthly') : 'Forever'}
                    </p>
                    <p style={{ fontSize: '0.83rem', color: 'var(--t3)', marginBottom: 20 }}>{p.tagline}</p>

                    <button onClick={() => select(p.id)} disabled={current}
                      className={accent && !current ? 'btn-primary' : 'btn-ghost'}
                      style={{ width: '100%', justifyContent: 'center', marginBottom: 22, opacity: current ? 0.7 : 1, cursor: current ? 'default' : 'pointer',
                               ...(accent && !current ? { background: 'var(--accent)', color: '#04140f' } : {}) }}>
                      {current ? 'Current plan' : p.cta}
                    </button>

                    <ul className="flex flex-col gap-2.5">
                      {p.features.map(f => (
                        <li key={f} style={{ display: 'flex', gap: 9, fontSize: '0.83rem', color: 'var(--t2)', lineHeight: 1.4 }}>
                          <span style={{ marginTop: 1, flexShrink: 0 }}><Check on color={accent ? 'var(--accent)' : 'var(--t2)'} /></span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <p style={{ color: 'var(--t4)', fontSize: '0.75rem', textAlign: 'center', marginTop: 18 }}>
            Cancel anytime · No ads · Not a substitute for medical care
          </p>
        </section>

        {/* ══════════ BENEFITS ══════════ */}
        <section className="px-5 py-20 max-w-5xl mx-auto">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>WHAT YOU GET</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 40 }}>
              A complete sound-healing studio.
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.07}>
                <div className="glass-card grain h-full p-6">
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={b.icon} /></svg>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8, color: 'var(--t1)' }}>{b.title}</h3>
                    <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--t2)' }}>{b.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════ COMPARISON TABLE ══════════ */}
        <section className="px-5 py-16 max-w-4xl mx-auto">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>COMPARE PLANS</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 30 }}>
              Every detail, side by side.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="glass-card grain" style={{ borderRadius: 20, overflow: 'hidden' }}>
              <div className="relative z-10" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '16px 18px', fontSize: '0.75rem', color: 'var(--t3)', fontWeight: 600 }}>Feature</th>
                      {(['Free', 'Plus', 'Pro'] as const).map((n, idx) => (
                        <th key={n} style={{ padding: '16px 12px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', color: idx === 1 ? 'var(--accent)' : 'var(--t1)' }}>{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map((row, ri) => (
                      <tr key={row.label} style={{ borderBottom: ri < COMPARE.length - 1 ? '1px solid var(--border)' : 'none', background: ri % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                        <td style={{ textAlign: 'left', padding: '13px 18px', fontSize: '0.82rem', color: 'var(--t2)' }}>{row.label}</td>
                        {([row.free, row.plus, row.pro] as const).map((v, ci) => (
                          <td key={ci} style={{ padding: '13px 12px', textAlign: 'center' }}>
                            {typeof v === 'boolean'
                              ? <span className="inline-flex justify-center w-full"><Check on={v} color={ci === 1 ? 'var(--accent)' : 'var(--t1)'} /></span>
                              : <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ci === 1 ? 'var(--accent)' : 'var(--t1)' }}>{v}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════ FAQ ══════════ */}
        <section className="px-5 py-16 max-w-3xl mx-auto">
          <Reveal>
            <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 28 }}>
              Questions, answered.
            </h2>
          </Reveal>
          <div className="flex flex-col gap-3">
            {FAQ.map((f, i) => {
              const open = openFaq === i
              return (
                <Reveal key={f.q} delay={i * 0.04}>
                  <button onClick={() => setOpenFaq(open ? null : i)} className="glass w-full text-left rounded-2xl" style={{ padding: '16px 20px', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between gap-4">
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--t1)' }}>{f.q}</span>
                      <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" animate={{ rotate: open ? 45 : 0 }} style={{ flexShrink: 0 }}>
                        <path d="M12 5v14M5 12h14" />
                      </motion.svg>
                    </div>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                          <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--t2)', paddingTop: 12 }}>{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ══════════ FINAL CTA ══════════ */}
        <section className="px-5 py-24 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <Reveal>
            <div className="max-w-xl mx-auto">
              <h2 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 16 }}>
                Feel the difference.<br /><span style={{ color: 'var(--t2)' }}>Start today.</span>
              </h2>
              <p style={{ color: 'var(--t2)', fontSize: '0.95rem', marginBottom: 30, lineHeight: 1.6 }}>
                Put on headphones, pick a frequency, and let sound do the work — free, no account required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => router.push('/session')} className="btn-primary px-9 py-3.5 text-sm">
                  Start a free session →
                </button>
                <button onClick={() => select('plus')} className="btn-ghost px-8 py-3">
                  Get Plus
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 z-[100] glass-card px-5 py-3"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)', borderRadius: 14, fontSize: '0.85rem', fontWeight: 600, color: 'var(--t1)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
