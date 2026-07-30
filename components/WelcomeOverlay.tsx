'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Shown once, right after an account is created.
 *
 * The rings are the point: this is an app about tones radiating outward, so
 * the welcome reads as a struck note rather than a generic success tick.
 */
export default function WelcomeOverlay({
  email,
  needsConfirmation = false,
  onDismiss,
}: {
  email: string
  /** True only if the project still requires clicking an email link. */
  needsConfirmation?: boolean
  onDismiss?: () => void
}) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const primaryRef = useRef<HTMLButtonElement>(null)

  const name = email.split('@')[0]

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    primaryRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss?.() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey) }
  }, [onDismiss])

  function go(href: string) {
    router.push(href)
    router.refresh()
  }

  // Staggered reveal — each element waits for the ring burst to establish first.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] as const },
  })

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Solive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-y-auto"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'radial-gradient(circle at 50% 42%, #0b1a22 0%, #05050c 62%)',
      }}
    >
      <div className="min-h-full flex flex-col items-center justify-center px-6 text-center"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}>

        {/* ── Radiating rings ─────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center"
             style={{ width: 200, height: 200, marginBottom: 8 }} aria-hidden>
          {!reduce && [0, 0.55, 1.1, 1.65].map((delay, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: [0.35, 1.9], opacity: [0, 0.5, 0] }}
              transition={{ duration: 2.6, delay, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', width: 150, height: 150, borderRadius: '50%',
                border: '1px solid var(--accent)',
              }}
            />
          ))}

          {/* Core disc */}
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'relative', width: 92, height: 92, borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 60px -12px var(--accent)',
            }}
          >
            <svg width="42" height="42" viewBox="0 0 22 22" fill="none" style={{ color: 'var(--accent)' }}>
              <motion.path
                d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.25, ease: 'easeInOut' }}
              />
            </svg>
          </motion.span>
        </div>

        {/* ── Copy ─────────────────────────────────────────────────────── */}
        <motion.p {...rise(0.45)}
          style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--accent)', marginBottom: 14 }}>
          YOUR ACCOUNT IS READY
        </motion.p>

        <motion.h1 {...rise(0.58)}
          style={{ fontSize: 'clamp(2rem, 7vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 14 }}>
          Welcome to Solive,<br />
          <span style={{ color: 'var(--accent)' }}>{name}.</span>
        </motion.h1>

        <motion.p {...rise(0.7)}
          style={{ fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--t2)', maxWidth: '30rem', marginBottom: 30 }}>
          Every session you play is saved from here on — pause one and pick it up later, and
          look back at how each frequency actually made you feel.
        </motion.p>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <motion.div {...rise(0.82)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full"
          style={{ maxWidth: 420 }}>
          <motion.button
            ref={primaryRef}
            onClick={() => go('/session')}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 flex-1"
            style={{
              padding: '15px 22px', borderRadius: 999, fontWeight: 800, fontSize: '0.92rem',
              background: 'var(--accent)', color: '#04140f', border: 'none',
              boxShadow: '0 12px 34px -14px var(--accent)',
            }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            Find my frequency
          </motion.button>

          <motion.button
            onClick={() => go('/frequencies')}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            className="flex-1"
            style={{
              padding: '15px 22px', borderRadius: 999, fontWeight: 700, fontSize: '0.92rem',
              background: 'transparent', border: '1px solid var(--border-hi)', color: 'var(--t1)',
            }}>
            Browse the library
          </motion.button>
        </motion.div>

        <motion.button {...rise(0.94)}
          onClick={() => (onDismiss ? onDismiss() : go('/'))}
          style={{ marginTop: 22, fontSize: '0.8rem', color: 'var(--t3)' }}
          className="hover:opacity-80 transition-opacity">
          Take me to the home page
        </motion.button>

        {/* Only shown if the project still gates sign-in behind a click-through. */}
        {needsConfirmation && (
          <motion.p {...rise(1.06)}
            style={{
              marginTop: 26, fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--t3)',
              maxWidth: '26rem', padding: '11px 15px', borderRadius: 12,
              background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)',
            }}>
            We also sent a confirmation link to <span style={{ color: 'var(--t2)' }}>{email}</span> — no rush,
            you can click it whenever.
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
