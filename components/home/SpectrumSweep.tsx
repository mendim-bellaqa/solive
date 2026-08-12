'use client'

import { useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useInView } from 'framer-motion'
import { getOrCreateFrequency, primaryCatalogEntry } from '@/lib/frequencies'
import { pitchBandLabel, tonotopicPosition } from '@/lib/brainMap'

const ThreeVisualizer = dynamic(() => import('@/components/ThreeVisualizer'), { ssr: false })

/**
 * The whole audible range, as one control.
 *
 * The page claims any tone from 1 to 20,000 Hz is playable, and then never
 * shows what that means. Sweeping the slider makes the claim physical: the
 * cymatic figure reorganises, the place the tone lands in auditory cortex
 * slides along the strip, and the description of what that region of the
 * spectrum even is changes underneath. Twenty thousand options is an abstract
 * number; watching the form change across them is not.
 *
 * Log-scaled, because hearing is. Half the slider covers 20 Hz to ~630 Hz,
 * which is where nearly every tone anyone actually asks for lives.
 */

const MIN = 20, MAX = 20000

// Spaced so no two labels collide on a log axis — 432 and 528 sit about three
// percent apart and printed on top of each other.
const MARKS = [
  { hz: 40,    label: '40' },
  { hz: 174,   label: '174' },
  { hz: 528,   label: '528' },
  { hz: 2000,  label: '2k' },
  { hz: 8000,  label: '8k' },
]

/** What the body does with this part of the spectrum — mechanism, not mood. */
function feelFor(hz: number): string {
  if (hz < 40) return 'Below the pitch floor: felt through the chest and the soles of the feet before it is heard as a note.'
  if (hz < 200) return 'Long waves that pass through tissue rather than off it — the range that carries furthest through a body.'
  if (hz < 800) return 'Where phase locking is strongest, so a binaural beat carried here is the most reliably perceived.'
  if (hz < 2000) return 'The band speech is built from; the ear devotes more cortex to it than to any other stretch.'
  if (hz < 6000) return 'Peak sensitivity — the ear canal resonates here, which is why this range feels loudest for its energy.'
  return 'Above phase locking. Pitch is still resolved, but timing information is largely gone.'
}

export default function SpectrumSweep() {
  const [pos, setPos] = useState(() => Math.log(432 / MIN) / Math.log(MAX / MIN))
  const ref = useRef<HTMLDivElement>(null)
  const near = useInView(ref, { once: true, margin: '400px' })

  const hz = Math.round(MIN * Math.pow(MAX / MIN, pos))
  const entry = useMemo(() => primaryCatalogEntry(hz), [hz])
  const freq = useMemo(() => getOrCreateFrequency(hz), [hz])
  const color = freq.colorHex
  const tono = tonotopicPosition(hz)

  const posOf = (v: number) => Math.log(v / MIN) / Math.log(MAX / MIN)

  return (
    <div ref={ref} className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">

      {/* ── The form ────────────────────────────────────────────────────── */}
      <div className="viewport" style={{ aspectRatio: '1 / 1' }}>
        {near && (
          <ThreeVisualizer
            hz={hz}
            isPlaying={false}
            analyserRef={{ current: null }}
            colorHex={color}
            vizMode="lissajous"
          />
        )}
        <div className="viewport-ticks" />
        <div className="viewport-label">
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Cymatic form</span>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {hz.toLocaleString('en-US')}
            <span style={{ fontSize: '0.44em', color: 'var(--t3)', marginLeft: 4, fontWeight: 700 }}>Hz</span>
          </p>
          <span style={{ fontSize: '0.68rem', color: 'var(--t4)' }}>
            {entry ? entry.name : 'Not in the curated set — still plays'}
          </span>
        </div>
      </div>

      {/* ── The control ─────────────────────────────────────────────────── */}
      <div>
        <span className="eyebrow">Twenty thousand of them</span>
        <h2 className="h-section" style={{ margin: '14px 0 16px' }}>
          Every tone has<br />
          <span className="spectral">a different shape.</span>
        </h2>
        <p className="lede" style={{ marginBottom: 26 }}>
          Drag across the audible range. The figure is the tone&apos;s own geometry, and the
          marker below is where that pitch physically lands in your auditory cortex — the
          one place a frequency really does map to a place.
        </p>

        <label className="sweep-label">
          <span className="sr-only">Frequency</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.0005}
            value={pos}
            onChange={e => setPos(Number(e.target.value))}
            className="hz-range"
            style={{ ['--tone' as string]: color }}
            aria-label="Frequency"
            aria-valuetext={`${hz} hertz`}
          />
        </label>

        <div className="sweep-marks" aria-hidden>
          {MARKS.map(m => (
            <button
              key={m.hz}
              type="button"
              className="sweep-mark"
              data-on={Math.abs(posOf(m.hz) - pos) < 0.012 || undefined}
              style={{ left: `${posOf(m.hz) * 100}%` }}
              onClick={() => setPos(posOf(m.hz))}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Tonotopic strip: front of the auditory cortex is low, back is high. */}
        <div className="tono">
          <div className="tono-head">
            <span className="eyebrow" style={{ fontSize: '0.58rem' }}>Where it lands · auditory cortex</span>
            <span className="tono-band" style={{ color }}>{pitchBandLabel(hz)}</span>
          </div>
          <div className="tono-strip">
            <span className="tono-dot" style={{ left: `${tono * 100}%`, background: color, boxShadow: `0 0 14px ${color}` }} />
          </div>
          <div className="tono-ends" aria-hidden>
            <span>low · anterior</span>
            <span>high · posterior</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', lineHeight: 1.7, color: 'var(--t3)', marginTop: 18 }}>
          {feelFor(hz)}
        </p>
      </div>
    </div>
  )
}
