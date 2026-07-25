'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  FREQUENCIES, HEALING_FREQUENCIES, SUGGESTED_BAND, getOrCreateFrequency,
} from '@/lib/frequencies'
import Header from '@/components/Header'
import { usePlan } from '@/lib/plan'

const Biofield = dynamic(() => import('@/components/Biofield'), { ssr: false })
const ThreeVisualizer = dynamic(() => import('@/components/ThreeVisualizer'), { ssr: false })
const NeuralBrain = dynamic(() => import('@/components/NeuralBrain'), { ssr: false })

// ─── Visualization modes ──────────────────────────────────────────────────────
type VizMode = 'brain' | 'aura' | 'frequency'

interface VizOption {
  id: VizMode
  label: string
  sub: string
  desc: string
}

const VIZ_OPTIONS: VizOption[] = [
  { id: 'brain',     label: 'Brain',       sub: 'Neural Activation',   desc: 'Watch cortical activity warm from cool to peak — a PET-scan style map of your brain lighting up over the session.' },
  { id: 'aura',      label: 'Body Aura',   sub: 'Biofield Expansion',  desc: 'A wireframe figure inside an energy field that expands and brightens as the frequency entrains your system.' },
  { id: 'frequency', label: 'Frequencies', sub: 'Cymatic Waveform',    desc: 'The pure geometry of sound — a 3D Lissajous form that morphs with the exact shape of your chosen frequency.' },
]

// Small animated glyph per mode (SVG, no WebGL — keeps the card grid light)
function VizGlyph({ mode, active, color }: { mode: VizMode; active: boolean; color: string }) {
  const stroke = active ? color : 'currentColor'
  if (mode === 'brain') {
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
        <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8A3 3 0 0 0 7 18a2.5 2.5 0 0 0 5 .5V5a2 2 0 0 0-3-1Z" strokeLinejoin="round"/>
        <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8A3 3 0 0 1 17 18a2.5 2.5 0 0 1-5 .5" strokeLinejoin="round"/>
        {active && <circle cx="12" cy="11" r="2" fill={color} stroke="none" className="breathe" />}
      </svg>
    )
  }
  if (mode === 'aura') {
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4">
        <circle cx="12" cy="6" r="2" />
        <path d="M12 8v7M12 15l-3 5M12 15l3 5M8 11h8" strokeLinecap="round"/>
        <ellipse cx="12" cy="12" rx="9" ry="10" opacity={active ? 0.9 : 0.4} className={active ? 'breathe-ring' : ''} style={{ transformOrigin: '12px 12px' }}/>
      </svg>
    )
  }
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
      <path d="M12 3 C18 3 21 8 21 12 C21 16 18 21 12 21 C6 21 3 16 3 12 C3 8 6 3 12 3 Z" opacity={active ? 0.9 : 0.4}/>
      <path d="M6 12 Q9 6 12 12 Q15 18 18 12" strokeLinecap="round" className={active ? 'spin-slow' : ''} style={{ transformOrigin: '12px 12px' }}/>
    </svg>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter()
  const { limits } = usePlan()
  const [viz, setViz]   = useState<VizMode>('brain')
  const [hz, setHz]     = useState<number>(528)
  const [open, setOpen] = useState(false)

  const freq = useMemo(() => getOrCreateFrequency(hz), [hz])
  const color = freq.colorHex
  const isPlusViz = (v: VizMode) => v === 'brain' || v === 'aura'

  function begin() {
    const band = SUGGESTED_BAND[hz] ?? 'alpha'
    const params = new URLSearchParams({
      hz: String(hz),
      binaural: band,
      duration: '30',
      viz,
    })
    router.push(`/studio?${params.toString()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <Header />

      {/* Ambient */}
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      {/* No z-index here on purpose: it would create a stacking context that traps
          the frequency dropdown below the sticky CTA bar. `position: relative` alone
          still paints above .ambient-bg (z-index 0, earlier in the DOM). */}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 88px) 16px 150px', position: 'relative' }}>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--t4)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
            BUILD YOUR SESSION
          </p>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.035em', marginBottom: 5 }}>
            Design your session
          </h1>
          <p style={{ color: 'var(--t3)', fontSize: '0.82rem' }}>
            Pick a 3D experience, then a healing frequency.
          </p>
        </motion.div>

        {/* ── Live preview ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="player-surface" style={{ position: 'relative', aspectRatio: '4 / 3', marginBottom: 8 }}>
          {viz === 'frequency'
            ? <ThreeVisualizer hz={hz} isPlaying={false} analyserRef={{ current: null }} colorHex={color} vizMode="lissajous" />
            : viz === 'brain'
            ? <NeuralBrain isPlaying={false} mode="preview" />
            : <Biofield colorHex={color} isPlaying={false} quality="preview" />
          }
          {/* Overlay labels */}
          <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 5, pointerEvents: 'none' }}>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--t3)', fontWeight: 700, marginBottom: 2 }}>
              PREVIEW
            </p>
            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--t1)' }}>
              {VIZ_OPTIONS.find(v => v.id === viz)?.sub}
            </p>
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 14, zIndex: 5, pointerEvents: 'none', textAlign: 'right' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color, letterSpacing: '-0.03em' }}>
              {hz}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--t3)', marginLeft: 3 }}>Hz</span>
            </p>
            <p style={{ fontSize: '0.68rem', color: 'var(--t2)', fontWeight: 600 }}>{freq.name}</p>
          </div>
        </motion.div>

        {/* ── Step 1 · Visualization ───────────────────────────────────────── */}
        <SectionLabel n={1} text="Choose your 3D experience" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 26 }}>
          {VIZ_OPTIONS.map((o, i) => {
            const active = viz === o.id
            return (
              <motion.button key={o.id} onClick={() => setViz(o.id)}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                className="freq-cell"
                style={{
                  padding: '16px 8px 14px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8, color: 'var(--t3)', position: 'relative',
                  borderColor: active ? color : undefined,
                  background: active ? `${color}14` : undefined,
                }}>
                {!limits.allViz && isPlusViz(o.id) && (
                  <span style={{ position: 'absolute', top: 7, right: 7, fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)', padding: '2px 6px', borderRadius: 999 }}>
                    PLUS
                  </span>
                )}
                <VizGlyph mode={o.id} active={active} color={color} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 800, color: active ? 'var(--t1)' : 'var(--t2)' }}>{o.label}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--t3)', marginTop: 1 }}>{o.sub}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={viz} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--t3)', textAlign: 'center', margin: '-16px 0 30px', padding: '0 8px' }}>
            {VIZ_OPTIONS.find(v => v.id === viz)?.desc}
          </motion.p>
        </AnimatePresence>

        {/* ── Step 2 · Frequency ───────────────────────────────────────────── */}
        <SectionLabel n={2} text="Choose your frequency" />

        {/* Dropdown */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <button onClick={() => setOpen(o => !o)} className="hz-input-group"
            style={{ width: '100%', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, flexShrink: 0 }} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                  {hz} Hz · {freq.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {freq.tagline}
                </span>
              </span>
            </span>
            <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"
              animate={{ rotate: open ? 180 : 0 }} style={{ flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </motion.svg>
          </button>

          <AnimatePresence>
            {open && (
              <>
                <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 45 }} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="glass-premium"
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
                    maxHeight: 340, overflowY: 'auto', padding: 6, borderRadius: 20,
                  }}>
                  {HEALING_FREQUENCIES.map(f => {
                    const item = FREQUENCIES[f]
                    const sel = f === hz
                    return (
                      <button key={f} onClick={() => { setHz(f); setOpen(false) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          textAlign: 'left', background: sel ? `${item.colorHex}18` : 'transparent',
                          transition: 'background 0.14s', position: 'relative', zIndex: 2,
                        }}
                        onMouseEnter={e => { if (!sel) (e.currentTarget.style.background = 'rgba(255,255,255,0.05)') }}
                        onMouseLeave={e => { if (!sel) (e.currentTarget.style.background = 'transparent') }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.colorHex, boxShadow: `0 0 10px ${item.colorHex}`, flexShrink: 0 }} />
                        <span style={{ flexShrink: 0, width: 62, fontSize: '0.9rem', fontWeight: 800, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>
                          {f}<span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--t3)', marginLeft: 2 }}>Hz</span>
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--t1)' }}>{item.name}</span>
                          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.tagline}</span>
                        </span>
                        {sel && (
                          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M2 6l3 3 5-5" stroke={item.colorHex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Selected frequency detail */}
        <AnimatePresence mode="wait">
          <motion.div key={hz} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }} className="glass-card grain" style={{ padding: '18px 18px 20px' }}>
            <div className="shimmer-overlay" />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--t2)', marginBottom: 14 }}>
                {freq.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {freq.effects.map(e => (
                  <span key={e} style={{
                    fontSize: '0.7rem', padding: '4px 10px', borderRadius: 999,
                    background: `${color}14`, border: `1px solid ${color}30`, color: 'var(--t1)', fontWeight: 600,
                  }}>{e}</span>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', lineHeight: 1.6, color: 'var(--t3)', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                {freq.researchNote}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Sticky CTA ─────────────────────────────────────────────────────── */}
      {/* zIndex stays below the frequency dropdown (50) so the menu opens over it. */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '12px 16px calc(20px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(0deg, rgba(7,7,15,0.98) 60%, transparent)',
      }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <button onClick={begin} className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '0.92rem', justifyContent: 'center' }}>
            Begin {hz} Hz · {VIZ_OPTIONS.find(v => v.id === viz)?.label} Session →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 800, background: 'var(--t1)', color: 'var(--bg)',
      }}>{n}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{text}</span>
    </div>
  )
}
