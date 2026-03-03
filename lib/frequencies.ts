export type FrequencyColorTheme = 'amber' | 'red' | 'emerald' | 'blue' | 'violet' | 'purple'

export type BinauralBand = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma'

export interface SoliveFrequency {
  hz: number
  name: string
  tagline: string
  description: string
  effects: string[]
  researchNote: string
  color: FrequencyColorTheme
  colorHex: string
  cymatics: string
}

export interface BinauralPreset {
  band: BinauralBand
  hz: number
  label: string
  state: string
  carrierHz: number
}

// ─── Full Solfeggio frequency library ─────────────────────────────────────
export const FREQUENCIES: Record<number, SoliveFrequency> = {
  174: {
    hz: 174,
    name: 'Foundation',
    tagline: 'Natural Pain Relief',
    description: 'The lowest Solfeggio tone. Acts as a natural anesthetic — deeply grounding, working directly on physical pain and muscle tension.',
    effects: ['Physical pain relief', 'Muscle relaxation', 'Stress reduction', 'Grounding'],
    researchNote: 'Associated with pain relief and sedation. Practitioners report significant reduction in lower back pain, migraines, and physical tension.',
    color: 'amber',
    colorHex: '#f59e0b',
    cymatics: 'Simple, slow-pulsing oval forms — the pattern of deep earth vibration.',
  },
  285: {
    hz: 285,
    name: 'Tissue Healer',
    tagline: 'Cellular Regeneration',
    description: "Targets the body's cellular intelligence. Heals wounds, restores organ vitality, and boosts the immune system from within.",
    effects: ['Cellular repair', 'Immune boost', 'Energy restoration', 'Organ healing'],
    researchNote: 'Cell biology studies show sound frequencies in this range influence cell proliferation and viability. Used in vibroacoustic healing protocols.',
    color: 'amber',
    colorHex: '#f59e0b',
    cymatics: 'Soft expanding rings with two-fold symmetry — like a healing ripple in water.',
  },
  396: {
    hz: 396,
    name: 'Liberator',
    tagline: 'Release Fear & Grief',
    description: 'Breaks through deep-seated fear, guilt, and grief. Grounds emotional charges that have been held in the body for years.',
    effects: ['Fear release', 'Guilt dissolution', 'Grief processing', 'Emotional grounding'],
    researchNote: 'The first of the original six Solfeggio tones (Ut). Used in sound therapy for trauma processing and emotional liberation.',
    color: 'red',
    colorHex: '#ef4444',
    cymatics: 'Three-fold petal patterns — opening like a flower releasing tension.',
  },
  417: {
    hz: 417,
    name: 'Change Maker',
    tagline: 'Undo Negative Patterns',
    description: 'The frequency of transformation. Breaks free from stuck situations, clears cellular trauma, and makes space for positive change.',
    effects: ['Pattern breaking', 'Trauma clearing', 'Adaptability', 'Fresh starts'],
    researchNote: 'Second Solfeggio tone (Re). Used therapeutically for facilitating change and clearing residual emotional blocks.',
    color: 'red',
    colorHex: '#ef4444',
    cymatics: 'Four-fold cross geometry — tension resolving into symmetry.',
  },
  432: {
    hz: 432,
    name: 'Earth Tone',
    tagline: 'Natural Harmony & Sleep',
    description: 'Tuned to the mathematical frequency of nature. More calming than standard 440 Hz — measurably reduces heart rate and induces deep sleep.',
    effects: ['Heart rate reduction', 'Natural calm', 'Sleep induction', 'Emotional centering'],
    researchNote: 'Double-blind studies show 432 Hz reduces mean heart rate by ~5 bpm vs 440 Hz, and significantly improves sleep quality scores.',
    color: 'emerald',
    colorHex: '#10b981',
    cymatics: 'Mandala-like radial symmetry — the pattern water makes at this exact frequency.',
  },
  528: {
    hz: 528,
    name: 'Miracle Tone',
    tagline: 'Love, Calm & Transformation',
    description: 'The most researched Solfeggio frequency. Reduces anxiety, activates the parasympathetic nervous system, and creates profound inner peace.',
    effects: ['Anxiety reduction', 'Parasympathetic activation', 'Emotional clarity', 'Inner calm'],
    researchNote: 'Clinical studies confirm 528 Hz significantly reduces anxiety, decreases cellular oxidative stress, and increases parasympathetic nervous system dominance.',
    color: 'emerald',
    colorHex: '#10b981',
    cymatics: 'Six-pointed star geometry — the hexagonal pattern of transformation.',
  },
  639: {
    hz: 639,
    name: 'Heart Connector',
    tagline: 'Relationships & Connection',
    description: 'The frequency of the heart. Rebuilds connection — with others, with yourself, with life. Used for conflict resolution and emotional intelligence.',
    effects: ['Emotional connection', 'Conflict resolution', 'Communication', 'Social warmth'],
    researchNote: 'Fourth Solfeggio tone (Fa). Used in sound therapy for rebuilding interpersonal trust and processing loneliness or disconnection.',
    color: 'blue',
    colorHex: '#3b82f6',
    cymatics: 'Fluid wave patterns with flowing bilateral symmetry — the shape of connection.',
  },
  741: {
    hz: 741,
    name: 'Clarity Field',
    tagline: 'Focus & Mental Detox',
    description: 'Cleanses the mind of fog, noise, and confusion. Sharpens analytical thinking, boosts problem-solving, and energizes mental output.',
    effects: ['Mental clarity', 'Focus enhancement', 'Problem-solving', 'Toxin clearing'],
    researchNote: 'Fifth Solfeggio tone (Sol). Associated with electromagnetic detox. Used in focus-enhancement sound therapy protocols.',
    color: 'violet',
    colorHex: '#8b5cf6',
    cymatics: 'Complex star polygon with multiple-fold symmetry — rapid, precise crystalline forms.',
  },
  852: {
    hz: 852,
    name: 'Inner Vision',
    tagline: 'Intuition & Spiritual Insight',
    description: 'Opens the inner eye. Cuts through surface noise to access deep intuition, inner truth, and spiritual awareness.',
    effects: ['Intuitive awakening', 'Spiritual clarity', 'Inner truth', 'Third eye activation'],
    researchNote: 'Sixth Solfeggio tone (La). Used in meditation traditions for heightening awareness and accessing intuitive intelligence.',
    color: 'purple',
    colorHex: '#a855f7',
    cymatics: 'Intricate multi-petaled mandala — complexity becoming order.',
  },
  963: {
    hz: 963,
    name: 'Crown Frequency',
    tagline: 'Unity & Transcendence',
    description: "The highest Solfeggio tone — the 'God frequency'. Activates the pineal gland, connects to universal consciousness, and dissolves separation.",
    effects: ['Deep meditation', 'Pineal activation', 'Unity consciousness', 'Pure awareness'],
    researchNote: 'Extended Solfeggio tone (Si). Used in advanced meditation for accessing states of transcendence and spiritual unity.',
    color: 'purple',
    colorHex: '#a855f7',
    cymatics: 'Perfect crystalline lattice — the highest geometric order visible in sound.',
  },
}

// ─── Binaural beat presets ─────────────────────────────────────────────────
export const BINAURAL_PRESETS: Record<BinauralBand, BinauralPreset> = {
  delta: { band: 'delta', hz: 2,  carrierHz: 200, label: 'Delta', state: 'Deep Sleep & Healing' },
  theta: { band: 'theta', hz: 6,  carrierHz: 200, label: 'Theta', state: 'Deep Meditation & Emotional Processing' },
  alpha: { band: 'alpha', hz: 9,  carrierHz: 200, label: 'Alpha', state: 'Calm Focus & Relaxation' },
  beta:  { band: 'beta',  hz: 18, carrierHz: 200, label: 'Beta',  state: 'Alert Concentration' },
  gamma: { band: 'gamma', hz: 40, carrierHz: 200, label: 'Gamma', state: 'Peak Cognition & High Performance' },
}

export function getFrequency(hz: number): SoliveFrequency | undefined {
  return FREQUENCIES[hz]
}

export function getColorThemeClass(color: FrequencyColorTheme): string {
  const map: Record<FrequencyColorTheme, string> = {
    amber: 'freq-amber', red: 'freq-red', emerald: 'freq-emerald',
    blue: 'freq-blue', violet: 'freq-violet', purple: 'freq-purple',
  }
  return map[color]
}

// Cymatics complexity (1–5) for Three.js — physically accurate scaling
export function getComplexityLevel(hz: number): number {
  if (hz <= 285) return 1
  if (hz <= 417) return 2
  if (hz <= 528) return 3
  if (hz <= 741) return 4
  return 5
}
