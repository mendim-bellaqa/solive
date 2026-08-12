/**
 * Profile marks.
 *
 * Drawn rather than photographic, and drawn from this app's own subject —
 * waveforms, cymatic figures, spectra, the torus field. A set of generic
 * cartoon faces would be someone else's product's avatars pasted onto this
 * one; these look like they came from the same place as everything else on the
 * page.
 *
 * Each is a path on a 24-unit grid so it renders crisp at any size, and each
 * carries its own colour so a list of members reads as varied without anyone
 * having to pick a colour separately.
 */

export interface Avatar {
  id: string
  label: string
  color: string
  /** Stroked paths on a 0 0 24 24 viewBox. */
  paths: string[]
  /** Optional filled dots, [cx, cy, r]. */
  dots?: [number, number, number][]
}

export const AVATARS: Avatar[] = [
  { id: 'sine',      label: 'Sine',        color: '#5CE8DC',
    paths: ['M2 12c3-7 5-7 8 0s5 7 8 0'] },
  { id: 'square',    label: 'Square wave', color: '#7db4ff',
    paths: ['M2 17h5V7h5v10h5V7h3'] },
  { id: 'triangle',  label: 'Triangle',    color: '#b98cff',
    paths: ['M2 16l4-8 5 8 5-8 4 6'] },
  { id: 'saw',       label: 'Sawtooth',    color: '#ffd166',
    paths: ['M2 17l5-10v10l5-10v10l5-10v10'] },
  { id: 'pulse',     label: 'Pulse',       color: '#ff9f68',
    paths: ['M2 12h4l2-6 3 12 2-8 2 4h7'] },
  { id: 'rings',     label: 'Resonance',   color: '#6be5a0',
    paths: ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
    dots: [[12, 12, 1.4]] },
  { id: 'spiral',    label: 'Cochlea',     color: '#f087b3',
    paths: ['M14.5 12a2.5 2.5 0 1 1-2.5-2.5 4.5 4.5 0 1 1-4.5 4.5A7 7 0 1 1 19 12'] },
  { id: 'lissajous', label: 'Lissajous',   color: '#8be0ff',
    paths: ['M12 4c5 0 8 4 8 8s-3 8-8 8-8-4-8-8 3-8 8-8', 'M4 12c4-5 12-5 16 0'] },
  { id: 'torus',     label: 'Field',       color: '#c9a6ff',
    paths: ['M12 3v18', 'M3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5'],
    dots: [[12, 12, 1.6]] },
  { id: 'spectrum',  label: 'Spectrum',    color: '#5ad1a8',
    paths: ['M4 15v-4', 'M8 18V8', 'M12 20V4', 'M16 18V8', 'M20 15v-4'] },
  { id: 'binaural',  label: 'Binaural',    color: '#ffb35c',
    paths: ['M5 12a3 3 0 0 1 6 0M13 12a3 3 0 0 1 6 0', 'M2 12h1M21 12h1'],
    dots: [[8, 15, 1.5], [16, 15, 1.5]] },
  { id: 'resonant',  label: 'Standing',    color: '#9fb4ff',
    paths: ['M3 12h18', 'M3 12c3-6 6-6 9 0s6 6 9 0'],
    dots: [[3, 12, 1.3], [12, 12, 1.3], [21, 12, 1.3]] },
]

export const DEFAULT_AVATAR = AVATARS[0].id

export function avatarById(id: string | null | undefined): Avatar | null {
  if (!id) return null
  return AVATARS.find(a => a.id === id) ?? null
}
