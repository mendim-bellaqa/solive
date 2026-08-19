'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { useAuthUser } from '@/lib/supabase/sessions'

// Animated waveform ribbon across the top of the footer
function WaveRibbon() {
  const lines = [
    { amp: 9,  cyc: 3, op: 0.5,  dur: 7,  color: 'var(--accent)' },
    { amp: 6,  cyc: 5, op: 0.28, dur: 9,  color: 'rgba(255,255,255,0.5)' },
    { amp: 12, cyc: 2, op: 0.16, dur: 11, color: 'var(--accent)' },
  ]
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, overflow: 'hidden', pointerEvents: 'none', maskImage: 'linear-gradient(180deg, #000, transparent)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent)' }} aria-hidden>
      <svg width="100%" height="60" viewBox="0 0 1200 60" preserveAspectRatio="none">
        {lines.map((l, i) => {
          const d = Array.from({ length: 121 }, (_, k) => {
            const x = k * 10
            const y = 30 + Math.sin((k / 120) * Math.PI * 2 * l.cyc) * l.amp
            return `${k === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`
          }).join(' ')
          return (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={l.color}
              strokeWidth={1.2}
              opacity={l.op}
              animate={{ x: [0, -100, 0] }}
              transition={{ duration: l.dur, repeat: Infinity, ease: 'easeInOut' }}
            />
          )
        })}
      </svg>
    </div>
  )
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--t4)', marginBottom: 14 }}>
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  )
}

function FLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 group"
        style={{ fontSize: '0.85rem', color: 'var(--t2)', transition: 'color 0.18s' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}
      >
        {children}
      </Link>
    </li>
  )
}

export default function Footer() {
  const router = useRouter()
  const user = useAuthUser()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const year = new Date().getFullYear()

  const quickHz = [40, 174, 432, 528, 963]

  return (
    <footer ref={ref} className="relative" style={{ borderTop: '1px solid var(--border)', marginTop: 40, overflow: 'hidden' }}>
      <WaveRibbon />

      {/* Soft glow */}
      <div aria-hidden style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 700, height: 300, background: 'radial-gradient(ellipse at center, var(--accent-dim), transparent 70%)', pointerEvents: 'none', filter: 'blur(30px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 max-w-6xl mx-auto px-5 pt-20 pb-10"
      >
        {/* Top: brand + CTA */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '26rem' }}>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <span className="text-accent">
                <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                  <path d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--t1)' }}>hzaura</span>
            </Link>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              Every frequency<br /><span style={{ color: 'var(--t2)' }}>has a purpose.</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--t3)', lineHeight: 1.6 }}>
              Sound healing · binaural beats · real-time 3D cymatics. Tune in, feel the shift.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3">
            <button onClick={() => router.push('/session')} className="btn-primary" style={{ padding: '12px 26px' }}>
              Start a session
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p style={{ fontSize: '0.72rem', color: 'var(--t4)' }}>No account needed · Headphones recommended</p>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <Col title="EXPLORE">
            <FLink href="/frequencies">Frequencies</FLink>
            <FLink href="/science">The science</FLink>
            <FLink href="/session">Build a session</FLink>
            <FLink href="/history">Account history</FLink>
          </Col>

          <Col title="QUICK PLAY">
            {quickHz.map(hz => (
              <li key={hz}>
                <button
                  onClick={() => router.push(`/studio?hz=${hz}&binaural=alpha&duration=30`)}
                  className="inline-flex items-center gap-2"
                  style={{ fontSize: '0.85rem', color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.18s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}
                >
                  <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--accent)' }} />
                  {hz} Hz
                </button>
              </li>
            ))}
          </Col>

          <Col title="ACCOUNT">
            {/* `undefined` means auth is still resolving — showing "Sign in" to
                someone who is already signed in is worse than showing nothing
                for a beat. */}
            {user === null && <FLink href="/auth/login">Sign in</FLink>}
            {user && <FLink href="/settings">Settings</FLink>}
            {user && <FLink href="/pricing">Your plan</FLink>}
            <FLink href="/sessions">My sessions</FLink>
            <FLink href="/session">Get matched</FLink>
          </Col>

          <Col title="THE BASICS">
            <li style={{ fontSize: '0.8rem', color: 'var(--t3)', lineHeight: 1.5 }}>Wear headphones for binaural beats.</li>
            <li style={{ fontSize: '0.8rem', color: 'var(--t3)', lineHeight: 1.5 }}>15+ minutes for a measurable shift.</li>
            <li style={{ fontSize: '0.8rem', color: 'var(--t3)', lineHeight: 1.5 }}>Any Hz from 1 – 20,000.</li>
          </Col>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--t4)' }}>
            © {year} hzaura · Not a substitute for medical care.
          </p>
          <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--t4)' }}>
            <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--accent)' }} />
            Made for calmer minds
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
