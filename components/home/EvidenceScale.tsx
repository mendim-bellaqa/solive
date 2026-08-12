'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

/**
 * Where each claim on this page actually sits.
 *
 * The honest note used to be two paragraphs of prose, which is the format
 * people skim past — and the one place a wellness product most needs to be
 * read is the place it admits what it cannot prove. As a scale it becomes the
 * most scannable thing in the section instead of the least: the claims we
 * stake the product on sit at one end, the ones we name only because people
 * search for them sit at the other, and the distance between them is the
 * point.
 *
 * Positions are judgements about strength of evidence, not measurements —
 * which is why the axis is labelled in words rather than numbers.
 */

interface Claim {
  at: number          // 0 = tradition, 1 = measured
  label: string
  note: string
}

const CLAIMS: Claim[] = [
  {
    at: 0.97,
    label: 'A binaural beat is heard at all',
    note: 'Described in 1839 and reproduced ever since. Two tones, one percept that is in neither ear.',
  },
  {
    at: 0.94,
    label: 'Alpha surges when you close your eyes',
    note: 'The first human brainwave ever recorded, and among the most replicated findings in the field.',
  },
  {
    at: 0.90,
    label: 'The brainstem follows a rhythm',
    note: 'The frequency-following response is reliable enough to be used clinically to test hearing.',
  },
  {
    at: 0.72,
    label: 'Sound nudges cortical rhythm',
    note: 'Entrainment is measurable on EEG. How far it shifts, and for how long, varies by protocol.',
  },
  {
    at: 0.46,
    label: 'Sessions help anxiety, attention, memory',
    note: 'Reviews find small-to-moderate benefits, with results that vary by person and by study.',
  },
  {
    at: 0.06,
    label: 'A specific Hz carries a specific power',
    note: 'Tradition, not evidence. We name these tones because people look for them — no study established them.',
  },
]

function tone(at: number) {
  if (at >= 0.85) return '#5ce8b0'
  if (at >= 0.6) return '#8be0ff'
  if (at >= 0.3) return '#ffd166'
  return '#e08a6a'
}

export default function EvidenceScale() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Content that only exists once an observer fires is content that can fail
  // to exist. If the reveal has not run shortly after mount — an observer that
  // never fires, a viewport taller than the trigger, a browser that throttles
  // it — show it anyway. The animation is decoration; the words are not.
  const [forced, setForced] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setForced(true), 1200)
    return () => clearTimeout(t)
  }, [])
  const shown = inView || forced

  return (
    <div ref={ref}>
      <div className="ev-axis" aria-hidden>
        <span>Tradition</span>
        <span className="ev-axis-line" />
        <span>Measured</span>
      </div>

      <ul className="ev-list">
        {CLAIMS.map((c, i) => {
          const col = tone(c.at)
          return (
            <motion.li
              key={c.label}
              className="ev-row"
              initial={{ opacity: 0, y: 14 }}
              animate={shown ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ev-head">
                <span className="ev-label">{c.label}</span>
                <span className="ev-verdict" style={{ color: col }}>
                  {c.at >= 0.85 ? 'Established' : c.at >= 0.6 ? 'Measured' : c.at >= 0.3 ? 'Mixed' : 'Tradition'}
                </span>
              </div>

              <div className="ev-track">
                {/* The bar is the claim's standing; the dot is where it lands. */}
                <motion.span
                  className="ev-fill"
                  style={{ background: `linear-gradient(90deg, ${col}22, ${col})` }}
                  initial={{ scaleX: 0 }}
                  animate={shown ? { scaleX: c.at } : {}}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="ev-dot"
                  style={{ background: col, boxShadow: `0 0 12px ${col}` }}
                  initial={{ left: '0%', opacity: 0 }}
                  animate={shown ? { left: `${c.at * 100}%`, opacity: 1 } : {}}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              <p className="ev-note">{c.note}</p>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
