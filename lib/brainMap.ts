import type { BinauralBand } from './frequencies'

/**
 * What a session is doing to which parts of the brain, and when.
 *
 * Three separate inputs decide what the 3D brain shows, and they are genuinely
 * different things rather than three dials on the same effect:
 *
 *   the tone      — where a pitch physically lands in auditory cortex
 *   the beat band — which rhythm is being encouraged, and where it lives
 *   elapsed time  — how far entrainment has had a chance to spread
 *
 * Kept out of the component so the viewport and any label describing it read
 * the same numbers.
 */

export type Region =
  | 'auditory' | 'frontal' | 'parietal' | 'temporal' | 'occipital'
  | 'cerebellum' | 'brainstem' | 'thalamus'

export const REGION_LABEL: Record<Region, string> = {
  auditory:   'Auditory cortex',
  frontal:    'Frontal cortex',
  parietal:   'Parietal cortex',
  temporal:   'Temporal lobe',
  occipital:  'Occipital cortex',
  cerebellum: 'Cerebellum',
  brainstem:  'Brainstem',
  thalamus:   'Thalamus',
}

/**
 * Where each rhythm is generated or most strongly expressed. Textbook
 * associations, not decoration:
 *
 *  delta — slow-wave sleep, thalamocortical, strongest deep and frontal
 *  theta — hippocampal, medial temporal lobe
 *  alpha — Berger's rhythm, occipital; it is why closing your eyes doubles it
 *  beta  — frontal and sensorimotor, the rhythm of engaged attention
 *  gamma — binding, distributed across cortex rather than local to one lobe
 */
export const BAND_FOCUS: Record<BinauralBand, Partial<Record<Region, number>>> = {
  delta: { thalamus: 1.0, brainstem: 0.85, frontal: 0.7, cerebellum: 0.35, parietal: 0.3, temporal: 0.3, occipital: 0.25 },
  theta: { temporal: 1.0, thalamus: 0.75, frontal: 0.45, parietal: 0.3, occipital: 0.25, brainstem: 0.3, cerebellum: 0.2 },
  alpha: { occipital: 1.0, parietal: 0.75, temporal: 0.35, thalamus: 0.35, frontal: 0.25, brainstem: 0.15, cerebellum: 0.2 },
  beta:  { frontal: 1.0, parietal: 0.85, temporal: 0.45, occipital: 0.3, thalamus: 0.3, cerebellum: 0.4, brainstem: 0.2 },
  gamma: { frontal: 0.95, parietal: 0.95, temporal: 0.9, occipital: 0.85, thalamus: 0.6, cerebellum: 0.5, brainstem: 0.3 },
}

/** The seat of each rhythm, for a one-line caption. */
export const BAND_SEAT: Record<BinauralBand, Region> = {
  delta: 'thalamus', theta: 'temporal', alpha: 'occipital', beta: 'frontal', gamma: 'parietal',
}

/**
 * Tonotopy: position along the auditory cortex for a given pitch, 0…1.
 *
 * Primary auditory cortex is laid out by frequency — a piano keyboard folded
 * onto the superior temporal plane, low tones at one end and high at the other,
 * and the spacing is logarithmic rather than linear, which is why 200→400 Hz
 * covers the same distance as 2→4 kHz. It is the one place where "this
 * frequency lights up this spot" is literally, physically true, so it is the
 * one place the visualiser claims it.
 */
export function tonotopicPosition(hz: number): number {
  const lo = Math.log(20), hi = Math.log(20000)
  const v = (Math.log(Math.max(20, Math.min(20000, hz))) - lo) / (hi - lo)
  return Math.max(0, Math.min(1, v))
}

/** A plain-language band for the pitch, for the caption under the model. */
export function pitchBandLabel(hz: number): string {
  if (hz < 80)   return 'sub-bass · felt more than heard'
  if (hz < 250)  return 'low · carries furthest through tissue'
  if (hz < 500)  return 'low-mid · the body of most instruments'
  if (hz < 2000) return 'mid · where speech and phase-locking live'
  if (hz < 6000) return 'high-mid · the ear’s most sensitive band'
  return 'high · sharpest resolution, weakest phase-locking'
}

/**
 * How far entrainment has spread by this point in a session.
 *
 * A tone is sound before it is anything else: it lands in auditory cortex
 * immediately, and everything past that takes minutes. The stages are drawn
 * conservatively — behavioural effects of entrainment are small-to-moderate
 * and build over a session rather than arriving at a switch.
 */
export interface Stage { at: number; key: string; label: string; note: string }

export const STAGES: Stage[] = [
  { at: 0,    key: 'arrival',    label: 'Arrival',
    note: 'The tone reaches auditory cortex and lands at its own place on the tonotopic map.' },
  { at: 120,  key: 'locking',    label: 'Phase locking',
    note: 'Brainstem and thalamus begin tracking the beat; the frequency-following response builds.' },
  { at: 360,  key: 'spreading',  label: 'Spreading',
    note: 'The rhythm recruits the cortex this band belongs to, beyond the auditory areas.' },
  { at: 720,  key: 'entrained',  label: 'Entrained',
    note: 'Widespread cortical involvement — the state the session was aimed at.' },
]

export function stageFor(elapsedSeconds: number): Stage {
  let s = STAGES[0]
  for (const st of STAGES) if (elapsedSeconds >= st.at) s = st
  return s
}

/**
 * The activation weight per region for a given session, 0…1.
 *
 * Auditory cortex leads from the first second and never drops — it is hearing
 * the tone, which is not conditional. Everything else is gated by how long the
 * session has run, so a two-minute session and a twenty-minute one do not look
 * identical.
 */
export function regionWeights(band: BinauralBand, elapsedSeconds: number): Record<Region, number> {
  const focus = BAND_FOCUS[band]
  // 0 at the start, 1 by roughly twelve minutes.
  const spread = Math.max(0, Math.min(1, elapsedSeconds / 720))
  // Deep structures come in earlier than cortex: the brainstem tracks a beat
  // long before any cortical state has had time to shift.
  const deepGate = Math.max(0, Math.min(1, elapsedSeconds / 240))

  const out = {} as Record<Region, number>
  for (const key of Object.keys(REGION_LABEL) as Region[]) {
    if (key === 'auditory') { out.auditory = 1; continue }
    const base = focus[key] ?? 0.2
    const gate = key === 'brainstem' || key === 'thalamus' ? deepGate : spread
    out[key] = 0.12 + base * gate * 0.88
  }
  return out
}
