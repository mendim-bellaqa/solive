export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface FrequencyPreset {
  name: string
  frequency: number
  wave: WaveType
  description: string
  binauralBeat?: number // Hz beat frequency for binaural mode
}

export interface FrequencyCategory {
  id: string
  label: string
  color: string
  presets: FrequencyPreset[]
}

export const FREQUENCY_CATEGORIES: FrequencyCategory[] = [
  {
    id: 'solfeggio',
    label: 'Solfeggio',
    color: '#00d4ff',
    presets: [
      { name: '174 Hz', frequency: 174, wave: 'sine', description: 'Foundation & Security — reduces pain, promotes safety' },
      { name: '285 Hz', frequency: 285, wave: 'sine', description: 'Healing & Regeneration — heals tissue and organs' },
      { name: '396 Hz', frequency: 396, wave: 'sine', description: 'Liberation — releases guilt and fear' },
      { name: '417 Hz', frequency: 417, wave: 'sine', description: 'Change & Transformation — facilitates change' },
      { name: '432 Hz', frequency: 432, wave: 'sine', description: 'Universal Harmony — Verdi\'s natural tuning' },
      { name: '528 Hz', frequency: 528, wave: 'sine', description: 'Miracle Tone — DNA repair, love frequency' },
      { name: '639 Hz', frequency: 639, wave: 'sine', description: 'Connection — enhances relationships' },
      { name: '741 Hz', frequency: 741, wave: 'sine', description: 'Intuition — awakens inner knowing' },
      { name: '852 Hz', frequency: 852, wave: 'sine', description: 'Spiritual Order — returns to spiritual balance' },
      { name: '963 Hz', frequency: 963, wave: 'sine', description: 'Divine Connection — pineal gland activation' },
    ],
  },
  {
    id: 'binaural',
    label: 'Binaural Beats',
    color: '#8b5cf6',
    presets: [
      { name: 'Delta Sleep', frequency: 200, wave: 'sine', binauralBeat: 2, description: 'Deep sleep, healing (0.5–4 Hz beat)' },
      { name: 'Theta Dream', frequency: 200, wave: 'sine', binauralBeat: 6, description: 'REM sleep, meditation (4–8 Hz beat)' },
      { name: 'Alpha Relax', frequency: 200, wave: 'sine', binauralBeat: 10, description: 'Relaxed focus, calm mind (8–14 Hz beat)' },
      { name: 'Beta Focus', frequency: 200, wave: 'sine', binauralBeat: 18, description: 'Active thinking, concentration (14–30 Hz beat)' },
      { name: 'Gamma Peak', frequency: 200, wave: 'sine', binauralBeat: 40, description: 'Peak performance, higher cognition (30–100 Hz beat)' },
    ],
  },
  {
    id: 'focus',
    label: 'Focus & Work',
    color: '#f59e0b',
    presets: [
      { name: '40 Hz Gamma', frequency: 40, wave: 'sine', description: 'Cognitive enhancement, memory' },
      { name: '14 Hz Beta', frequency: 14, wave: 'sine', description: 'Active concentration' },
      { name: '10 Hz Alpha', frequency: 10, wave: 'sine', description: 'Flow state, creativity' },
      { name: '528 Hz Focus', frequency: 528, wave: 'sine', description: 'Clarity and positive energy' },
      { name: 'Brown Noise', frequency: 100, wave: 'sawtooth', description: 'Deep focus background' },
    ],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    color: '#3b82f6',
    presets: [
      { name: 'Deep Sleep', frequency: 432, wave: 'sine', binauralBeat: 2, description: 'Delta wave induction for deep sleep' },
      { name: 'Sleep Wave', frequency: 396, wave: 'sine', binauralBeat: 1, description: 'Slow delta for falling asleep fast' },
      { name: '174 Hz Rest', frequency: 174, wave: 'sine', description: 'Pain relief & restful sleep' },
      { name: 'Theta Bridge', frequency: 432, wave: 'sine', binauralBeat: 7, description: 'Hypnagogic state — between wake & sleep' },
    ],
  },
  {
    id: 'meditation',
    label: 'Meditation',
    color: '#ec4899',
    presets: [
      { name: 'Schumann 7.83', frequency: 7.83, wave: 'sine', description: 'Earth\'s resonance frequency' },
      { name: '432 Pure', frequency: 432, wave: 'sine', description: 'Universal harmony tone' },
      { name: 'Om 136.1 Hz', frequency: 136.1, wave: 'sine', description: 'Sanskrit OM frequency' },
      { name: 'Cosmic 528', frequency: 528, wave: 'sine', description: 'Love frequency, transformation' },
      { name: 'Zen Alpha', frequency: 432, wave: 'sine', binauralBeat: 8, description: 'Meditative alpha state' },
    ],
  },
  {
    id: 'healing',
    label: 'Healing',
    color: '#10b981',
    presets: [
      { name: '285 Tissue', frequency: 285, wave: 'sine', description: 'Tissue and cellular healing' },
      { name: '528 DNA', frequency: 528, wave: 'sine', description: 'DNA repair frequency' },
      { name: '396 Stress', frequency: 396, wave: 'sine', description: 'Releases stress and anxiety' },
      { name: '174 Pain', frequency: 174, wave: 'sine', description: 'Natural anesthetic' },
      { name: 'Heart 639', frequency: 639, wave: 'sine', description: 'Heart chakra healing' },
    ],
  },
]

// Utility: convert slider (0–1000) to frequency on logarithmic scale (20–20000 Hz)
export function sliderToFreq(val: number): number {
  const min = Math.log10(20)
  const max = Math.log10(20000)
  return Math.round(Math.pow(10, min + (max - min) * val / 1000))
}

// Utility: convert frequency to slider value
export function freqToSlider(freq: number): number {
  const min = Math.log10(20)
  const max = Math.log10(20000)
  return Math.round(((Math.log10(Math.max(20, freq)) - min) / (max - min)) * 1000)
}

// Color based on frequency range
export function freqToColor(freq: number): string {
  if (freq < 100) return '#3b82f6'       // Deep blue — sub-bass
  if (freq < 300) return '#8b5cf6'       // Purple — bass
  if (freq < 800) return '#00d4ff'       // Cyan — lower mids
  if (freq < 2000) return '#10b981'      // Green — mids
  if (freq < 6000) return '#f59e0b'      // Amber — upper mids
  return '#ef4444'                        // Red — highs
}
