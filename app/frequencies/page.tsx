'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  FREQ_CATALOG, FREQ_CATEGORIES, SUGGESTED_BAND, CategoryId, CatalogEntry,
} from '@/lib/frequencies'

// ─── Custom Hz input ──────────────────────────────────────────────────────────
function HzInput() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const go = useCallback(() => {
    const n = Number(value)
    if (n >= 1 && n <= 20000) router.push(`/studio?hz=${n}&binaural=alpha&duration=30`)
    else { setError(true); setTimeout(() => setError(false), 600) }
  }, [value, router])
  return (
    <motion.div animate={error ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.35 }}
      className="hz-input-group" style={{ borderRadius: 16 }}>
      <input type="number" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()} placeholder="432" min={1} max={20000} aria-label="Enter a frequency in Hz" />
      <span className="hz-unit">Hz</span>
      <button className="hz-play-btn" onClick={go} disabled={!value} aria-label="Play this frequency">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="6 3 20 12 6 21 6 3" /></svg>
        Play
      </button>
    </motion.div>
  )
}

// ─── Frequency card ───────────────────────────────────────────────────────────
function FreqCard({ entry, color, index }: { entry: CatalogEntry; color: string; index: number }) {
  const router = useRouter()
  const [hover, setHover] = useState(false)
  const play = () => {
    const band = SUGGESTED_BAND[entry.hz] ?? 'alpha'
    router.push(`/studio?hz=${entry.hz}&binaural=${band}&duration=30`)
  }
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={play}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className="freq-cell text-left"
      style={{ padding: 0, borderColor: hover ? `${color}66` : undefined }}
    >
      {/* Colored accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '20px 20px 0 0' }} />
      <div className="p-4 flex flex-col gap-2.5" style={{ minHeight: 148 }}>
        <div className="flex items-start justify-between gap-2">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: `${color}14`, border: `1px solid ${color}30` }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em', color, textTransform: 'uppercase' }}>{entry.category}</span>
          </span>
          <span className="tabular" style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--t1)', flexShrink: 0 }}>
            {entry.hz}<span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--t4)', marginLeft: 2 }}>Hz</span>
          </span>
        </div>
        <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{entry.name}</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--t3)', lineHeight: 1.45, flex: 1 }}>{entry.benefit}</p>
        <div className="flex items-center gap-1.5" style={{ fontSize: '0.72rem', fontWeight: 700, color: hover ? color : 'var(--t4)', transition: 'color 0.18s' }}>
          Play
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FrequenciesPage() {
  const [cat, setCat] = useState<CategoryId | 'all'>('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: FREQ_CATALOG.length }
    FREQ_CATEGORIES.forEach(k => { c[k.id] = FREQ_CATALOG.filter(f => f.category === k.id).length })
    return c
  }, [])

  const list = useMemo(() => (cat === 'all' ? FREQ_CATALOG : FREQ_CATALOG.filter(f => f.category === cat)), [cat])
  const colorFor = (id: CategoryId) => FREQ_CATEGORIES.find(c => c.id === id)!.color
  const activeBlurb = cat === 'all' ? 'Every tone in the library, from deep delta to the crown.' : FREQ_CATEGORIES.find(c => c.id === cat)?.blurb

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden><div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" /></div>

      <main className="relative z-10 max-w-6xl mx-auto px-5 pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7rem)' }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>FREQUENCY LIBRARY</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 14 }}>
            {FREQ_CATALOG.length} frequencies.{' '}<span style={{ color: 'var(--t2)' }}>One tap to play.</span>
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '36rem' }}>
            A curated library of the best-known healing, brainwave, planetary and angelic tones —
            or type any Hz you like.
          </p>
        </motion.div>

        {/* Custom Hz */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}
          className="glass-card grain mb-10 flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5" style={{ borderRadius: 20 }}>
          <div className="relative z-10 flex-1">
            <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--t1)', marginBottom: 3 }}>Play any frequency</p>
            <p style={{ color: 'var(--t3)', fontSize: '0.78rem' }}>Type a value between 1 and 20,000 Hz and press play.</p>
          </div>
          <div className="relative z-10"><HzInput /></div>
        </motion.div>

        {/* Category filter */}
        <div className="scroll-row flex gap-2 mb-3 -mx-1 px-1" style={{ paddingBottom: 4 }}>
          {[{ id: 'all' as const, label: 'All', color: 'var(--t1)' }, ...FREQ_CATEGORIES].map(c => {
            const active = cat === c.id
            const col = c.id === 'all' ? 'var(--t1)' : (c as { color: string }).color
            return (
              <button key={c.id} onClick={() => setCat(c.id as CategoryId | 'all')}
                className="pill-btn flex-shrink-0"
                style={{
                  borderColor: active ? col : 'var(--border-mid)',
                  background: active ? (c.id === 'all' ? 'rgba(255,255,255,0.10)' : `${col}1e`) : 'var(--glass-1)',
                  color: active ? (c.id === 'all' ? 'var(--t1)' : col) : 'var(--t2)',
                }}>
                {c.label}
                <span style={{ fontSize: '0.68rem', opacity: 0.7, marginLeft: 2 }}>{counts[c.id]}</span>
              </button>
            )
          })}
        </div>
        <p style={{ color: 'var(--t3)', fontSize: '0.78rem', marginBottom: 20 }}>{activeBlurb}</p>

        {/* Grid */}
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {list.map((entry, i) => (
              <FreqCard key={entry.hz} entry={entry} color={colorFor(entry.category)} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Build a session prompt */}
        <div className="mt-12 text-center">
          <p style={{ color: 'var(--t3)', fontSize: '0.85rem', marginBottom: 12 }}>Want a guided experience with a 3D visualization?</p>
          <a href="/session" className="pill-btn" style={{ display: 'inline-flex' }}>
            Build a full session
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </main>

      <Footer />
    </>
  )
}
