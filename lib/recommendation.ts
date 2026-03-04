import { BinauralBand, BINAURAL_PRESETS, FREQUENCIES, SoliveFrequency } from './frequencies'

// ─── Questionnaire types ───────────────────────────────────────────────────
export interface QuestionnaireAnswers {
  currentFeeling: string    // Q1
  bodyState: string         // Q2
  mindState: string         // Q3
  sleepQuality: string      // Q4
  primaryNeed: string       // Q5
  painLocation?: string     // Q6 (conditional)
  painIntensity?: string    // Q6b (conditional)
  sessionDuration: number   // Q7 (minutes)
}

export interface FrequencyRecommendation {
  frequency: SoliveFrequency
  binauralBand: BinauralBand
  binauralHz: number
  carrierHz: number
  sessionDuration: number
  scoreBreakdown: Record<number, number>
}

// ─── Scoring weights ───────────────────────────────────────────────────────
// Each answer contributes weighted points to each Solfeggio frequency (Hz key).
// Higher score = stronger recommendation.

const Q1_SCORES: Record<string, Partial<Record<number, number>>> = {
  anxious:      { 528: 5, 396: 3, 432: 2, 417: 1 },
  exhausted:    { 285: 5, 174: 4, 432: 3, 528: 1 },
  in_pain:      { 174: 6, 285: 4, 396: 1 },
  unfocused:    { 741: 5, 528: 2, 285: 1 },
  disconnected: { 639: 5, 852: 3, 963: 2 },
  sad_heavy:    { 396: 5, 417: 4, 528: 2, 639: 1 },
  calm_seeking: { 852: 4, 963: 4, 639: 2 },
}

const Q2_SCORES: Record<string, Partial<Record<number, number>>> = {
  tense_tight:      { 174: 4, 528: 3, 285: 2 },
  sore_aching:      { 174: 5, 285: 4 },
  fine_physically:  { 852: 2, 963: 2, 741: 1 },
  restless_wired:   { 528: 4, 396: 3, 432: 2 },
  heavy_drained:    { 285: 4, 174: 3, 432: 2 },
}

const Q3_SCORES: Record<string, Partial<Record<number, number>>> = {
  racing_overwhelmed: { 528: 5, 432: 4, 396: 3 },
  foggy_slow:         { 741: 4, 285: 3, 528: 1 },
  scattered:          { 741: 5, 528: 2, 417: 2 },
  fairly_clear:       { 852: 3, 639: 2, 963: 2 },
  shut_down:          { 417: 5, 285: 3, 396: 3 },
}

const Q4_SCORES: Record<string, Partial<Record<number, number>>> = {
  poor_cant_sleep:  { 432: 5, 528: 4, 396: 2 },
  poor_wake_lots:   { 432: 4, 285: 3, 174: 2 },
  average:          { 528: 1, 741: 1 },
  good:             { 852: 1, 963: 1 },
}

const Q5_SCORES: Record<string, Partial<Record<number, number>>> = {
  rest_calm:      { 528: 5, 432: 5, 396: 3 },
  focus_clarity:  { 741: 6, 528: 2 },
  emotional_release: { 396: 6, 417: 5, 639: 2 },
  physical_healing:  { 174: 6, 285: 5 },
  spiritual_depth:   { 963: 6, 852: 5, 639: 2 },
  energy_boost:      { 741: 4, 285: 3 },
}

// ─── Pain location scoring ─────────────────────────────────────────────────
const Q6_PAIN_LOCATION_SCORES: Record<string, Partial<Record<number, number>>> = {
  head:           { 528: 3, 285: 2, 174: 2 },  // headache / migraine
  neck_shoulders: { 174: 4, 528: 2, 285: 2 },  // tension
  back:           { 174: 5, 285: 3 },           // back pain — 174 Hz is the primary pain-relief frequency
  full_body:      { 285: 4, 174: 4 },           // widespread aching
  chest:          { 528: 4, 396: 3, 174: 1 },  // tightness / emotional-physical
}

// ─── Binaural band mapping per winning frequency ───────────────────────────
const FREQ_TO_BINAURAL: Record<number, BinauralBand> = {
  174: 'delta',
  285: 'delta',
  396: 'theta',
  417: 'alpha',
  432: 'delta',
  528: 'alpha',
  639: 'alpha',
  741: 'beta',
  852: 'theta',
  963: 'theta',
}

// Override binaural band based on primary need (Q5)
const NEED_BINAURAL_OVERRIDE: Record<string, BinauralBand> = {
  focus_clarity:  'beta',
  physical_healing: 'delta',
  spiritual_depth: 'theta',
  rest_calm: 'alpha',
  emotional_release: 'theta',
  energy_boost: 'beta',
}

// ─── Engine ────────────────────────────────────────────────────────────────
export function recommend(answers: QuestionnaireAnswers): FrequencyRecommendation {
  const scores: Record<number, number> = {}
  const hzKeys = Object.keys(FREQUENCIES).map(Number)

  // Initialize all frequencies at 0
  hzKeys.forEach(hz => { scores[hz] = 0 })

  // Apply Q1
  const q1 = Q1_SCORES[answers.currentFeeling] ?? {}
  Object.entries(q1).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })

  // Apply Q2
  const q2 = Q2_SCORES[answers.bodyState] ?? {}
  Object.entries(q2).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })

  // Apply Q3
  const q3 = Q3_SCORES[answers.mindState] ?? {}
  Object.entries(q3).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })

  // Apply Q4
  const q4 = Q4_SCORES[answers.sleepQuality] ?? {}
  Object.entries(q4).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })

  // Apply Q5 (heaviest weight — the user's explicit stated need)
  const q5 = Q5_SCORES[answers.primaryNeed] ?? {}
  Object.entries(q5).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })

  // Apply Q6 pain location (conditional)
  if (answers.painLocation) {
    const q6 = Q6_PAIN_LOCATION_SCORES[answers.painLocation] ?? {}
    Object.entries(q6).forEach(([hz, pts]) => { scores[Number(hz)] = (scores[Number(hz)] ?? 0) + pts! })
  }

  // Apply Q6b pain intensity boost
  if (answers.painIntensity === 'severe') {
    scores[174] = (scores[174] ?? 0) + 5
    scores[285] = (scores[285] ?? 0) + 2
  } else if (answers.painIntensity === 'moderate') {
    scores[174] = (scores[174] ?? 0) + 2
  }

  // Find winning frequency
  const winnerHz = hzKeys.reduce((best, hz) => scores[hz] > scores[best] ? hz : best, hzKeys[0])
  const frequency = FREQUENCIES[winnerHz]

  // Determine binaural band
  const binauralBand = NEED_BINAURAL_OVERRIDE[answers.primaryNeed] ?? FREQ_TO_BINAURAL[winnerHz] ?? 'alpha'
  const binaural = BINAURAL_PRESETS[binauralBand]

  return {
    frequency,
    binauralBand,
    binauralHz: binaural.hz,
    carrierHz: binaural.carrierHz,
    sessionDuration: answers.sessionDuration,
    scoreBreakdown: scores,
  }
}

// Serialize recommendation to URL params
// Also passes the runner-up secondary frequency as a subtle undertone layer
export function recommendationToParams(rec: FrequencyRecommendation): string {
  const sorted = Object.entries(rec.scoreBreakdown)
    .sort(([, a], [, b]) => b - a)
  const secondHz = sorted[1]?.[0]

  const params = new URLSearchParams({
    hz: String(rec.frequency.hz),
    binaural: rec.binauralBand,
    duration: String(rec.sessionDuration),
    ...(secondHz ? { secondary: secondHz } : {}),
  })
  return params.toString()
}
