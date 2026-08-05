'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FREQ_CATALOG, FREQ_CATEGORIES, CATEGORY_COLOR, type CategoryId, type CatalogEntry,
} from '@/lib/frequencies'

function fmtHz(hz: number) {
  return hz >= 1000 ? hz.toLocaleString('en-US') : String(hz)
}

/** A tone can appear in more than one category, so identity is both. */
const keyOf = (e: CatalogEntry) => `${e.category}-${e.hz}`

export default function FrequencyPicker({ open, selectedHz, onPick, onClose }: {
  open: boolean
  selectedHz: number
  onPick: (entry: CatalogEntry) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const [custom, setCustom] = useState('')
  const [customError, setCustomError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState<'none' | 'top' | 'bottom' | 'both'>('none')

  const q = query.trim().toLowerCase()

  const matches = useMemo(() => {
    const pool = cat === 'all' ? FREQ_CATALOG : FREQ_CATALOG.filter(e => e.category === cat)
    if (!q) return pool
    // Numbers search by Hz as well as by text, so "432" finds the tone even
    // though the name never contains the digits.
    return pool.filter(e =>
      `${e.hz} ${e.name} ${e.benefit} ${e.use} ${e.category}`.toLowerCase().includes(q),
    )
  }, [cat, q])

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const more = { top: el.scrollTop > 6, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 6 }
    setFade(more.top && more.bottom ? 'both' : more.top ? 'top' : more.bottom ? 'bottom' : 'none')
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    updateFade()
  }, [q, cat, matches.length, updateFade, open])

  // The sheet owns the viewport while it is up: no scrolling the page behind
  // it, and Escape closes it.
  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function playCustom() {
    const n = Number(custom)
    if (!Number.isFinite(n) || n < 1 || n > 20000) {
      setCustomError(true)
      setTimeout(() => setCustomError(false), 700)
      return
    }
    const hz = Math.round(n * 10) / 10
    onPick({
      hz,
      name: `${fmtHz(hz)} Hz`,
      benefit: 'Your own tuning.',
      detail: 'A custom tone outside the curated library. Everything else in the session — the brainwave band, the visuals, the length — works exactly the same.',
      use: 'Exploring a frequency you already have in mind',
      band: hz < 100 ? 'delta' : hz < 500 ? 'alpha' : 'beta',
      category: 'tuning',
    })
    setCustom('')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
            style={{
              position: 'fixed', inset: 0, zIndex: 80,
              background: 'rgba(4,4,10,0.55)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Choose a frequency"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            className="freq-sheet"
          >
            <div className="freq-sheet-inner">
              <div className="freq-sheet-head">
                <div>
                  <p className="text-[0.62rem] font-bold tracking-[0.14em]" style={{ color: 'var(--t4)' }}>
                    THE LIBRARY
                  </p>
                  <p className="text-[1.05rem] font-black" style={{ letterSpacing: '-0.02em' }}>
                    Choose a frequency
                  </p>
                </div>
                <button onClick={onClose} className="freq-sheet-close" aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="pick-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search a tone, a feeling, or a number"
                  aria-label="Search frequencies"
                  autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
                />
                {query && (
                  <button type="button" className="pick-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="freq-cats">
                <button onClick={() => setCat('all')} className="freq-cat" data-on={cat === 'all' || undefined}>
                  All {FREQ_CATALOG.length}
                </button>
                {FREQ_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)} className="freq-cat"
                          data-on={cat === c.id || undefined}
                          style={cat === c.id ? { borderColor: `${c.color}66`, background: `${c.color}1f`, color: '#fff' } : undefined}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: c.color, flexShrink: 0 }} />
                    {c.label}
                  </button>
                ))}
              </div>

              <p className="pick-count">
                {q || cat !== 'all'
                  ? `${matches.length} ${matches.length === 1 ? 'tone' : 'tones'}`
                  : `${FREQ_CATALOG.length} tones · ${FREQ_CATEGORIES.length} traditions`}
                {cat !== 'all' && !q && ` · ${FREQ_CATEGORIES.find(c => c.id === cat)?.blurb}`}
              </p>

              {matches.length === 0 ? (
                <div className="pick-empty">
                  <p>Nothing in the library matches “{query.trim()}”.</p>
                  <button type="button" onClick={() => { setQuery(''); setCat('all') }} className="btn-ghost text-sm">
                    Show everything
                  </button>
                </div>
              ) : (
                <div className="pick-scroll freq-scroll" ref={scrollRef} onScroll={updateFade} data-fade={fade}>
                  {matches.map(entry => {
                    const color = CATEGORY_COLOR[entry.category]
                    const sel = entry.hz === selectedHz
                    return (
                      <button
                        key={keyOf(entry)}
                        type="button"
                        onClick={() => onPick(entry)}
                        className="pick-row"
                        data-on={sel || undefined}
                      >
                        <span className="freq-hz" style={{ color: sel ? color : 'var(--t1)' }}>
                          {fmtHz(entry.hz)}
                          <span className="freq-hz-unit">Hz</span>
                        </span>
                        <span className="pick-text">
                          <span className="pick-name">{entry.name}</span>
                          <span className="pick-sub">{entry.benefit}</span>
                        </span>
                        <span className="freq-tag" style={{ color, borderColor: `${color}44`, background: `${color}14` }}>
                          {entry.category}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="freq-custom">
                <div>
                  <p className="text-[0.72rem] font-bold" style={{ color: 'var(--t2)' }}>Something else in mind?</p>
                  <p className="text-[0.66rem]" style={{ color: 'var(--t4)' }}>Any tone from 1 to 20,000 Hz.</p>
                </div>
                <motion.div animate={customError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.35 }}
                  className="freq-custom-input" data-error={customError || undefined}>
                  <input
                    type="number" inputMode="decimal" value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && playCustom()}
                    placeholder="432" min={1} max={20000} aria-label="Custom frequency in Hz"
                  />
                  <span className="freq-custom-unit">Hz</span>
                  <button onClick={playCustom} disabled={!custom}>Use</button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
