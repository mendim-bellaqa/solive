'use client'

import { useMemo, useState } from 'react'

const MIN = 80
const MAX = 4000
const PLOT = { x0: 46, x1: 612, y0: 22, y1: 196 }

/**
 * Schematic of auditory-nerve phase locking. Fibres fire in step with the
 * waveform of a pure tone up to roughly 1–1.5 kHz, then progressively lose the
 * ability, and the binaural-beat percept fades with it. The exact rolloff
 * differs by species and method; the shape and the corner are what matter.
 */
function fidelity(hz: number) {
  return 1 / (1 + Math.pow(hz / 1200, 3))
}

const xOf = (hz: number) =>
  PLOT.x0 + (Math.log(hz / MIN) / Math.log(MAX / MIN)) * (PLOT.x1 - PLOT.x0)

const yOf = (f: number) => PLOT.y1 - f * (PLOT.y1 - PLOT.y0)

const TICKS = [100, 200, 500, 1000, 2000, 4000]

function verdictFor(f: number) {
  if (f >= 0.85) return { label: 'Locked · beat is strong', tone: 'var(--alpha)' }
  if (f >= 0.55) return { label: 'Slipping · beat is thinning', tone: '#9fd67a' }
  if (f >= 0.25) return { label: 'Weak · barely perceptible', tone: '#e8c05a' }
  return { label: 'Gone · two separate tones', tone: '#e07a6a' }
}

export default function CarrierCeiling() {
  // Slider is linear in log space so the low end — where it matters — gets room.
  const [pos, setPos] = useState(() => Math.log(200 / MIN) / Math.log(MAX / MIN))
  const hz = Math.round(MIN * Math.pow(MAX / MIN, pos))
  const f = fidelity(hz)
  const verdict = verdictFor(f)

  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 120; i++) {
      const h = MIN * Math.pow(MAX / MIN, i / 120)
      pts.push(`${i === 0 ? 'M' : 'L'}${xOf(h).toFixed(1)},${yOf(fidelity(h)).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])

  const area = `${curve} L${PLOT.x1},${PLOT.y1} L${PLOT.x0},${PLOT.y1} Z`

  return (
    <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">

      {/* ── Copy ──────────────────────────────────────────────────────── */}
      <div style={{ ['--tone' as string]: verdict.tone }}>
        <span className="eyebrow">The ceiling nobody mentions</span>
        <h2 className="h-section" style={{ margin: '14px 0 16px' }}>
          Above 1.5 kHz,<br />
          <span className="spectral">the effect dies.</span>
        </h2>
        <p className="lede" style={{ marginBottom: 20 }}>
          A binaural beat depends on neurons firing in step with the sound wave itself.
          Auditory nerve fibres can do that up to about a kilohertz, struggle through
          the next half, and above roughly 1.5 kHz stop entirely — they still signal that a
          tone is present, but no longer <em>when</em> in its cycle. Without that timing
          detail the brainstem has nothing to compare, and the third tone never forms.
        </p>
        <p style={{ fontSize: '0.86rem', lineHeight: 1.7, color: 'var(--t2)', marginBottom: 24 }}>
          It is why a beat layered under a bright 4 kHz tone does nothing at all, and why
          every session hzaura builds carries its beat on a <strong style={{ color: 'var(--t1)' }}>200 Hz</strong> tone —
          deep in the range where the timing survives.
        </p>
        <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 420 }}>
          <div className="readout">
            <span className="readout-value">{hz.toLocaleString()} Hz</span>
            <span className="readout-label">Carrier</span>
          </div>
          <div className="readout">
            <span className="readout-value" style={{ color: verdict.tone }}>{Math.round(f * 100)}%</span>
            <span className="readout-label">Phase locking</span>
          </div>
        </div>
      </div>

      {/* ── Plot ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 22 }}>
        <svg viewBox="0 0 640 234" style={{ width: '100%', display: 'block' }} role="img"
             aria-label={`Phase locking fidelity falls from full at low carriers to near zero above 2 kHz. Current carrier ${hz} hertz, ${Math.round(f * 100)} percent.`}>
          <defs>
            <linearGradient id="ccFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Dead zone */}
          <rect x={xOf(1500)} y={PLOT.y0} width={PLOT.x1 - xOf(1500)} height={PLOT.y1 - PLOT.y0}
                fill="rgba(224,122,106,0.07)" />
          <line x1={xOf(1500)} y1={PLOT.y0} x2={xOf(1500)} y2={PLOT.y1}
                stroke="#e07a6a" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 5" />
          <text x={xOf(1500) + 8} y={PLOT.y0 + 13} fill="#e07a6a" fontSize="10" fontWeight="700"
                letterSpacing="0.6">NO BEAT FORMS</text>

          {/* Horizontal gridlines */}
          {[0, 0.5, 1].map(g => (
            <line key={g} x1={PLOT.x0} y1={yOf(g)} x2={PLOT.x1} y2={yOf(g)}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          ))}

          <path d={area} fill="url(#ccFill)" />
          <path d={curve} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

          {/* hzaura's own carrier */}
          <line x1={xOf(200)} y1={yOf(fidelity(200))} x2={xOf(200)} y2={PLOT.y1}
                stroke="var(--t3)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 4" />
          <text x={xOf(200)} y={PLOT.y0 + 12} textAnchor="middle" fill="var(--t3)" fontSize="10"
                fontWeight="700">hzaura · 200 Hz</text>

          {/* Live marker */}
          <line x1={xOf(hz)} y1={PLOT.y0} x2={xOf(hz)} y2={PLOT.y1}
                stroke={verdict.tone} strokeWidth="1.5" strokeOpacity="0.75" />
          <circle cx={xOf(hz)} cy={yOf(f)} r="11" fill={verdict.tone} fillOpacity="0.18" />
          <circle cx={xOf(hz)} cy={yOf(f)} r="5.5" fill={verdict.tone} stroke="#06060e" strokeWidth="2" />

          {/* Axes */}
          {TICKS.map(t => (
            <text key={t} x={xOf(t)} y={PLOT.y1 + 20} textAnchor="middle" fill="var(--t4)" fontSize="10.5">
              {t >= 1000 ? `${t / 1000}k` : t}
            </text>
          ))}
          <text x={PLOT.x0} y={PLOT.y1 + 40} fill="var(--t4)" fontSize="10" fontWeight="700"
                letterSpacing="1.2">CARRIER FREQUENCY (Hz)</text>
          <text x={PLOT.x0 - 8} y={yOf(1) + 4} textAnchor="end" fill="var(--t4)" fontSize="10">100%</text>
          <text x={PLOT.x0 - 8} y={yOf(0) + 4} textAnchor="end" fill="var(--t4)" fontSize="10">0</text>
        </svg>

        <label style={{ display: 'block', marginTop: 6 }}>
          <span className="sr-only">Carrier frequency</span>
          <input
            type="range"
            className="hz-range"
            min={0} max={1} step={0.001}
            value={pos}
            onChange={e => setPos(Number(e.target.value))}
            aria-label="Carrier frequency"
            aria-valuetext={`${hz} hertz, ${Math.round(f * 100)} percent phase locking`}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginTop: 4 }}>
          <span className="verdict" style={{ ['--tone' as string]: verdict.tone }}>{verdict.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--t4)' }}>Drag to sweep the carrier</span>
        </div>
      </div>
    </div>
  )
}
