'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  BAND_DETAIL, BINAURAL_PRESETS, CATEGORY_COLOR, FREQ_CATEGORIES,
  catalogEntriesFor, getOrCreateFrequency, primaryCatalogEntry, suggestedBandFor,
  type BinauralBand, type CatalogEntry,
} from '@/lib/frequencies'
import Header from '@/components/Header'
import BackLink from '@/components/BackLink'
import { usePlan, planForMinutes, previewSecondsFor, PLAN_LIMITS, type PlanId } from '@/lib/plan'
import { isPreviewAvailable, previewsSpentToday, hoursUntilReset, PREVIEW_EVENT } from '@/lib/preview'
import { useSessionPresets, type SessionPreset } from '@/lib/presets'
import { useSessionDefaults } from '@/lib/prefs'
import FrequencyPicker from './FrequencyPicker'

const Biofield = dynamic(() => import('@/components/Biofield'), { ssr: false })
const ThreeVisualizer = dynamic(() => import('@/components/ThreeVisualizer'), { ssr: false })
const NeuralBrain = dynamic(() => import('@/components/NeuralBrain'), { ssr: false })

// ─── Visualization modes ──────────────────────────────────────────────────────
type VizMode = 'brain' | 'aura' | 'frequency'

const VIZ_OPTIONS: { id: VizMode; label: string; sub: string; desc: string }[] = [
  { id: 'brain',     label: 'Brain',       sub: 'Neural Activation',   desc: 'Watch cortical activity warm from cool to peak — a PET-scan style map of your brain lighting up over the session.' },
  { id: 'aura',      label: 'Body Aura',   sub: 'Biofield Expansion',  desc: 'A wireframe figure inside an energy field that expands and brightens as the frequency entrains your system.' },
  { id: 'frequency', label: 'Frequencies', sub: 'Cymatic Waveform',    desc: 'The pure geometry of sound — a 3D Lissajous form that morphs with the exact shape of your chosen frequency.' },
]

const BANDS: BinauralBand[] = ['delta', 'theta', 'alpha', 'beta', 'gamma']

const LENGTHS: { minutes: number; label: string; note: string }[] = [
  { minutes: 1,    label: '1 min',  note: 'The free taste' },
  { minutes: 10,   label: '10 min', note: 'A reset between things' },
  { minutes: 15,   label: '15 min', note: 'The shortest measurable shift' },
  { minutes: 30,   label: '30 min', note: 'The usual practice length' },
  { minutes: 45,   label: '45 min', note: 'A full deep session' },
  { minutes: 60,   label: '60 min', note: 'Long-form, for sleep or recovery' },
  { minutes: 9999, label: 'Open',   note: 'Runs until you stop it' },
]

function fmtHz(hz: number) {
  return hz >= 1000 ? hz.toLocaleString('en-US') : String(hz)
}

function lengthLabel(minutes: number) {
  return LENGTHS.find(l => l.minutes === minutes)?.label ?? `${minutes} min`
}

/** "1 minute" / "30 seconds" — a quantity, not an adjective, because it reads
 *  in noun position: "you get 1 minute of audio". */
function previewLabel(seconds: number) {
  if (!Number.isFinite(seconds)) return 'full-length audio'
  if (seconds % 60 !== 0) return `${seconds} seconds`
  const m = seconds / 60
  return m === 1 ? '1 minute' : `${m} minutes`
}

/** Open-ended (9999) needs an unlimited plan; everything else needs the cap. */
function allows(plan: PlanId, minutes: number) {
  const max = PLAN_LIMITS[plan].maxMinutes
  return minutes === 9999 ? max === Infinity : minutes <= max
}

/** The longest length this plan can actually run, for clamping. */
function clampMinutes(plan: PlanId, minutes: number) {
  if (allows(plan, minutes)) return minutes
  const allowed = LENGTHS.filter(l => allows(plan, l.minutes)).map(l => l.minutes)
  return allowed.length ? Math.max(...allowed) : 10
}

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
  const { limits, plan } = usePlan()
  const { presets, signedIn, ready: authReady, save, remove } = useSessionPresets()

  // How many tones have been sampled today, and whether the one currently
  // selected is among them. Read in an effect so the server render and the
  // first client render agree.
  const [spentToday, setSpentToday] = useState(0)
  const [thisOneSpent, setThisOneSpent] = useState(false)

  const [viz, setViz]         = useState<VizMode>('brain')
  const [hz, setHz]           = useState<number>(528)
  const [band, setBand]       = useState<BinauralBand>(suggestedBandFor(528))
  const [desiredMinutes, setDesiredMinutes] = useState<number>(30)
  const [bandTouched, setBandTouched] = useState(false)
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [saveOpen, setSaveOpen]       = useState(false)
  const [saveName, setSaveName]       = useState('')
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    const sync = () => {
      setSpentToday(previewsSpentToday())
      setThisOneSpent(!isPreviewAvailable(hz))
    }
    sync()
    window.addEventListener(PREVIEW_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PREVIEW_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [hz])

  const freq  = useMemo(() => getOrCreateFrequency(hz), [hz])
  const entry = useMemo(() => primaryCatalogEntry(hz), [hz])
  const alsoIn = useMemo(() => catalogEntriesFor(hz).slice(1), [hz])
  const suggested = suggestedBandFor(hz)
  const color = entry ? CATEGORY_COLOR[entry.category] : freq.colorHex
  // Derived rather than clamped in place: a Pro user's 60-minute default must
  // survive the moment before the plan has resolved from storage.
  const minutes = clampMinutes(plan, desiredMinutes)
  const isPlusViz = (v: VizMode) => v === 'brain' || v === 'aura'

  // The suggested band follows the tone until the user overrides it — after
  // that their choice sticks, because it was deliberate.
  useEffect(() => {
    if (!bandTouched) setBand(suggested)
  }, [suggested, bandTouched])

  // Whatever the user set as their defaults in Settings, applied once the
  // browser has handed them over.
  const { prefs, loaded: prefsLoaded } = useSessionDefaults()
  const [prefsApplied, setPrefsApplied] = useState(false)
  useEffect(() => {
    if (!prefsLoaded || prefsApplied) return
    setViz(prefs.viz)
    setDesiredMinutes(prefs.minutes)
    if (prefs.band !== 'suggested') { setBand(prefs.band); setBandTouched(true) }
    setPrefsApplied(true)
  }, [prefsLoaded, prefsApplied, prefs])

  const title = entry?.name ?? freq.name
  const blurb = entry?.benefit ?? freq.tagline

  function applyPreset(p: SessionPreset) {
    setHz(p.hz)
    setBand(p.band)
    setBandTouched(true)
    setViz(p.viz)
    setDesiredMinutes(p.minutes)
  }

  function begin() {
    const params = new URLSearchParams({
      hz: String(hz),
      binaural: band,
      duration: String(minutes),
      viz,
    })
    router.push(`/studio?${params.toString()}`)
  }

  /** A saved setup lives on the account — a visitor gets the sign-in page
   *  rather than a "Saved ✓" that survives nothing. */
  function openSave() {
    if (!signedIn) { router.push('/auth/login?next=/session'); return }
    setSaveName(`${fmtHz(hz)} Hz · ${title}`)
    setSaveOpen(true)
  }

  async function doSave() {
    const ok = await save({ name: saveName, hz, band, viz, minutes })
    if (!ok) return
    setSaveOpen(false)
    setSaveName('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <Header />

      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 88px) 16px 150px', position: 'relative' }}>

        <div style={{ marginBottom: 18 }}><BackLink fallbackLabel="Home" /></div>

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
            Four choices: what you see, what you hear, how it entrains, how long.
          </p>
        </motion.div>

        {/* ── Saved setups ─────────────────────────────────────────────────── */}
        {presets && presets.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--t4)' }}>
                YOUR SAVED SESSIONS
              </p>
              <p style={{ fontSize: '0.62rem', color: 'var(--t4)' }}>
                On your account
              </p>
            </div>
            <div className="scroll-row" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {presets.map(p => (
                <div key={p.id} className="preset-chip">
                  <button onClick={() => applyPreset(p)} className="preset-chip-main">
                    <span className="preset-chip-name">{p.name}</span>
                    <span className="preset-chip-meta">
                      {fmtHz(p.hz)} Hz · {BINAURAL_PRESETS[p.band].label} · {lengthLabel(p.minutes)}
                    </span>
                  </button>
                  <button onClick={() => remove(p.id)} className="preset-chip-x" aria-label={`Delete ${p.name}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Live preview ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="player-surface" style={{ position: 'relative', aspectRatio: '4 / 3', marginBottom: 8 }}>
          {viz === 'frequency'
            ? <ThreeVisualizer hz={hz} isPlaying={false} analyserRef={{ current: null }} colorHex={color} vizMode="lissajous" />
            : viz === 'brain'
            ? <NeuralBrain isPlaying={false} mode="preview" band={band} hz={hz} />
            : <Biofield colorHex={color} isPlaying={false} quality="preview" />
          }
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
              {fmtHz(hz)}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--t3)', marginLeft: 3 }}>Hz</span>
            </p>
            <p style={{ fontSize: '0.68rem', color: 'var(--t2)', fontWeight: 600 }}>{title}</p>
          </div>
        </motion.div>

        {/* ── Step 1 · Frequency ───────────────────────────────────────────── */}
        <SectionLabel n={1} text="Choose your frequency" />

        <button onClick={() => setPickerOpen(true)} className="hz-input-group"
          style={{ width: '100%', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`, flexShrink: 0 }} />
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                {fmtHz(hz)} Hz · {title}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {blurb}
              </span>
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, color: 'var(--t3)' }}>
            Browse
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Selected frequency detail */}
        <AnimatePresence mode="wait">
          <motion.div key={hz} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }} className="glass-card grain" style={{ padding: '18px 18px 20px', marginBottom: 30 }}>
            <div className="shimmer-overlay" />
            <div style={{ position: 'relative', zIndex: 2 }}>
              {entry && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <Tag color={color}>{FREQ_CATEGORIES.find(c => c.id === entry.category)?.label}</Tag>
                  {alsoIn.map(e => (
                    <Tag key={e.category} color={CATEGORY_COLOR[e.category]}>
                      also {FREQ_CATEGORIES.find(c => c.id === e.category)?.label}
                    </Tag>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--t2)', marginBottom: 12 }}>
                {entry?.detail ?? freq.description}
              </p>
              <InfoRow label="REACH FOR IT" value={entry?.use ?? freq.effects.join(' · ')} />
              {entry && (
                <InfoRow
                  label="WHERE IT COMES FROM"
                  value={FREQ_CATEGORIES.find(c => c.id === entry.category)?.source ?? ''}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Step 2 · Visualization ───────────────────────────────────────── */}
        <SectionLabel n={2} text="Choose your 3D experience" />
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

        {/* ── Step 3 · Brainwave band ──────────────────────────────────────── */}
        <SectionLabel n={3} text="Choose the brainwave target" />
        <p style={{ fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--t3)', margin: '-6px 0 14px' }}>
          Underneath the tone sits a binaural beat — a few Hz of difference between your ears that
          cortical rhythm tends to drift toward. It decides whether a session settles you or sharpens you,
          so it matters more than the tone itself. <strong style={{ color: 'var(--t2)' }}>Headphones required.</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
          {BANDS.map(b => {
            const on = band === b
            const preset = BINAURAL_PRESETS[b]
            return (
              <button key={b} onClick={() => { setBand(b); setBandTouched(true) }}
                className="band-cell" data-on={on || undefined}
                style={on ? { borderColor: color, background: `${color}18` } : undefined}>
                {b === suggested && <span className="band-star" style={{ background: color }} aria-hidden />}
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: on ? 'var(--t1)' : 'var(--t2)' }}>{preset.label}</span>
                <span style={{ fontSize: '0.56rem', color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{preset.hz} Hz</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={band} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} className="glass" style={{ padding: '14px 16px', marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <p style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                {BINAURAL_PRESETS[band].label} · {BINAURAL_PRESETS[band].state}
              </p>
              <p style={{ fontSize: '0.64rem', color: 'var(--t4)', whiteSpace: 'nowrap' }}>{BAND_DETAIL[band].range}</p>
            </div>
            <p style={{ fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--t3)', marginBottom: 8 }}>
              {BAND_DETAIL[band].what}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--t4)' }}>
              <strong style={{ color: 'var(--t3)' }}>Best for:</strong> {BAND_DETAIL[band].best}
            </p>
            {band === suggested ? (
              <p style={{ fontSize: '0.68rem', color, marginTop: 8 }}>
                ● Suggested pairing for {fmtHz(hz)} Hz
              </p>
            ) : (
              <button onClick={() => { setBand(suggested); setBandTouched(false) }}
                style={{ fontSize: '0.68rem', color: 'var(--t3)', background: 'none', border: 'none', padding: 0, marginTop: 8, textDecoration: 'underline' }}>
                Use the suggested {BINAURAL_PRESETS[suggested].label} pairing instead
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Step 4 · Length ──────────────────────────────────────────────── */}
        <SectionLabel n={4} text="Choose how long" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {LENGTHS.map(l => {
            const on = minutes === l.minutes
            const need = planForMinutes(l.minutes)
            const locked = !allows(plan, l.minutes)
            return (
              <button key={l.minutes}
                onClick={() => (locked ? router.push('/pricing') : setDesiredMinutes(l.minutes))}
                className="len-cell" data-on={on || undefined} data-locked={locked || undefined}
                style={on ? { borderColor: color, background: `${color}18` } : undefined}>
                {locked && (
                  <span className="len-lock">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    {need.toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: on ? 'var(--t1)' : 'var(--t2)' }}>{l.label}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--t4)', lineHeight: 1.35 }}>{l.note}</span>
              </button>
            )
          })}
        </div>

        {/* What the current plan gives you, and what the next one adds. */}
        {plan !== 'pro' && (
          <button onClick={() => router.push('/pricing')}
            style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '0.72rem', lineHeight: 1.6,
                     color: 'var(--t3)', padding: '10px 12px', borderRadius: 10,
                     background: 'var(--accent-dim)', border: '1px solid var(--accent-mid)' }}>
            {plan === 'free' ? (
              <>
                {signedIn ? 'Free' : 'Without an account'} you get{' '}
                <strong style={{ color: 'var(--t1)' }}>{previewLabel(previewSecondsFor('free', signedIn))}</strong>{' '}
                of audio on <strong style={{ color: 'var(--t1)' }}>every frequency</strong>, once each per day —
                the visuals keep running either way.
                {!signedIn && ' Signing in doubles it to a full minute.'}
                {thisOneSpent
                  ? ` You have already heard ${hz.toLocaleString('en-US')} Hz today; it opens again in ${hoursUntilReset()}h, and every other tone is still free to try.`
                  : spentToday > 0
                    ? ` ${spentToday} tone${spentToday === 1 ? '' : 's'} sampled today.`
                    : ''}
                {' '}Plus replays anything, any time, up to 60 minutes; Pro runs open-ended. <span style={{ color: 'var(--accent)' }}>See plans →</span>
              </>
            ) : (
              <>
                Plus runs full sessions up to <strong style={{ color: 'var(--t1)' }}>{limits.maxMinutes} minutes</strong>.
                Pro adds open-ended sessions that run until you stop them. <span style={{ color: 'var(--accent)' }}>See Pro →</span>
              </>
            )}
          </button>
        )}
      </main>

      {/* ── Sticky CTA ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '12px 16px calc(20px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(0deg, rgba(7,7,15,0.98) 60%, transparent)',
      }}>
        <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', gap: 8 }}>
          {/* Inert until auth has resolved, so an early tap can't send a
              signed-in user to the sign-in page. */}
          <button onClick={openSave} disabled={!authReady}
            className="btn-ghost" style={{ padding: '15px 16px', flexShrink: 0, opacity: authReady ? 1 : 0.5 }}
            aria-label={signedIn ? 'Save this setup' : 'Sign in to save this setup'}>
            {saved ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button onClick={begin} className="btn-primary" style={{ flex: 1, padding: '15px', fontSize: '0.9rem', justifyContent: 'center' }}>
            Begin {fmtHz(hz)} Hz · {lengthLabel(minutes)} →
          </button>
        </div>
      </div>

      <FrequencyPicker
        open={pickerOpen}
        selectedHz={hz}
        onClose={() => setPickerOpen(false)}
        onPick={(e: CatalogEntry) => { setHz(e.hz); setBandTouched(false); setPickerOpen(false) }}
      />

      {/* ── Save dialog ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {saveOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSaveOpen(false)} aria-hidden
              style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,4,10,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
            {/* Centred by a flex wrapper rather than a transform — the card's
                own transform belongs to the entrance animation. */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 91, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
            <motion.div role="dialog" aria-modal="true" aria-label="Save this session"
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="glass-premium"
              style={{ width: 'min(400px, 100%)', padding: 20, pointerEvents: 'auto' }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--t4)', marginBottom: 6 }}>
                SAVE THIS SETUP
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--t3)', lineHeight: 1.55, marginBottom: 14 }}>
                {fmtHz(hz)} Hz · {BINAURAL_PRESETS[band].label} · {VIZ_OPTIONS.find(v => v.id === viz)?.label} · {lengthLabel(minutes)}
                <br />
                Saved to your account, so it follows you to any device.
              </p>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSave()}
                maxLength={60}
                autoFocus
                aria-label="Name this session"
                className="preset-name-input"
                placeholder="Evening wind-down"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setSaveOpen(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button onClick={doSave} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Save
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────
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

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 999, color,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{children}</span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--t4)', width: 116, flexShrink: 0, paddingTop: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--t2)' }}>{value}</p>
    </div>
  )
}
