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

  // ─── Extended healing frequencies (non-Solfeggio, widely used) ────────────
  7.83: {
    hz: 7.83,
    name: 'Schumann Resonance',
    tagline: 'Earth Grounding',
    description: "The Earth's own heartbeat — the resonant frequency of the planet's electromagnetic field. Re-syncs the nervous system to nature and restores deep grounding.",
    effects: ['Grounding', 'Nervous system reset', 'Calm alertness', 'Circadian balance'],
    researchNote: 'Measured in the Earth-ionosphere cavity at ~7.83 Hz. Research links exposure to reduced stress markers, improved sleep and autonomic balance.',
    color: 'emerald',
    colorHex: '#10b981',
    cymatics: 'Slow, wide standing waves — the planetary pulse made visible.',
  },
  40: {
    hz: 40,
    name: 'Gamma Focus',
    tagline: 'Memory & Cognition',
    description: 'A gamma-band tone that entrains peak cognitive states. Sharpens focus, boosts memory recall, and synchronizes neural networks for high performance.',
    effects: ['Focus', 'Memory recall', 'Mental sharpness', 'Neural synchrony'],
    researchNote: 'MIT studies show 40 Hz light and sound stimulation drives gamma oscillations, clears amyloid plaques in models, and improves memory and cognition.',
    color: 'violet',
    colorHex: '#8b5cf6',
    cymatics: 'Rapid fine lattices — the crystalline signature of gamma coherence.',
  },
  111: {
    hz: 111,
    name: 'Cell Regeneration',
    tagline: 'Holy Frequency',
    description: "Known as the 'holy frequency'. Triggers endorphin release and a deeply meditative, restorative state associated with cellular repair and renewal.",
    effects: ['Cell regeneration', 'Endorphin release', 'Deep calm', 'Tissue repair'],
    researchNote: 'Recorded in ancient stone chambers (Hypogeum, Malta). EEG studies show 111 Hz shifts brain activity toward calming, restorative states.',
    color: 'blue',
    colorHex: '#3b82f6',
    cymatics: 'Nested hexagonal cells — the geometry of regeneration.',
  },
  136.1: {
    hz: 136.1,
    name: 'OM Resonance',
    tagline: 'Heart & Earth Year',
    description: "The frequency of the Earth's yearly orbit — the tone of 'OM'. Centers the heart, deepens meditation, and brings the body into natural harmony.",
    effects: ['Heart centering', 'Meditative depth', 'Harmony', 'Relaxation'],
    researchNote: "Calculated from the Earth's orbital year (Cousto). The tuning of Indian tanpura and the mantra OM — used for centuries in meditation.",
    color: 'emerald',
    colorHex: '#0ea5a4',
    cymatics: 'Balanced radial mandala — the still-point of the breath.',
  },
  256: {
    hz: 256,
    name: 'Root Anchor',
    tagline: 'Grounding & Stability',
    description: 'Scientific middle C — a clean, stabilizing tone for the root. Anchors scattered energy, restores a sense of safety, and builds a solid base.',
    effects: ['Grounding', 'Security', 'Stability', 'Base energy'],
    researchNote: 'Scientific pitch (C = 256 Hz). Used in sound-healing to tune the root chakra and re-establish a stable physical baseline.',
    color: 'amber',
    colorHex: '#f59e0b',
    cymatics: 'Four-square symmetry — the foundation stone of the harmonic series.',
  },
}

// ─── Curated "15 best-known healing frequencies" (for the session picker) ──
// Ordered from grounding → transcendence.
export const HEALING_FREQUENCIES: number[] = [
  7.83, 40, 111, 136.1, 174, 256, 285, 396, 417, 432, 528, 639, 741, 852, 963,
]

// Suggested binaural band pairing per healing frequency (used by the session picker)
export const SUGGESTED_BAND: Record<number, BinauralBand> = {
  7.83: 'theta', 40: 'gamma', 111: 'delta', 136.1: 'theta',
  174: 'delta', 256: 'delta', 285: 'delta', 396: 'theta',
  417: 'alpha', 432: 'delta', 528: 'alpha', 639: 'alpha',
  741: 'beta', 852: 'theta', 963: 'theta',
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

// ─── Dynamic frequency for any custom Hz ──────────────────────────────────
function _colorForHz(hz: number): FrequencyColorTheme {
  if (hz < 300)  return 'amber'
  if (hz < 450)  return 'red'
  if (hz < 600)  return 'emerald'
  if (hz < 700)  return 'blue'
  if (hz < 850)  return 'violet'
  return 'purple'
}

function _hexForHz(hz: number): string {
  if (hz < 300)  return '#f59e0b'
  if (hz < 450)  return '#ef4444'
  if (hz < 600)  return '#10b981'
  if (hz < 700)  return '#3b82f6'
  if (hz < 850)  return '#8b5cf6'
  return '#a855f7'
}

function _taglineForHz(hz: number): string {
  if (hz < 100)   return 'Sub-bass resonance'
  if (hz < 250)   return 'Deep grounding tone'
  if (hz < 400)   return 'Healing earth frequency'
  if (hz < 500)   return 'Natural harmonic'
  if (hz < 650)   return 'Heart field resonance'
  if (hz < 800)   return 'Clarity and focus tone'
  if (hz < 1000)  return 'Upper harmonic series'
  return 'High-frequency resonance'
}

/**
 * Returns the known SoliveFrequency for a Solfeggio Hz, or generates
 * a dynamic entry for any custom frequency. Never returns undefined.
 */
export function getOrCreateFrequency(hz: number): SoliveFrequency {
  const known = FREQUENCIES[hz]
  if (known) return known
  return {
    hz,
    name: `${hz} Hz`,
    tagline: _taglineForHz(hz),
    description: `A custom ${hz} Hz tone. Explore the unique resonance properties of this frequency through 3D cymatics and binaural entrainment.`,
    effects: ['Custom tuning', 'Resonance exploration', 'Personal frequency work'],
    researchNote: 'User-defined frequency. Sound therapy benefits depend on the specific Hz and binaural pairing chosen.',
    color: _colorForHz(hz),
    colorHex: _hexForHz(hz),
    cymatics: `Custom waveform pattern at ${hz} Hz.`,
  }
}

// ─── Frequency catalog (50+ curated tones for the browse page) ─────────────
export interface CatalogEntry { hz: number; name: string; benefit: string; category: CategoryId }
export type CategoryId = 'solfeggio' | 'brainwave' | 'planetary' | 'angel' | 'tuning' | 'rife'

export const FREQ_CATEGORIES: { id: CategoryId; label: string; color: string; blurb: string }[] = [
  { id: 'solfeggio', label: 'Solfeggio',  color: '#5CE8DC', blurb: 'The ancient six-tone healing scale, extended.' },
  { id: 'brainwave', label: 'Brainwaves', color: '#4a90e8', blurb: 'Entrainment targets — delta to gamma states.' },
  { id: 'planetary', label: 'Planetary',  color: '#8b5cf6', blurb: 'Cousto tones of the Earth, Sun, Moon & planets.' },
  { id: 'angel',     label: 'Angel',      color: '#e8a020', blurb: 'Repeating-number frequencies for intention.' },
  { id: 'tuning',    label: 'Tuning',     color: '#10b981', blurb: 'Natural concert & scientific reference pitches.' },
  { id: 'rife',      label: 'Rife',       color: '#e0607a', blurb: 'Classic Rife wellness tones.' },
]

export const CATEGORY_COLOR: Record<CategoryId, string> =
  Object.fromEntries(FREQ_CATEGORIES.map(c => [c.id, c.color])) as Record<CategoryId, string>

export const FREQ_CATALOG: CatalogEntry[] = [
  // Solfeggio
  { hz: 174,   name: 'Foundation',   benefit: 'Eases pain and creates a sense of safety.',           category: 'solfeggio' },
  { hz: 285,   name: 'Restore',      benefit: 'Supports tissue healing and cellular repair.',        category: 'solfeggio' },
  { hz: 396,   name: 'Liberation',   benefit: 'Releases fear, guilt and limiting beliefs.',          category: 'solfeggio' },
  { hz: 417,   name: 'Change',       benefit: 'Clears trauma and enables positive change.',          category: 'solfeggio' },
  { hz: 528,   name: 'Miracle',      benefit: 'The love tone — repair, transformation, DNA.',        category: 'solfeggio' },
  { hz: 639,   name: 'Connection',   benefit: 'Harmonizes relationships and communication.',         category: 'solfeggio' },
  { hz: 741,   name: 'Awaken',       benefit: 'Detoxifies and sharpens problem-solving.',            category: 'solfeggio' },
  { hz: 852,   name: 'Intuition',    benefit: 'Awakens intuition and inner clarity.',                category: 'solfeggio' },
  { hz: 963,   name: 'Oneness',      benefit: 'Crown activation and pure awareness.',                category: 'solfeggio' },

  // Brainwaves
  { hz: 0.5,   name: 'Delta Void',    benefit: 'Profound stillness and detached bliss.',             category: 'brainwave' },
  { hz: 1.5,   name: 'Delta Renewal', benefit: 'Whole-body regeneration and healing.',              category: 'brainwave' },
  { hz: 2.5,   name: 'Delta Relief',  benefit: 'Eases pain and releases endorphins.',               category: 'brainwave' },
  { hz: 3.5,   name: 'Delta Sleep',   benefit: 'Sinks you into deep, dreamless sleep.',             category: 'brainwave' },
  { hz: 4,     name: 'Theta Gate',    benefit: 'The threshold of deep relaxation.',                 category: 'brainwave' },
  { hz: 5,     name: 'Theta Insight', benefit: 'Intuition, imagery and inner insight.',             category: 'brainwave' },
  { hz: 6,     name: 'Theta Release', benefit: 'Emotional processing and letting go.',              category: 'brainwave' },
  { hz: 7,     name: 'Theta Depth',   benefit: 'Deep meditative, trance-like calm.',                category: 'brainwave' },
  { hz: 7.83,  name: 'Schumann',      benefit: "The Earth's pulse — grounding and reset.",          category: 'brainwave' },
  { hz: 8,     name: 'Alpha Calm',    benefit: 'Relaxed, present awareness.',                       category: 'brainwave' },
  { hz: 10,    name: 'Alpha Ease',    benefit: 'Stress relief and a serotonin lift.',              category: 'brainwave' },
  { hz: 12,    name: 'Alpha Focus',   benefit: 'Calm, centered concentration.',                     category: 'brainwave' },
  { hz: 14,    name: 'Beta Alert',    benefit: 'Awake, engaged and alert.',                         category: 'brainwave' },
  { hz: 20,    name: 'Beta Drive',    benefit: 'Sustained focus and concentration.',                category: 'brainwave' },
  { hz: 30,    name: 'Beta Sharp',    benefit: 'Active, analytical thinking.',                      category: 'brainwave' },
  { hz: 40,    name: 'Gamma Peak',    benefit: 'Memory, cognition and peak flow.',                  category: 'brainwave' },

  // Planetary (Cousto)
  { hz: 136.1, name: 'OM · Earth Year', benefit: 'The tone of OM — heart-centering calm.',          category: 'planetary' },
  { hz: 194.18,name: 'Earth Day',      benefit: 'Grounding, vitality and drive.',                   category: 'planetary' },
  { hz: 210.42,name: 'Moon',           benefit: 'Emotional flow, intuition and sleep.',             category: 'planetary' },
  { hz: 126.22,name: 'Sun',            benefit: 'Warmth, confidence and vitality.',                 category: 'planetary' },
  { hz: 141.27,name: 'Mercury',        benefit: 'Communication and mental agility.',                category: 'planetary' },
  { hz: 221.23,name: 'Venus',          benefit: 'Love, beauty and harmony.',                        category: 'planetary' },
  { hz: 144.72,name: 'Mars',           benefit: 'Energy, courage and willpower.',                   category: 'planetary' },
  { hz: 183.58,name: 'Jupiter',        benefit: 'Growth, abundance and optimism.',                  category: 'planetary' },
  { hz: 147.85,name: 'Saturn',         benefit: 'Discipline, structure and focus.',                 category: 'planetary' },
  { hz: 207.36,name: 'Uranus',         benefit: 'Insight, originality and change.',                 category: 'planetary' },
  { hz: 211.44,name: 'Neptune',        benefit: 'Dreams, imagination and the mystic.',              category: 'planetary' },
  { hz: 140.25,name: 'Pluto',          benefit: 'Transformation and deep renewal.',                 category: 'planetary' },

  // Angel numbers
  { hz: 111,   name: 'Manifest',   benefit: 'Alignment and new beginnings.',                        category: 'angel' },
  { hz: 222,   name: 'Balance',    benefit: 'Harmony, trust and equilibrium.',                      category: 'angel' },
  { hz: 333,   name: 'Guidance',   benefit: 'Support, creativity and encouragement.',               category: 'angel' },
  { hz: 444,   name: 'Protection', benefit: 'Stability and grounded reassurance.',                  category: 'angel' },
  { hz: 555,   name: 'Shift',      benefit: 'Transition and positive momentum.',                    category: 'angel' },
  { hz: 777,   name: 'Fortune',    benefit: 'Luck, flow and spiritual reward.',                     category: 'angel' },
  { hz: 888,   name: 'Abundance',  benefit: 'Prosperity and infinite flow.',                        category: 'angel' },
  { hz: 999,   name: 'Completion', benefit: 'Closure and readiness for the new.',                   category: 'angel' },

  // Tuning & harmony
  { hz: 432,   name: 'Natural A',     benefit: "Warm, natural concert tuning (Verdi's A).",         category: 'tuning' },
  { hz: 256,   name: 'Scientific C',  benefit: 'A clean, grounding reference baseline.',            category: 'tuning' },
  { hz: 128,   name: 'Deep C',        benefit: 'A low, stabilizing grounding tone.',                category: 'tuning' },
  { hz: 288,   name: 'Sacral C#',     benefit: 'Creative, flowing energy.',                         category: 'tuning' },
  { hz: 384,   name: 'Gravity G',     benefit: 'Balance and centered poise.',                       category: 'tuning' },

  // Rife
  { hz: 727,   name: 'Vitality',   benefit: 'Classic Rife tone for general vitality.',              category: 'rife' },
  { hz: 787,   name: 'Immune',     benefit: 'Rife tone linked with immune support.',                category: 'rife' },
  { hz: 880,   name: 'Relief',     benefit: 'Rife tone for soothing and relief.',                   category: 'rife' },
]
