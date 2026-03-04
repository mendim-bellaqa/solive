'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { recommend, recommendationToParams, QuestionnaireAnswers } from '@/lib/recommendation'
import { FREQUENCIES } from '@/lib/frequencies'

// ─── Question definitions ──────────────────────────────────────────────────
interface Option {
  id: string
  emoji: string
  label: string
  sublabel?: string
}

interface Question {
  id: keyof QuestionnaireAnswers
  text: string
  subtext?: string
  options: Option[]
  conditional?: (answers: Partial<QuestionnaireAnswers>) => boolean
}

const QUESTIONS: Question[] = [
  // Q1
  {
    id: 'currentFeeling',
    text: 'Right now, I feel...',
    subtext: 'Choose what resonates most with your current state.',
    options: [
      { id: 'anxious',      emoji: '😰', label: 'Anxious',           sublabel: 'Worried, stressed, or overwhelmed' },
      { id: 'exhausted',    emoji: '😮‍💨', label: 'Exhausted',         sublabel: 'Drained, tired, low energy' },
      { id: 'in_pain',      emoji: '🤕', label: 'In pain',           sublabel: 'Physical discomfort or tension' },
      { id: 'unfocused',    emoji: '🌫️', label: 'Unfocused',         sublabel: 'Scattered, foggy, distracted' },
      { id: 'disconnected', emoji: '🪐', label: 'Disconnected',      sublabel: 'Lonely, numb, or detached' },
      { id: 'sad_heavy',    emoji: '💙', label: 'Sad or heavy',      sublabel: 'Grief, low mood, or heaviness' },
      { id: 'calm_seeking', emoji: '🔮', label: 'Calm, seeking more',sublabel: 'Already okay, looking to go deeper' },
    ],
  },
  // Q2
  {
    id: 'bodyState',
    text: 'My body feels...',
    subtext: 'Tune into physical sensations right now.',
    options: [
      { id: 'tense_tight',    emoji: '🪨', label: 'Tense or tight',    sublabel: 'Jaw, shoulders, back, neck' },
      { id: 'sore_aching',    emoji: '🔥', label: 'Sore or aching',    sublabel: 'Muscle pain or discomfort' },
      { id: 'restless_wired', emoji: '⚡', label: 'Restless or wired', sublabel: "Can't settle, jittery" },
      { id: 'heavy_drained',  emoji: '🪫', label: 'Heavy or drained',  sublabel: 'Low energy, sluggish' },
      { id: 'fine_physically',emoji: '✓',  label: 'Physically fine',   sublabel: 'No notable physical discomfort' },
    ],
  },
  // Q3
  {
    id: 'mindState',
    text: 'My mind is...',
    subtext: 'Observe your mental state without judgment.',
    options: [
      { id: 'racing_overwhelmed', emoji: '🌀', label: 'Racing or overwhelmed', sublabel: 'Too many thoughts at once' },
      { id: 'foggy_slow',         emoji: '🌁', label: 'Foggy or slow',         sublabel: 'Hard to think clearly' },
      { id: 'scattered',          emoji: '🍃', label: 'Scattered',             sublabel: 'Jumping between things' },
      { id: 'shut_down',          emoji: '❄️', label: 'Shut down',             sublabel: 'Numb, blank, checked out' },
      { id: 'fairly_clear',       emoji: '💎', label: 'Fairly clear',          sublabel: 'Functioning, somewhat present' },
    ],
  },
  // Q4
  {
    id: 'sleepQuality',
    text: 'My sleep lately has been...',
    options: [
      { id: 'poor_cant_sleep', emoji: '🌙', label: "Poor — can't fall asleep", sublabel: "Mind won't switch off" },
      { id: 'poor_wake_lots',  emoji: '🔄', label: 'Poor — waking up a lot',  sublabel: 'Restless, fragmented sleep' },
      { id: 'average',         emoji: '😐', label: 'Average',                 sublabel: 'Getting by, not ideal' },
      { id: 'good',            emoji: '😴', label: 'Good',                    sublabel: 'Well-rested' },
    ],
  },
  // Q5
  {
    id: 'primaryNeed',
    text: 'What I most need right now is...',
    subtext: 'This shapes your entire frequency prescription.',
    options: [
      { id: 'rest_calm',         emoji: '🌊', label: 'Rest & calm',        sublabel: 'Slow down, decompress' },
      { id: 'focus_clarity',     emoji: '🎯', label: 'Focus & clarity',    sublabel: 'Sharp thinking, get things done' },
      { id: 'emotional_release', emoji: '🌧️', label: 'Emotional release',  sublabel: "Let go of what I'm carrying" },
      { id: 'physical_healing',  emoji: '🌿', label: 'Physical healing',   sublabel: 'Body relief and recovery' },
      { id: 'spiritual_depth',   emoji: '✨', label: 'Spiritual depth',    sublabel: 'Meditation, meaning, connection' },
      { id: 'energy_boost',      emoji: '🔋', label: 'Energy boost',       sublabel: 'Motivation and mental drive' },
    ],
  },
  // Q6 — conditional: only shown when currentFeeling === 'in_pain'
  {
    id: 'painLocation',
    text: 'Where is the pain located?',
    subtext: 'Be as specific as feels accurate.',
    conditional: (a) => a.currentFeeling === 'in_pain',
    options: [
      { id: 'head',          emoji: '🧠', label: 'Head',             sublabel: 'Headache, migraine, pressure' },
      { id: 'neck_shoulders',emoji: '💪', label: 'Neck / Shoulders', sublabel: 'Tension, stiffness' },
      { id: 'back',          emoji: '🫀', label: 'Back',             sublabel: 'Lower or upper back pain' },
      { id: 'full_body',     emoji: '🌡️', label: 'Full body',        sublabel: 'Widespread aching or fatigue' },
      { id: 'chest',         emoji: '💔', label: 'Chest',            sublabel: 'Tightness, pressure, discomfort' },
    ],
  },
  // Q6b — conditional: only shown when currentFeeling === 'in_pain'
  {
    id: 'painIntensity',
    text: 'How intense is the pain?',
    conditional: (a) => a.currentFeeling === 'in_pain',
    options: [
      { id: 'mild',     emoji: '🟡', label: 'Mild',     sublabel: 'Noticeable but manageable' },
      { id: 'moderate', emoji: '🟠', label: 'Moderate', sublabel: 'Distracting, hard to ignore' },
      { id: 'severe',   emoji: '🔴', label: 'Severe',   sublabel: 'Significantly affecting me' },
    ],
  },
  // Q7
  {
    id: 'sessionDuration',
    text: 'How long do you have?',
    subtext: 'Research shows 15–20 min minimum for measurable effect.',
    options: [
      { id: '15',   emoji: '⏱',  label: '15 minutes',  sublabel: 'Quick reset' },
      { id: '30',   emoji: '🕐',  label: '30 minutes',  sublabel: 'Recommended for most states' },
      { id: '45',   emoji: '🕰',  label: '45 minutes',  sublabel: 'Deep session' },
      { id: '9999', emoji: '∞',  label: 'Open session', sublabel: "I'll stop when ready" },
    ],
  },
]

// Human-readable answer labels
const ANSWER_LABELS: Record<string, string> = {
  anxious: 'Anxious', exhausted: 'Exhausted', in_pain: 'In pain',
  unfocused: 'Unfocused', disconnected: 'Disconnected', sad_heavy: 'Sad/heavy', calm_seeking: 'Calm, seeking more',
  tense_tight: 'Tense/tight', sore_aching: 'Sore/aching', restless_wired: 'Restless', heavy_drained: 'Drained', fine_physically: 'Physically fine',
  racing_overwhelmed: 'Racing mind', foggy_slow: 'Foggy', scattered: 'Scattered', shut_down: 'Shut down', fairly_clear: 'Fairly clear',
  poor_cant_sleep: 'Trouble sleeping', poor_wake_lots: 'Restless sleep', average: 'Average sleep', good: 'Good sleep',
  rest_calm: 'Rest & calm', focus_clarity: 'Focus', emotional_release: 'Emotional release', physical_healing: 'Physical healing',
  spiritual_depth: 'Spiritual depth', energy_boost: 'Energy',
}

const BAND_LABELS: Record<string, string> = { delta: 'Delta', theta: 'Theta', alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' }
const BAND_HZ: Record<string, string> = { delta: '1–4 Hz', theta: '4–8 Hz', alpha: '8–12 Hz', beta: '14–30 Hz', gamma: '35–45 Hz' }
const BAND_STATE: Record<string, string> = {
  delta: 'Deep sleep & healing', theta: 'Deep meditation & emotional processing',
  alpha: 'Calm wakefulness & stress relief', beta: 'Alert concentration', gamma: 'Peak cognition',
}

// ─── Animation variants ────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -64 : 64, opacity: 0 }),
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({})
  const [showPrescription, setShowPrescription] = useState(false)
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommend> | null>(null)

  const visibleQuestions = QUESTIONS.filter(q => !q.conditional || q.conditional(answers))
  const currentQ = visibleQuestions[step]
  const totalSteps = visibleQuestions.length
  const progress = step / totalSteps * 100

  const selectedVal = answers[currentQ?.id]
  const selectedId = typeof selectedVal === 'number' ? String(selectedVal) : selectedVal

  function handleSelect(optionId: string) {
    const key = currentQ.id
    const value = key === 'sessionDuration' ? Number(optionId) : optionId
    const newAnswers = { ...answers, [key]: value }
    setAnswers(newAnswers)

    setTimeout(() => {
      const newVisible = QUESTIONS.filter(q => !q.conditional || q.conditional(newAnswers))
      if (step < newVisible.length - 1) {
        setDirection(1)
        setStep(s => s + 1)
      } else {
        const rec = recommend(newAnswers as QuestionnaireAnswers)
        setRecommendation(rec)
        setShowPrescription(true)
      }
    }, 260)
  }

  function handleBack() {
    if (step > 0) {
      setDirection(-1)
      setStep(s => s - 1)
    } else {
      router.push('/')
    }
  }

  function beginSession() {
    if (!recommendation) return
    // Persist answers so the studio can save the session to Supabase on completion
    try { sessionStorage.setItem('solive_answers', JSON.stringify(answers)) } catch { /* private mode */ }
    router.push(`/studio?${recommendationToParams(recommendation)}`)
  }

  function retake() {
    setShowPrescription(false)
    setRecommendation(null)
    setStep(0)
    setAnswers({})
  }

  // ─── Prescription Card ─────────────────────────────────────────────────
  if (showPrescription && recommendation) {
    const { frequency, binauralBand, scoreBreakdown } = recommendation

    // Sorted top 5 frequencies for score chart
    const topScores = Object.entries(scoreBreakdown)
      .map(([hz, score]) => ({ hz: Number(hz), score, freq: FREQUENCIES[Number(hz)] }))
      .filter(x => x.freq && x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const maxScore = topScores[0]?.score || 1
    const secondFreq = topScores[1]?.freq

    // Answer summary
    const answerSummary = [
      answers.currentFeeling, answers.mindState, answers.sleepQuality, answers.primaryNeed
    ].filter(Boolean).map(k => ANSWER_LABELS[k as string] || k).join(' · ')

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
        {/* Ambient */}
        <div className="ambient-bg">
          <div className="ambient-orb" style={{ background: frequency.colorHex }} />
          <div className="ambient-orb" />
          <div className="ambient-orb" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Card */}
          <div className="glass rounded-3xl overflow-hidden">

            {/* Header band */}
            <div className="px-7 pt-8 pb-6 text-center relative"
                 style={{ background: `linear-gradient(160deg, ${frequency.colorHex}18, transparent)`,
                          borderBottom: `1px solid ${frequency.colorHex}25` }}>

              {/* Pulse orb */}
              <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `radial-gradient(circle, ${frequency.colorHex}35, transparent 70%)` }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 rounded-full border"
                     style={{ borderColor: `${frequency.colorHex}40` }} />
                <span className="text-2xl font-bold relative z-10" style={{ color: frequency.colorHex }}>
                  {frequency.hz}
                  <span className="text-sm font-normal ml-0.5 opacity-70">Hz</span>
                </span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                 style={{ color: frequency.colorHex }}>
                Your Frequency Today
              </p>
              <h2 className="text-2xl font-bold mb-1 tracking-tight">{frequency.name}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{frequency.tagline}</p>

              {/* Answer summary chips */}
              {answerSummary && (
                <p className="text-xs mt-3 opacity-60 italic" style={{ color: 'var(--text-secondary)' }}>
                  Based on: {answerSummary}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="px-7 py-6 space-y-5">

              {/* Score chart */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Why this frequency — match score
                </p>
                <div className="space-y-2">
                  {topScores.map(({ hz, score, freq }, i) => {
                    const pct = (score / maxScore) * 100
                    const isWinner = i === 0
                    return (
                      <motion.div key={hz}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.07 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs w-14 flex-shrink-0 font-mono"
                              style={{ color: isWinner ? freq?.colorHex : 'var(--text-muted)' }}>
                          {hz} Hz
                        </span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: isWinner ? freq?.colorHex : 'rgba(255,255,255,0.2)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.35 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs w-6 text-right flex-shrink-0"
                              style={{ color: isWinner ? freq?.colorHex : 'var(--text-muted)' }}>
                          {score}
                        </span>
                        {isWinner && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: `${freq?.colorHex}20`, color: freq?.colorHex }}>
                            ✓
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Session details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2.5"
              >
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Your session
                </p>

                {/* Solfeggio */}
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: `${frequency.colorHex}0e`, border: `1px solid ${frequency.colorHex}25` }}>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Solfeggio base</p>
                    <p className="text-sm font-semibold">{frequency.hz} Hz — {frequency.name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                       style={{ background: `${frequency.colorHex}20`, color: frequency.colorHex }}>
                    ♩
                  </div>
                </div>

                {/* Binaural */}
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Binaural layer</p>
                    <p className="text-sm font-semibold">{BAND_LABELS[binauralBand]} · {BAND_HZ[binauralBand]}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{BAND_STATE[binauralBand]}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                       style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                    ≋
                  </div>
                </div>

                {/* Secondary suggestion */}
                {secondFreq && (
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                         style={{ background: secondFreq.colorHex }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Runner-up: <span style={{ color: secondFreq.colorHex }}>{secondFreq.hz} Hz {secondFreq.name}</span>
                      {' '}— subtle undertone layer
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Research note */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Research backing
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {frequency.researchNote}
                </p>
              </motion.div>

              {/* Effects */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.58 }}
                className="flex flex-wrap gap-2"
              >
                {frequency.effects.map(e => (
                  <span key={e} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: `${frequency.colorHex}15`, color: frequency.colorHex,
                                 border: `1px solid ${frequency.colorHex}35` }}>
                    {e}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Footer CTA */}
            <div className="px-7 pb-8 space-y-3">
              <motion.button
                onClick={beginSession}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-semibold text-base tracking-tight transition-shadow"
                style={{ background: frequency.colorHex, color: '#000',
                         boxShadow: `0 8px 30px ${frequency.colorHex}50` }}
              >
                Begin Session →
              </motion.button>
              <motion.button
                onClick={retake}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.72 }}
                className="w-full py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Retake questionnaire
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Questionnaire ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="ambient-bg">
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-5">
        <button onClick={handleBack}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {step === 0 ? 'Home' : 'Back'}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg glass"
                style={{ color: 'var(--text-muted)' }}>
            {step + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-5">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-6">
        <div className="max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Question text */}
              <div className="mb-7">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1.5 leading-tight tracking-tight">
                  {currentQ.text}
                </h2>
                {currentQ.subtext && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {currentQ.subtext}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((option, i) => {
                  const isSelected = selectedId === option.id
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.045, duration: 0.22 }}
                      className="w-full text-left"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-150"
                        style={{
                          background: isSelected
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.04)',
                          border: isSelected
                            ? '1.5px solid rgba(255,255,255,0.22)'
                            : '1.5px solid rgba(255,255,255,0.07)',
                          transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                        }}
                      >
                        <span className="text-xl flex-shrink-0 w-8 text-center">{option.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-snug">{option.label}</p>
                          {option.sublabel && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {option.sublabel}
                            </p>
                          )}
                        </div>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background: 'var(--text-primary)' }}
                            >
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2"
                                      strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
