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

// ─── Frequency catalog (80 curated tones for the browse page) ──────────────
export interface CatalogEntry {
  hz: number
  name: string
  /** One line, shown on the card. */
  benefit: string
  /** A fuller explanation, shown in the detail sheet. */
  detail: string
  /** When to reach for this tone. */
  use: string
  /** Binaural band this pairs best with. */
  band: BinauralBand
  category: CategoryId
}
export type CategoryId = 'solfeggio' | 'brainwave' | 'planetary' | 'angel' | 'tuning' | 'chakra' | 'rife'

export const FREQ_CATEGORIES: {
  id: CategoryId; label: string; color: string; blurb: string; about: string; source: string
}[] = [
  {
    id: 'solfeggio', label: 'Solfeggio', color: '#5CE8DC',
    blurb: 'The ancient six-tone healing scale, extended.',
    about: 'A six-note scale associated with Gregorian chant, revived in the 1970s and later extended with three higher tones. Each step is traditionally treated as working on a different layer of body and mind.',
    source: 'Historic chant scale · revived by Joseph Puleo, 1974',
  },
  {
    id: 'brainwave', label: 'Brainwaves', color: '#4a90e8',
    blurb: 'Entrainment targets — delta through gamma.',
    about: 'These are rhythms rather than pitches. Played as a binaural beat, the difference between the two ears lands in this range and cortical rhythm tends to drift toward it — the effect measured as entrainment.',
    source: 'EEG research · Hans Berger, 1924 onward',
  },
  {
    id: 'planetary', label: 'Planetary', color: '#8b5cf6',
    blurb: 'Cousto tones of the Earth, Sun, Moon and planets.',
    about: 'Hans Cousto took orbital and rotational periods and doubled them until they reached the audible range. The result is a set of pitches standing in a fixed mathematical relationship to the solar system.',
    source: 'The Cosmic Octave · Hans Cousto, 1978',
  },
  {
    id: 'angel', label: 'Angel', color: '#e8a020',
    blurb: 'Repeating-number frequencies for intention.',
    about: 'Repeating numbers carried into the audible range. There is no clinical literature behind these — they are used as an anchor for intention, and the tones themselves are clean, simple and easy to sit with.',
    source: 'Numerological tradition',
  },
  {
    id: 'tuning', label: 'Tuning', color: '#10b981',
    blurb: 'Natural concert and scientific reference pitches.',
    about: 'Reference pitches that whole instruments are built around. The differences between them are small in Hz but change the character of everything tuned to them.',
    source: 'Concert and scientific pitch standards',
  },
  {
    id: 'chakra', label: 'Chakra', color: '#e879a6',
    blurb: 'The seven-note body scale, root to crown.',
    about: 'A just-intonation scale built up from C = 256 Hz, one note per energy centre from root to crown. This is the tuning sold in chakra tuning-fork sets, and it moves upward through the body as it rises in pitch.',
    source: 'Just intonation from scientific pitch',
  },
  {
    id: 'rife', label: 'Rife', color: '#e0607a',
    blurb: 'Classic Rife wellness tones.',
    about: 'Frequencies from Royal Rife’s 1930s equipment, still circulated in wellness practice. Treat these as traditional rather than evidence-based — they are included because people look for them by number.',
    source: 'Royal Raymond Rife, 1930s',
  },
]

export const CATEGORY_COLOR: Record<CategoryId, string> =
  Object.fromEntries(FREQ_CATEGORIES.map(c => [c.id, c.color])) as Record<CategoryId, string>

export const FREQ_CATALOG: CatalogEntry[] = [
  // ── Solfeggio ────────────────────────────────────────────────────────────
  { hz: 174, name: 'Foundation', category: 'solfeggio', band: 'delta',
    benefit: 'Eases pain and creates a sense of safety.',
    detail: 'The lowest tone in the scale, low enough that you feel it as much as hear it. Traditionally used as a natural anaesthetic — the reports are about physical tension letting go rather than anything mental.',
    use: 'Sore body, or lying down at the end of a hard day' },
  { hz: 285, name: 'Restore', category: 'solfeggio', band: 'delta',
    benefit: 'Supports tissue healing and cellular repair.',
    detail: 'Associated with recovery and regeneration. Often chosen after physical strain, and it sits low enough to stay comfortable over long stretches.',
    use: 'Rest days and recovery from illness or injury' },
  { hz: 396, name: 'Liberation', category: 'solfeggio', band: 'theta',
    benefit: 'Releases fear, guilt and limiting beliefs.',
    detail: 'The first of the original six (Ut). Used in sound therapy for working with fear and guilt — the heavy, long-held kind rather than passing worry.',
    use: 'Journalling, therapy homework, sitting with something difficult' },
  { hz: 417, name: 'Change', category: 'solfeggio', band: 'alpha',
    benefit: 'Clears stuck patterns and enables change.',
    detail: 'The second tone (Re), associated with undoing situations that feel stuck. Reached for at turning points rather than in daily practice.',
    use: 'Starting over — new job, new city, new habit' },
  { hz: 528, name: 'Miracle', category: 'solfeggio', band: 'alpha',
    benefit: 'The love tone — repair and transformation.',
    detail: 'The most studied tone in the scale. Small clinical studies report reduced anxiety and a shift toward parasympathetic dominance — the branch of the nervous system that handles rest.',
    use: 'The default starting point if you are new to this' },
  { hz: 639, name: 'Connection', category: 'solfeggio', band: 'alpha',
    benefit: 'Harmonizes relationships and communication.',
    detail: 'The heart tone (Fa), used for repairing connection — with others and with yourself. Warm in character rather than energising.',
    use: 'After conflict, or when you have been isolated a while' },
  { hz: 741, name: 'Awaken', category: 'solfeggio', band: 'beta',
    benefit: 'Detoxifies and sharpens problem-solving.',
    detail: 'The clarity tone (Sol). Brighter and more forward than the rest of the scale, which is why it suits thinking work rather than winding down.',
    use: 'Deep work blocks and untangling a hard problem' },
  { hz: 852, name: 'Intuition', category: 'solfeggio', band: 'theta',
    benefit: 'Awakens intuition and inner clarity.',
    detail: 'The sixth tone (La), traditionally tied to the third eye. Used in meditation for getting underneath surface chatter.',
    use: 'Morning meditation, or before a decision you keep avoiding' },
  { hz: 963, name: 'Oneness', category: 'solfeggio', band: 'theta',
    benefit: 'Crown activation and pure awareness.',
    detail: 'The highest of the classic tones, sometimes called the crown frequency. Thin and bell-like — a single clean point to keep returning attention to.',
    use: 'Deep meditation, longer sits' },
  { hz: 1074, name: 'Extended · Renewal', category: 'solfeggio', band: 'theta',
    benefit: 'Continues the scale past the crown.',
    detail: 'One of three later additions that extend the scale upward. Very bright — best at low volume, and not one to leave running for an hour.',
    use: 'Short, focused sits' },
  { hz: 1185, name: 'Extended · Insight', category: 'solfeggio', band: 'theta',
    benefit: 'A high, piercing clarity tone.',
    detail: 'The second extension tone. At this pitch the character is closer to a struck bell than a hum, and it cuts through background noise easily.',
    use: 'Short resets between tasks' },
  { hz: 1296, name: 'Extended · Unity', category: 'solfeggio', band: 'theta',
    benefit: 'The top of the extended scale.',
    detail: 'The highest tone in the extended set. Keep the volume down here — brightness at this pitch tires the ear quickly.',
    use: 'Brief closing tone at the end of a practice' },

  // ── Brainwaves ───────────────────────────────────────────────────────────
  { hz: 0.5, name: 'Delta Void', category: 'brainwave', band: 'delta',
    benefit: 'Profound stillness and detached calm.',
    detail: 'The slowest rhythm here, at the floor of what EEG picks up in deep sleep. Below hearing as a tone — you meet it as a binaural beat.',
    use: 'Lying down, eyes closed, going nowhere' },
  { hz: 1, name: 'Delta Rest', category: 'brainwave', band: 'delta',
    benefit: 'The deepest stage of restorative sleep.',
    detail: 'Dominant during the stage of sleep where physical repair happens. Long sessions suit this one — the effect is cumulative, not immediate.',
    use: 'Overnight, or a long afternoon rest' },
  { hz: 1.5, name: 'Delta Renewal', category: 'brainwave', band: 'delta',
    benefit: 'Whole-body regeneration and healing.',
    detail: 'Associated with growth-hormone release during deep sleep. Slow enough that you stop tracking it within a minute or two.',
    use: 'Recovery sleep after heavy training or illness' },
  { hz: 2, name: 'Delta Repair', category: 'brainwave', band: 'delta',
    benefit: 'Deep physical restoration.',
    detail: 'Sits in the middle of the delta band, the range where the body does its maintenance. A safe default if you want delta and are not sure which.',
    use: 'Any long, passive session' },
  { hz: 2.5, name: 'Delta Relief', category: 'brainwave', band: 'delta',
    benefit: 'Eases pain and releases endorphins.',
    detail: 'Reported to prompt endorphin release. Chosen for discomfort that keeps you from settling rather than for sleep itself.',
    use: 'Aches that keep you awake' },
  { hz: 3, name: 'Delta Drift', category: 'brainwave', band: 'delta',
    benefit: 'The slide from drowsy into asleep.',
    detail: 'The upper delta range, where you cross from nearly-asleep to asleep. Good for the last stretch of a wind-down.',
    use: 'The last 20 minutes before sleep' },
  { hz: 3.5, name: 'Delta Sleep', category: 'brainwave', band: 'delta',
    benefit: 'Sinks you into deep, dreamless sleep.',
    detail: 'Just under the theta boundary — deep, but not so slow that it feels like nothing is happening.',
    use: 'Falling asleep' },
  { hz: 4, name: 'Theta Gate', category: 'brainwave', band: 'theta',
    benefit: 'The threshold of deep relaxation.',
    detail: 'The exact boundary between delta and theta, and the doorway between sleep and deep meditation. Sits right on the edge.',
    use: 'Long meditation, or naps you want to stay shallow' },
  { hz: 5, name: 'Theta Insight', category: 'brainwave', band: 'theta',
    benefit: 'Intuition, imagery and inner insight.',
    detail: 'The range where hypnagogic imagery shows up — the loose, unbidden pictures you get on the edge of sleep.',
    use: 'Creative work that needs a wandering mind' },
  { hz: 6, name: 'Theta Release', category: 'brainwave', band: 'theta',
    benefit: 'Emotional processing and letting go.',
    detail: 'Mid-theta, associated with emotional material surfacing without the usual guard up. Give it time — this one rewards longer sessions.',
    use: 'Processing something you have been carrying' },
  { hz: 7, name: 'Theta Depth', category: 'brainwave', band: 'theta',
    benefit: 'Deep meditative, trance-like calm.',
    detail: 'Upper theta, just below the Schumann resonance. Deep but stable — you stay present rather than drifting off.',
    use: 'Established meditation practice' },
  { hz: 7.83, name: 'Schumann', category: 'brainwave', band: 'theta',
    benefit: "The Earth's pulse — grounding and reset.",
    detail: 'The fundamental resonance of the cavity between the Earth and the ionosphere. Measured, not invented — the planet genuinely hums at this rate.',
    use: 'After too long indoors or on screens' },
  { hz: 8, name: 'Alpha Calm', category: 'brainwave', band: 'alpha',
    benefit: 'Relaxed, present awareness.',
    detail: 'The bottom of the alpha band, where relaxation starts without drowsiness. The classic eyes-closed resting rhythm.',
    use: 'Ten minutes of doing nothing' },
  { hz: 9, name: 'Alpha Settle', category: 'brainwave', band: 'alpha',
    benefit: 'Unwinding without losing alertness.',
    detail: 'Low-mid alpha. Calm enough to slow a racing mind, awake enough that you can still read or think.',
    use: 'The first hour after work' },
  { hz: 10, name: 'Alpha Ease', category: 'brainwave', band: 'alpha',
    benefit: 'Stress relief and a serotonin lift.',
    detail: 'The centre of the alpha band and the most studied point in it. Associated with reduced stress markers and a mild mood lift.',
    use: 'The all-purpose choice for stress' },
  { hz: 11, name: 'Alpha Flow', category: 'brainwave', band: 'alpha',
    benefit: 'Relaxed absorption in a task.',
    detail: 'Upper-mid alpha, the range associated with flow states — engaged but not effortful.',
    use: 'Drawing, writing, playing an instrument' },
  { hz: 12, name: 'Alpha Focus', category: 'brainwave', band: 'alpha',
    benefit: 'Calm, centered concentration.',
    detail: 'The top of alpha, bordering beta. Focus without the tightness that comes higher up the band.',
    use: 'Reading and studying' },
  { hz: 14, name: 'Beta Alert', category: 'brainwave', band: 'beta',
    benefit: 'Awake, engaged and alert.',
    detail: 'Low beta — the ordinary waking rhythm when you are paying attention to something outside yourself.',
    use: 'Shaking off morning grogginess' },
  { hz: 16, name: 'Beta Engage', category: 'brainwave', band: 'beta',
    benefit: 'Active involvement and momentum.',
    detail: 'Sustains attention without tipping into the tense end of beta. A good working default.',
    use: 'Meetings, admin, getting started' },
  { hz: 18, name: 'Beta Drive', category: 'brainwave', band: 'beta',
    benefit: 'Sustained focus and concentration.',
    detail: 'Mid beta, for work that needs to hold together over an hour or more.',
    use: 'Long focused sessions' },
  { hz: 20, name: 'Beta Push', category: 'brainwave', band: 'beta',
    benefit: 'Effortful, deliberate concentration.',
    detail: 'Upper-mid beta. Effective but tiring — use it in blocks rather than all day.',
    use: 'Deadline work' },
  { hz: 30, name: 'Beta Sharp', category: 'brainwave', band: 'beta',
    benefit: 'Active, analytical thinking.',
    detail: 'The top of beta, bordering gamma. Sharp and a little wiry — not one for anxious days.',
    use: 'Debugging, analysis, dense problems' },
  { hz: 40, name: 'Gamma Peak', category: 'brainwave', band: 'gamma',
    benefit: 'Memory, cognition and peak flow.',
    detail: 'The most researched frequency in the whole library. MIT work on 40 Hz light and sound stimulation drives gamma oscillation and shows effects on memory in animal models.',
    use: 'Before demanding cognitive work' },
  { hz: 50, name: 'Gamma High', category: 'brainwave', band: 'gamma',
    benefit: 'Binding across the whole brain.',
    detail: 'Above the well-studied 40 Hz point. Associated with binding separate streams of information into one perception.',
    use: 'Short bursts before creative work' },

  // ── Planetary (Cousto) ───────────────────────────────────────────────────
  { hz: 126.22, name: 'Sun', category: 'planetary', band: 'alpha',
    benefit: 'Warmth, confidence and vitality.',
    detail: 'Derived from the Sun’s own rotation period, doubled into hearing range. The lowest and warmest of the planetary set.',
    use: 'Dark mornings and flat, low-energy days' },
  { hz: 136.1, name: 'OM · Earth Year', category: 'planetary', band: 'theta',
    benefit: 'The tone of OM — heart-centering calm.',
    detail: 'Calculated from the Earth’s orbit around the Sun. It is the tuning of the Indian tanpura and the pitch of the chanted OM — in use for centuries before anyone did the arithmetic.',
    use: 'The reference tone for meditation practice' },
  { hz: 140.25, name: 'Pluto', category: 'planetary', band: 'delta',
    benefit: 'Transformation and deep renewal.',
    detail: 'The slowest orbit in the set produces one of its most grounded tones. Associated with endings that clear space.',
    use: 'Closing a chapter' },
  { hz: 141.27, name: 'Mercury', category: 'planetary', band: 'beta',
    benefit: 'Communication and mental agility.',
    detail: 'From the fastest orbit in the solar system. Quick and bright in character, matching what it is named for.',
    use: 'Before speaking, writing or negotiating' },
  { hz: 144.72, name: 'Mars', category: 'planetary', band: 'beta',
    benefit: 'Energy, courage and willpower.',
    detail: 'Forceful and direct — the most activating tone in the planetary group.',
    use: 'Before training or anything you are avoiding' },
  { hz: 147.85, name: 'Saturn', category: 'planetary', band: 'beta',
    benefit: 'Discipline, structure and focus.',
    detail: 'Associated with structure and limits. Steady rather than uplifting, which is the point of it.',
    use: 'Building a habit, or work requiring persistence' },
  { hz: 172.06, name: 'Platonic Year', category: 'planetary', band: 'theta',
    benefit: 'The slowest cycle we can measure.',
    detail: 'Derived from the precession of the equinoxes — a single cycle takes around 26,000 years. The longest period in the Cousto system by a wide margin.',
    use: 'Long meditation when you want perspective' },
  { hz: 183.58, name: 'Jupiter', category: 'planetary', band: 'alpha',
    benefit: 'Growth, abundance and optimism.',
    detail: 'The most expansive tone of the set, tied to the largest planet. Open and generous in character.',
    use: 'Planning, and days that need lifting' },
  { hz: 194.18, name: 'Earth Day', category: 'planetary', band: 'beta',
    benefit: 'Grounding, vitality and drive.',
    detail: 'From a single rotation of the Earth — one day, doubled into the audible range. The most everyday tone in the group.',
    use: 'Morning, to start the day on something steady' },
  { hz: 207.36, name: 'Uranus', category: 'planetary', band: 'beta',
    benefit: 'Insight, originality and change.',
    detail: 'Associated with sudden shifts and unconventional thinking. Restless in a productive way.',
    use: 'Brainstorming and breaking a stalemate' },
  { hz: 210.42, name: 'Moon', category: 'planetary', band: 'theta',
    benefit: 'Emotional flow, intuition and sleep.',
    detail: 'From the synodic month — the cycle you can watch in the sky. Tied to emotion, water and sleep.',
    use: 'Evenings and emotional weather' },
  { hz: 211.44, name: 'Neptune', category: 'planetary', band: 'theta',
    benefit: 'Dreams, imagination and the mystic.',
    detail: 'The dreamiest tone here, and nearly a twin of the Moon’s in pitch. Diffuse rather than sharp.',
    use: 'Dreamwork and unfocused creative time' },
  { hz: 221.23, name: 'Venus', category: 'planetary', band: 'alpha',
    benefit: 'Love, beauty and harmony.',
    detail: 'The highest of the planetary tones and the sweetest. Associated with beauty, affection and ease.',
    use: 'Unwinding, and time with people you like' },

  // ── Angel numbers ────────────────────────────────────────────────────────
  { hz: 111, name: 'Manifest', category: 'angel', band: 'delta',
    benefit: 'Alignment and new beginnings.',
    detail: 'Also known independently as the "holy frequency" — 111 Hz was measured in the stone chambers of the Hypogeum in Malta, where the architecture resonates at almost exactly this pitch.',
    use: 'Starting something, or setting an intention' },
  { hz: 222, name: 'Balance', category: 'angel', band: 'delta',
    benefit: 'Harmony, trust and equilibrium.',
    detail: 'An octave above 111 Hz, so the two stack cleanly if you want to move between them.',
    use: 'When something is out of proportion' },
  { hz: 333, name: 'Guidance', category: 'angel', band: 'alpha',
    benefit: 'Support, creativity and encouragement.',
    detail: 'Used as an anchor for creative encouragement. Mid-range and easy to sit with for long stretches.',
    use: 'Creative work that has stalled' },
  { hz: 444, name: 'Protection', category: 'angel', band: 'alpha',
    benefit: 'Stability and grounded reassurance.',
    detail: 'Sits close to concert A, so it sounds familiar and settled rather than exotic.',
    use: 'Anxious days when you want something solid' },
  { hz: 555, name: 'Shift', category: 'angel', band: 'alpha',
    benefit: 'Transition and positive momentum.',
    detail: 'Associated with change already underway rather than change you are trying to start.',
    use: 'Mid-transition, when things are already moving' },
  { hz: 666, name: 'Rebalance', category: 'angel', band: 'alpha',
    benefit: 'Returning attention to what matters.',
    detail: 'In numerology this number is read as a nudge to rebalance rather than anything ominous — a signal that attention has drifted to the material and could come back.',
    use: 'When you have lost the thread of your own priorities' },
  { hz: 777, name: 'Fortune', category: 'angel', band: 'beta',
    benefit: 'Luck, flow and spiritual reward.',
    detail: 'Bright and forward. High enough that lower volume is more comfortable.',
    use: 'Before something you want to go well' },
  { hz: 888, name: 'Abundance', category: 'angel', band: 'beta',
    benefit: 'Prosperity and infinite flow.',
    detail: 'Two octaves above 222 Hz, so it pairs naturally with the lower angel tones.',
    use: 'Financial planning and work on scarcity thinking' },
  { hz: 999, name: 'Completion', category: 'angel', band: 'theta',
    benefit: 'Closure and readiness for the new.',
    detail: 'The last of the single-digit repeats, used for endings. Close in pitch to the 963 Hz crown tone.',
    use: 'Finishing something, and closing a practice' },
  { hz: 1111, name: 'Threshold', category: 'angel', band: 'theta',
    benefit: 'The doorway number — awakening.',
    detail: 'The most-cited number in the whole tradition, the one people report seeing on clocks. Very bright at this pitch, so keep the volume low.',
    use: 'A short marker at the start of a practice' },

  // ── Tuning ───────────────────────────────────────────────────────────────
  { hz: 128, name: 'Deep C', category: 'tuning', band: 'delta',
    benefit: 'A low, stabilizing grounding tone.',
    detail: 'An octave below scientific C. Low enough to feel in the chest, which is why it is the standard weighted tuning-fork pitch for bodywork.',
    use: 'Grounding when you feel scattered' },
  { hz: 216, name: 'Natural A · low', category: 'tuning', band: 'delta',
    benefit: 'The warm octave below 432 Hz.',
    detail: 'Exactly half of 432 Hz, so it carries the same character an octave down — warmer and less present.',
    use: 'Background listening while you work' },
  { hz: 256, name: 'Scientific C', category: 'tuning', band: 'delta',
    benefit: 'A clean, grounding reference baseline.',
    detail: 'Scientific pitch, where middle C is a power of two. Every octave lands on a whole number, which is why physicists preferred it and musicians ignored it.',
    use: 'The reference point for the chakra scale' },
  { hz: 288, name: 'Sacral D', category: 'tuning', band: 'alpha',
    benefit: 'Creative, flowing energy.',
    detail: 'A whole step above scientific C. Fluid rather than settled in character.',
    use: 'Creative work and physical movement' },
  { hz: 384, name: 'Gravity G', category: 'tuning', band: 'alpha',
    benefit: 'Balance and centered poise.',
    detail: 'A perfect fifth above scientific C — the most stable interval in music, and it sounds it.',
    use: 'Balance work, yoga, breathing practice' },
  { hz: 432, name: 'Natural A', category: 'tuning', band: 'delta',
    benefit: "Warm, natural concert tuning (Verdi's A).",
    detail: 'The alternative concert pitch, eight Hz below the modern standard. Small studies comparing it against 440 Hz report a slightly lower mean heart rate and better sleep-quality scores.',
    use: 'The easiest place to start if 528 Hz feels too bright' },
  { hz: 440, name: 'Standard A', category: 'tuning', band: 'alpha',
    benefit: 'The modern concert pitch reference.',
    detail: 'The international tuning standard since 1955, and what almost every recording you own is tuned to. Included so you can hear the 432 comparison for yourself.',
    use: 'Comparing directly against 432 Hz' },
  { hz: 512, name: 'Scientific C · high', category: 'tuning', band: 'beta',
    benefit: 'The bright octave of scientific pitch.',
    detail: 'An octave above 256 Hz. Clear and bell-like, and it cuts through ambient noise well.',
    use: 'Marking the start or end of a session' },

  // ── Chakra ───────────────────────────────────────────────────────────────
  { hz: 256, name: 'Root · C', category: 'chakra', band: 'delta',
    benefit: 'Safety, stability and belonging.',
    detail: 'The base of the scale, at the base of the spine. Everything above is tuned in whole-number ratios from this note.',
    use: 'When you feel unsafe or unsettled' },
  { hz: 288, name: 'Sacral · D', category: 'chakra', band: 'alpha',
    benefit: 'Creativity, pleasure and flow.',
    detail: 'A 9:8 whole tone above the root. Associated with the lower belly and with creative and physical appetite.',
    use: 'Creative blocks, and reconnecting with the body' },
  { hz: 320, name: 'Solar Plexus · E', category: 'chakra', band: 'beta',
    benefit: 'Willpower, confidence and drive.',
    detail: 'A 5:4 major third above the root, at the solar plexus. The assertive note of the scale.',
    use: 'Before something that needs nerve' },
  { hz: 341.3, name: 'Heart · F', category: 'chakra', band: 'alpha',
    benefit: 'Compassion, connection and balance.',
    detail: 'A 4:3 fourth above the root, and the hinge of the scale — three centres below, three above.',
    use: 'Grief, and repairing connection' },
  { hz: 384, name: 'Throat · G', category: 'chakra', band: 'alpha',
    benefit: 'Expression and speaking clearly.',
    detail: 'A 3:2 fifth above the root — the most consonant interval there is, at the centre tied to voice.',
    use: 'Before difficult conversations' },
  { hz: 426.7, name: 'Third Eye · A', category: 'chakra', band: 'theta',
    benefit: 'Insight, imagination and perception.',
    detail: 'A 5:3 sixth above the root. Close to 432 Hz, and it shares some of that tone’s warmth.',
    use: 'Meditation and intuitive work' },
  { hz: 480, name: 'Crown · B', category: 'chakra', band: 'theta',
    benefit: 'Awareness beyond the personal.',
    detail: 'A 15:8 seventh above the root, at the top of the head and the top of the scale. Unresolved by design — it leans toward the octave.',
    use: 'Closing a chakra sequence, root to crown' },

  // ── Rife ─────────────────────────────────────────────────────────────────
  { hz: 20, name: 'Rife Base', category: 'rife', band: 'beta',
    benefit: 'The low anchor of the Rife set.',
    detail: 'The bottom of Rife’s range, at the edge of hearing as a pitch. Usually run underneath a higher tone rather than alone.',
    use: 'As a base layer under another Rife tone' },
  { hz: 727, name: 'Vitality', category: 'rife', band: 'beta',
    benefit: 'Classic Rife tone for general vitality.',
    detail: 'One of the three most-cited numbers in Rife practice, usually run in sequence with 787 and 880 Hz.',
    use: 'First in the classic three-tone sequence' },
  { hz: 787, name: 'Immune', category: 'rife', band: 'beta',
    benefit: 'Rife tone linked with immune support.',
    detail: 'The middle of the classic trio. Traditional use, not clinical evidence — worth being clear about.',
    use: 'Second in the classic three-tone sequence' },
  { hz: 800, name: 'Steady', category: 'rife', band: 'beta',
    benefit: 'A round, general-purpose Rife tone.',
    detail: 'A general tone in the sets, sitting between the two best-known numbers.',
    use: 'A gentler alternative to 880 Hz' },
  { hz: 880, name: 'Relief', category: 'rife', band: 'beta',
    benefit: 'Rife tone for soothing and relief.',
    detail: 'The last of the classic trio and the most used of the three. An exact octave above 440 Hz.',
    use: 'Last in the classic three-tone sequence' },
  { hz: 1550, name: 'Clearing', category: 'rife', band: 'gamma',
    benefit: 'A high clearing tone.',
    detail: 'Well up the range and sharply bright. Short exposures at low volume are the sensible approach.',
    use: 'Brief, quiet sessions only' },
  { hz: 5000, name: 'High Field', category: 'rife', band: 'gamma',
    benefit: 'Near the top of the traditional range.',
    detail: 'Very high, and close to where the ear is most sensitive — which means it feels much louder than the volume suggests. Turn it down before you play it.',
    use: 'Seconds rather than minutes' },
  { hz: 10000, name: 'Upper Limit', category: 'rife', band: 'gamma',
    benefit: 'The top of the classic Rife range.',
    detail: 'The highest tone in the library. Many adults cannot hear the top of this range at all, and it should be played quietly by anyone who can.',
    use: 'A brief test of your own hearing range' },
]
