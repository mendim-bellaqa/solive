'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import { FREQUENCIES, HEALING_FREQUENCIES, SUGGESTED_BAND } from '@/lib/frequencies'

// ─── Mini Lissajous ───────────────────────────────────────────────────────────
function MiniLiss({ hz, size = 46 }: { hz: number; size?: number }) {
  const p = hz <= 111 ? { a: 1, b: 2, loops: 2 }
    : hz <= 285 ? { a: 1, b: 2, loops: 2 }
    : hz <= 417 ? { a: 2, b: 3, loops: 3 }
    : hz <= 528 ? { a: 3, b: 4, loops: 4 }
    : hz <= 741 ? { a: 4, b: 5, loops: 5 }
    : { a: 5, b: 7, loops: 7 }
  const h = size / 2, r = h * 0.8, N = 160
  const d = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * Math.PI * 2 * p.loops
    return `${i === 0 ? 'M' : 'L'}${(h + Math.sin(p.a * t) * r).toFixed(1)},${(h + Math.sin(p.b * t) * r).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={d + ' Z'} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
            className="spin-slow" style={{ transformOrigin: `${h}px ${h}px` }} />
      <circle cx={h} cy={h} r="1.8" fill="currentColor" opacity="0.5" className="breathe" />
    </svg>
  )
}

// ─── Custom Hz input ──────────────────────────────────────────────────────────
function HzInput() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

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
      style={{ borderRadius: 16 }}
    >
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()}
        placeholder="432"
        min={1}
        max={20000}
        aria-label="Enter a frequency in Hz"
      />
      <span className="hz-unit">Hz</span>
      <button className="hz-play-btn" onClick={go} disabled={!value} aria-label="Play this frequency">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        Play
      </button>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FrequenciesPage() {
  const router = useRouter()

  const play = (hz: number) => {
    const band = SUGGESTED_BAND[hz] ?? 'alpha'
    router.push(`/studio?hz=${hz}&binaural=${band}&duration=30`)
  }

  return (
    <>
      <Header />

      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-5 pt-28 pb-28"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7rem)' }}>
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>
            FREQUENCY LIBRARY
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 14 }}>
            Choose your frequency.
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '34rem' }}>
            Tap any of the {HEALING_FREQUENCIES.length} best-known healing frequencies to play it instantly —
            or type any Hz you like.
          </p>
        </motion.div>

        {/* Custom Hz input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45 }}
          className="glass-card grain mb-12 flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5"
          style={{ borderRadius: 20 }}
        >
          <div className="relative z-10 flex-1">
            <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--t1)', marginBottom: 3 }}>
              Play any frequency
            </p>
            <p style={{ color: 'var(--t3)', fontSize: '0.78rem' }}>
              Type a value between 1 and 20,000 Hz and press play.
            </p>
          </div>
          <div className="relative z-10">
            <HzInput />
          </div>
        </motion.div>

        {/* Frequency grid */}
        <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>
          HEALING FREQUENCIES · TAP TO PLAY
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {HEALING_FREQUENCIES.map((hz, i) => {
            const f = FREQUENCIES[hz]
            if (!f) return null
            return (
              <motion.button
                key={hz}
                onClick={() => play(hz)}
                className="freq-cell text-left"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.4 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.97 }}
                style={{ padding: 0 }}
              >
                <div className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-start justify-between">
                    <div style={{ color: f.colorHex }}>
                      <MiniLiss hz={hz} />
                    </div>
                    <div className="text-right">
                      <p className="tabular" style={{ fontSize: '1.35rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--t1)' }}>
                        {hz}
                      </p>
                      <p style={{ fontSize: '0.6rem', color: 'var(--t4)' }}>Hz</p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.colorHex, boxShadow: `0 0 8px ${f.colorHex}`, flexShrink: 0 }} />
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--t1)' }}>{f.name}</p>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: 'var(--t3)', lineHeight: 1.4 }}>{f.tagline}</p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Build-a-session prompt */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <p style={{ color: 'var(--t3)', fontSize: '0.85rem', marginBottom: 12 }}>
            Want a guided experience with a 3D visualization?
          </p>
          <button onClick={() => router.push('/session')} className="pill-btn" style={{ display: 'inline-flex' }}>
            Build a full session
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>
      </main>
    </>
  )
}
