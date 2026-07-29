'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  FREQ_CATALOG, FREQ_CATEGORIES, CategoryId, CatalogEntry, BINAURAL_PRESETS,
} from '@/lib/frequencies'

type SortId = 'curated' | 'hz' | 'name'
const SORTS: { id: SortId; label: string }[] = [
  { id: 'curated', label: 'Curated' },
  { id: 'hz',      label: 'Hz ↑' },
  { id: 'name',    label: 'A–Z' },
]

const HZ_MIN = Math.min(...FREQ_CATALOG.map(f => f.hz))
const HZ_MAX = Math.max(...FREQ_CATALOG.map(f => f.hz))

/** Where a tone sits on a log scale across the library's range, 0–1. */
function spectrumPos(hz: number) {
  const lo = Math.log10(HZ_MIN), hi = Math.log10(HZ_MAX)
  return Math.min(1, Math.max(0, (Math.log10(hz) - lo) / (hi - lo)))
}

function fmtHz(hz: number) {
  return hz >= 1000 ? hz.toLocaleString('en-US') : String(hz)
}

// ─── Wave glyph — cycle count rises with pitch, so every tone looks different ─
function WaveGlyph({ hz, color, width = 46, height = 18 }: { hz: number; color: string; width?: number; height?: number }) {
  const cycles = 1 + Math.round(spectrumPos(hz) * 7)
  const mid = height / 2
  const amp = height * 0.34
  const d = Array.from({ length: 41 }, (_, i) => {
    const x = (i / 40) * width
    const y = mid + Math.sin((i / 40) * Math.PI * 2 * cycles) * amp
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ flexShrink: 0, opacity: 0.75 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
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
    if (n >= 1 && n <= 20000) router.push(`/studio?hz=${n}&binaural=alpha&duration=30`)
    else { setError(true); setTimeout(() => setError(false), 600) }
  }, [value, router])
  return (
    <motion.div animate={error ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.35 }}
      className="hz-input-group">
      <span className="hz-glyph" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 12 Q5 5 8 12 Q11 19 14 12 Q17 5 20 12" />
        </svg>
      </span>
      <input type="number" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()} placeholder="432" min={1} max={20000} aria-label="Enter a frequency in Hz" />
      <span className="hz-unit">Hz</span>
      <button className="hz-play-btn" onClick={go} disabled={!value} style={{ minHeight: 46 }} aria-label="Play this frequency">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="6 3 20 12 6 21 6 3" /></svg>
        Play
      </button>
    </motion.div>
  )
}

// ─── Frequency card ───────────────────────────────────────────────────────────
// The Hz value gets its own full-width row. Previously it shared a row with the
// category pill and was flex-shrink: 0, so a six-character value like 221.23
// pushed the "Hz" unit straight out through the card's overflow: hidden.
function FreqCard({ entry, color, index, onOpen }: {
  entry: CatalogEntry; color: string; index: number; onOpen: () => void
}) {
  const router = useRouter()
  const [hover, setHover] = useState(false)
  const play = () => router.push(`/studio?hz=${entry.hz}&binaural=${entry.band}&duration=30`)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.02 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className="freq-cell flex flex-col"
      style={{ padding: 0, cursor: 'default', borderColor: hover ? `${color}55` : undefined }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)`, flexShrink: 0 }} />

      {/* Body — opens the detail sheet */}
      <button onClick={onOpen} className="text-left flex-1 flex flex-col gap-2 p-3.5 sm:p-4"
              style={{ minWidth: 0 }} aria-label={`About ${entry.name}, ${entry.hz} hertz`}>
        {/* Category + wave signature */}
        <div className="flex items-center justify-between gap-2" style={{ minWidth: 0 }}>
          <span className="flex items-center gap-1.5"
                style={{ minWidth: 0, padding: '3px 7px', borderRadius: 999, background: `${color}14`, border: `1px solid ${color}30` }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span className="truncate" style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.05em', color, textTransform: 'uppercase' }}>
              {entry.category}
            </span>
          </span>
          <WaveGlyph hz={entry.hz} color={color} />
        </div>

        {/* Hz — its own row, so it can never collide with the pill */}
        <p className="tabular" style={{
          fontSize: 'clamp(1.3rem, 4.6vw, 1.7rem)', fontWeight: 900, letterSpacing: '-0.035em',
          lineHeight: 1, color: 'var(--t1)', whiteSpace: 'nowrap',
        }}>
          {fmtHz(entry.hz)}
          <span style={{ fontSize: '0.55em', fontWeight: 600, color: 'var(--t4)', marginLeft: 3 }}>Hz</span>
        </p>

        <p style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {entry.name}
        </p>
        <p style={{ fontSize: '0.71rem', color: 'var(--t3)', lineHeight: 1.45, flex: 1 }}>{entry.benefit}</p>
      </button>

      {/* Actions */}
      <div className="flex items-stretch gap-px px-3.5 sm:px-4 pb-3.5 sm:pb-4" style={{ minWidth: 0 }}>
        <button onClick={play}
          className="flex items-center justify-center gap-1.5 flex-1"
          style={{
            minWidth: 0, padding: '7px 10px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 800,
            background: `${color}1c`, border: `1px solid ${color}3d`, color,
            transition: 'background 0.18s',
          }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="6 3 20 12 6 21 6 3" /></svg>
          Play
        </button>
        <button onClick={onOpen} aria-label={`Details for ${entry.name}`}
          style={{
            flexShrink: 0, width: 32, marginLeft: 6, borderRadius: 10,
            border: '1px solid var(--border)', color: 'var(--t4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9.5" /><path d="M12 11v5" strokeLinecap="round" /><circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────
function DetailSheet({ entry, onClose, onSelect }: {
  entry: CatalogEntry; onClose: () => void; onSelect: (e: CatalogEntry) => void
}) {
  const router = useRouter()
  const meta = FREQ_CATEGORIES.find(c => c.id === entry.category)!
  const color = meta.color
  const preset = BINAURAL_PRESETS[entry.band]

  // Octaves are exact doublings, so they always stay in tune with each other.
  const octaves = [entry.hz / 2, entry.hz * 2].filter(h => h >= 1 && h <= 20000)

  const related = useMemo(() => FREQ_CATALOG
    .filter(f => f.category === entry.category && f.hz !== entry.hz)
    .sort((a, b) => Math.abs(a.hz - entry.hz) - Math.abs(b.hz - entry.hz))
    .slice(0, 4), [entry])

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const pos = spectrumPos(entry.hz)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="overflow-y-auto"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(4,4,10,0.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="min-h-full flex items-end sm:items-center justify-center sm:px-6"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          onClick={e => e.stopPropagation()}
          className="w-full glass-card grain"
          style={{
            maxWidth: 560, borderRadius: '24px 24px 0 0', overflow: 'hidden',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />

          <div className="relative z-10 p-6 sm:p-7">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div style={{ minWidth: 0 }}>
                <span className="inline-flex items-center gap-1.5 mb-3"
                      style={{ padding: '4px 9px', borderRadius: 999, background: `${color}16`, border: `1px solid ${color}33` }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', color, textTransform: 'uppercase' }}>
                    {meta.label}
                  </span>
                </span>
                <p className="tabular" style={{
                  fontSize: 'clamp(2.2rem, 9vw, 3rem)', fontWeight: 900, letterSpacing: '-0.045em',
                  lineHeight: 0.92, color: 'var(--t1)',
                }}>
                  {fmtHz(entry.hz)}
                  <span style={{ fontSize: '0.3em', fontWeight: 600, color: 'var(--t4)', marginLeft: 5 }}>Hz</span>
                </p>
                <p style={{ fontSize: '1.05rem', fontWeight: 800, color, marginTop: 8, letterSpacing: '-0.01em' }}>
                  {entry.name}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                style={{
                  flexShrink: 0, width: 34, height: 34, borderRadius: 10,
                  border: '1px solid var(--border)', color: 'var(--t3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Where it sits in the library's range */}
            <div className="mb-5">
              <div style={{ position: 'relative', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: `linear-gradient(90deg, ${color}22, ${color}66)` }} />
                <motion.div
                  initial={{ left: '0%' }} animate={{ left: `${pos * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', top: -4, width: 12, height: 12, marginLeft: -6,
                    borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`,
                  }} />
              </div>
              <div className="flex justify-between" style={{ fontSize: '0.62rem', color: 'var(--t4)', marginTop: 7 }}>
                <span>{fmtHz(HZ_MIN)} Hz</span>
                <span>library range</span>
                <span>{fmtHz(HZ_MAX)} Hz</span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--t2)', marginBottom: 18 }}>
              {entry.detail}
            </p>

            {/* Facts */}
            <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
              <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 5 }}>BEST USED</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--t2)', lineHeight: 1.45 }}>{entry.use}</p>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 5 }}>PAIRS WITH</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--t2)', lineHeight: 1.45 }}>
                  <span style={{ color, fontWeight: 700 }}>{preset.label} · {preset.hz} Hz</span><br />
                  {preset.state}
                </p>
              </div>
            </div>

            {/* Octaves */}
            {octaves.length > 0 && (
              <div className="mb-5">
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 8 }}>
                  OCTAVES — THE SAME TONE, HALVED AND DOUBLED
                </p>
                <div className="flex flex-wrap gap-2">
                  {octaves.map(h => (
                    <button key={h}
                      onClick={() => router.push(`/studio?hz=${h}&binaural=${entry.band}&duration=30`)}
                      className="tabular"
                      style={{
                        padding: '7px 13px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                        background: 'rgba(255,255,255,0.045)', border: '1px solid var(--border-mid)', color: 'var(--t2)',
                      }}>
                      {fmtHz(Math.round(h * 100) / 100)} Hz
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby in the same family */}
            {related.length > 0 && (
              <div className="mb-5">
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 8 }}>
                  NEARBY IN {meta.label.toUpperCase()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {related.map(r => (
                    <button key={r.hz + r.name} onClick={() => onSelect(r)}
                      style={{
                        padding: '7px 13px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                        background: `${color}12`, border: `1px solid ${color}2e`, color: 'var(--t2)',
                      }}>
                      <span className="tabular" style={{ fontWeight: 800, color }}>{fmtHz(r.hz)}</span>
                      <span style={{ marginLeft: 6 }}>{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Where the family comes from */}
            <div style={{ padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 6 }}>
                ABOUT {meta.label.toUpperCase()}
              </p>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--t3)', marginBottom: 8 }}>{meta.about}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--t4)', fontStyle: 'italic' }}>{meta.source}</p>
            </div>

            <button
              onClick={() => router.push(`/studio?hz=${entry.hz}&binaural=${entry.band}&duration=30`)}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: '14px 20px', borderRadius: 999, fontWeight: 800, fontSize: '0.9rem',
                background: color, color: '#07070f', boxShadow: `0 10px 30px -12px ${color}`,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="6 3 20 12 6 21 6 3" /></svg>
              Play {fmtHz(entry.hz)} Hz · 30 min
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FrequenciesPage() {
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('curated')
  const [open, setOpen] = useState<CatalogEntry | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: FREQ_CATALOG.length }
    FREQ_CATEGORIES.forEach(k => { c[k.id] = FREQ_CATALOG.filter(f => f.category === k.id).length })
    return c
  }, [])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = cat === 'all' ? [...FREQ_CATALOG] : FREQ_CATALOG.filter(f => f.category === cat)
    if (q) {
      out = out.filter(f =>
        f.name.toLowerCase().includes(q) ||
        String(f.hz).includes(q) ||
        f.benefit.toLowerCase().includes(q) ||
        f.use.toLowerCase().includes(q) ||
        f.category.includes(q),
      )
    }
    if (sort === 'hz')   out.sort((a, b) => a.hz - b.hz)
    if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [cat, query, sort])

  const colorFor = (id: CategoryId) => FREQ_CATEGORIES.find(c => c.id === id)!.color
  const activeMeta = cat === 'all' ? null : FREQ_CATEGORIES.find(c => c.id === cat)

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden><div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" /></div>

      <main className="relative z-10 max-w-6xl mx-auto px-5 pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7rem)' }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-7">
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>FREQUENCY LIBRARY</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: 14 }}>
            Play any frequency.{' '}<span style={{ color: 'var(--t2)' }}>One tap.</span>
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '36rem' }}>
            {FREQ_CATALOG.length} curated tones across {FREQ_CATEGORIES.length} families — Solfeggio, brainwave
            entrainment, the planetary scale, chakra tuning and more. Tap any card for what it does and where it
            comes from, or type any Hz from 1 to 20,000.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.45 }}
          className="grid grid-cols-3 gap-2.5 mb-7">
          {[
            { n: String(FREQ_CATALOG.length), l: 'Curated tones' },
            { n: String(FREQ_CATEGORIES.length), l: 'Families' },
            { n: `${HZ_MIN}–${(HZ_MAX / 1000)}k`, l: 'Hz range' },
          ].map(s => (
            <div key={s.l} style={{ padding: '13px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)' }}>
              <p className="tabular" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t1)', lineHeight: 1 }}>{s.n}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--t4)', marginTop: 5 }}>{s.l}</p>
            </div>
          ))}
        </motion.div>

        {/* Custom Hz */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}
          className="glass-card grain mb-8 flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5" style={{ borderRadius: 20 }}>
          <div className="relative z-10 flex-1">
            <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--t1)', marginBottom: 3 }}>Not in the library?</p>
            <p style={{ color: 'var(--t3)', fontSize: '0.78rem' }}>Type any value between 1 and 20,000 Hz and press play.</p>
          </div>
          <div className="relative z-10"><HzInput /></div>
        </motion.div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 flex-1" style={{
            padding: '10px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-mid)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ color: 'var(--t4)', flexShrink: 0 }} aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, Hz or what it's for…"
              aria-label="Search frequencies"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: '0.85rem' }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" style={{ color: 'var(--t4)', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0" style={{ padding: 3, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            {SORTS.map(s => (
              <button key={s.id} onClick={() => setSort(s.id)}
                style={{
                  flex: 1, padding: '7px 13px', borderRadius: 11, fontSize: '0.73rem', fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: sort === s.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: sort === s.id ? 'var(--t1)' : 'var(--t3)',
                  transition: 'background 0.18s, color 0.18s',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

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

        {/* Active family blurb */}
        <AnimatePresence mode="wait">
          <motion.div key={cat} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} className="mb-6">
            {activeMeta ? (
              <div style={{ paddingLeft: 12, borderLeft: `2px solid ${activeMeta.color}` }}>
                <p style={{ color: 'var(--t2)', fontSize: '0.82rem', lineHeight: 1.55 }}>{activeMeta.about}</p>
                <p style={{ color: 'var(--t4)', fontSize: '0.68rem', fontStyle: 'italic', marginTop: 5 }}>{activeMeta.source}</p>
              </div>
            ) : (
              <p style={{ color: 'var(--t3)', fontSize: '0.8rem' }}>
                Every tone in the library, from the 0.5 Hz delta floor to the top of the Rife range.
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Result count */}
        <p style={{ color: 'var(--t4)', fontSize: '0.72rem', marginBottom: 12 }}>
          {list.length} {list.length === 1 ? 'tone' : 'tones'}{query ? ` matching “${query}”` : ''}
        </p>

        {/* Grid */}
        {list.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((entry, i) => (
              <FreqCard key={`${entry.category}-${entry.hz}`} entry={entry} color={colorFor(entry.category)}
                        index={i} onOpen={() => setOpen(entry)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>Nothing matches that</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--t4)', marginBottom: 18 }}>
              You can still play any exact Hz you like — the studio takes 1 to 20,000.
            </p>
            <button onClick={() => { setQuery(''); setCat('all') }} className="pill-btn" style={{ display: 'inline-flex' }}>
              Clear filters
            </button>
          </div>
        )}

        {/* How to use */}
        <div className="mt-16">
          <p style={{ color: 'var(--t4)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>
            GETTING THE MOST FROM A TONE
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { t: 'Wear headphones', b: 'The binaural layer only works with one ear per channel. On a speaker both ears hear both tones and the beat never forms.' },
              { t: 'Start quiet', b: 'Pure tones carry further than music at the same volume, and the high end of this library is where the ear is most sensitive.' },
              { t: 'Give it ten minutes', b: 'Entrainment is gradual. Most reported effects show up somewhere after the first several minutes, not in the first thirty seconds.' },
            ].map(s => (
              <div key={s.t} className="glass-card grain p-5" style={{ borderRadius: 18 }}>
                <div className="relative z-10">
                  <p style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--t1)', marginBottom: 7 }}>{s.t}</p>
                  <p style={{ fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--t3)' }}>{s.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Build a session prompt */}
        <div className="mt-12 text-center">
          <p style={{ color: 'var(--t3)', fontSize: '0.85rem', marginBottom: 12 }}>Want a guided experience with a 3D visualization?</p>
          <a href="/session" className="pill-btn" style={{ display: 'inline-flex' }}>
            Build a full session
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </main>

      <AnimatePresence>
        {open && <DetailSheet entry={open} onClose={() => setOpen(null)} onSelect={setOpen} />}
      </AnimatePresence>

      <Footer />
    </>
  )
}
