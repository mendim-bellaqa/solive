'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { recommend, recommendationToParams, QuestionnaireAnswers } from '@/lib/recommendation'

// ─── Question definitions ──────────────────────────────────────────────────
interface Option {
  id: string
  emoji: string
  label: string
  sublabel?: string
}

interface Question {
  id: keyof QuestionnaireAnswers | 'painLocation' | 'painIntensity'
  text: string
  subtext?: string
  options: Option[]
  conditional?: (answers: Partial<QuestionnaireAnswers>) => boolean
}

const QUESTIONS: Question[] = [
  {
    id: 'currentFeeling',
    text: 'Right now, I feel...',
    subtext: 'Choose what resonates most with your current state.',
    options: [
      { id: 'anxious',      emoji: '😰', label: 'Anxious',      sublabel: 'Worried, stressed, or overwhelmed' },
      { id: 'exhausted',    emoji: '😮‍💨', label: 'Exhausted',    sublabel: 'Drained, tired, low energy' },
      { id: 'in_pain',      emoji: '🤕', label: 'In pain',      sublabel: 'Physical discomfort or tension' },
      { id: 'unfocused',    emoji: '🌫️', label: 'Unfocused',    sublabel: 'Scattered, foggy, distracted' },
      { id: 'disconnected', emoji: '🪐', label: 'Disconnected', sublabel: 'Lonely, numb, or detached' },
      { id: 'sad_heavy',    emoji: '💙', label: 'Sad or heavy', sublabel: 'Grief, low mood, or heaviness' },
      { id: 'calm_seeking', emoji: '🔮', label: 'Calm, seeking more', sublabel: 'Already okay, looking to go deeper' },
    ],
  },
  {
    id: 'bodyState',
    text: 'My body feels...',
    subtext: 'Tune into physical sensations right now.',
    options: [
      { id: 'tense_tight',   emoji: '🪨', label: 'Tense or tight',    sublabel: 'Jaw, shoulders, back, neck' },
      { id: 'sore_aching',   emoji: '🔥', label: 'Sore or aching',    sublabel: 'Muscle pain or discomfort' },
      { id: 'restless_wired',emoji: '⚡', label: 'Restless or wired', sublabel: 'Can\'t settle, jittery' },
      { id: 'heavy_drained', emoji: '🪫', label: 'Heavy or drained',  sublabel: 'Low energy, sluggish' },
      { id: 'fine_physically',emoji: '✓', label: 'Physically fine',   sublabel: 'No notable physical discomfort' },
    ],
  },
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
  {
    id: 'sleepQuality',
    text: 'My sleep lately has been...',
    options: [
      { id: 'poor_cant_sleep', emoji: '🌙', label: 'Poor — can\'t fall asleep', sublabel: 'Mind won\'t switch off' },
      { id: 'poor_wake_lots',  emoji: '🔄', label: 'Poor — waking up a lot',   sublabel: 'Restless, fragmented sleep' },
      { id: 'average',         emoji: '😐', label: 'Average',                  sublabel: 'Getting by, not ideal' },
      { id: 'good',            emoji: '😴', label: 'Good',                     sublabel: 'Well-rested' },
    ],
  },
  {
    id: 'primaryNeed',
    text: 'What I most need right now is...',
    subtext: 'This shapes your entire frequency prescription.',
    options: [
      { id: 'rest_calm',         emoji: '🌊', label: 'Rest & calm',         sublabel: 'Slow down, decompress' },
      { id: 'focus_clarity',     emoji: '🎯', label: 'Focus & clarity',     sublabel: 'Sharp thinking, get things done' },
      { id: 'emotional_release', emoji: '🌧️', label: 'Emotional release',   sublabel: 'Let go of what I\'m carrying' },
      { id: 'physical_healing',  emoji: '🌿', label: 'Physical healing',    sublabel: 'Body relief and recovery' },
      { id: 'spiritual_depth',   emoji: '✨', label: 'Spiritual depth',     sublabel: 'Meditation, meaning, connection' },
      { id: 'energy_boost',      emoji: '🔋', label: 'Energy boost',        sublabel: 'Motivation and mental drive' },
    ],
  },
  {
    id: 'sessionDuration',
    text: 'How long do you have?',
    subtext: 'Research shows 15–20 min minimum for measurable effect.',
    options: [
      { id: '15',   emoji: '⏱',  label: '15 minutes', sublabel: 'Quick reset' },
      { id: '30',   emoji: '🕐',  label: '30 minutes', sublabel: 'Recommended for most states' },
      { id: '45',   emoji: '🕰',  label: '45 minutes', sublabel: 'Deep session' },
      { id: '9999', emoji: '∞',  label: 'Open session', sublabel: 'I\'ll stop when ready' },
    ],
  },
]

// Animation variants
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function SessionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({})
  const [showPrescription, setShowPrescription] = useState(false)
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommend> | null>(null)

  const visibleQuestions = QUESTIONS.filter(q =>
    !q.conditional || q.conditional(answers)
  )

  const currentQ = visibleQuestions[step]
  const totalSteps = visibleQuestions.length
  const progress = ((step) / totalSteps) * 100
  const selected = answers[currentQ?.id as keyof QuestionnaireAnswers]

  function handleSelect(optionId: string) {
    const key = currentQ.id as keyof QuestionnaireAnswers
    const newAnswers = { ...answers, [key]: key === 'sessionDuration' ? Number(optionId) : optionId }
    setAnswers(newAnswers)

    // Auto-advance after short delay
    setTimeout(() => {
      if (step < totalSteps - 1) {
        setDirection(1)
        setStep(s => s + 1)
      } else {
        // All done — compute recommendation
        const rec = recommend(newAnswers as QuestionnaireAnswers)
        setRecommendation(rec)
        setShowPrescription(true)
      }
    }, 280)
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
    const params = recommendationToParams(recommendation)
    router.push(`/studio?${params}`)
  }

  // ─── Prescription Card ────────────────────────────────────────────────
  if (showPrescription && recommendation) {
    const { frequency, binauralBand } = recommendation
    const BAND_LABELS: Record<string, string> = {
      delta: 'Delta', theta: 'Theta', alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma'
    }
    const BAND_HZ: Record<string, string> = {
      delta: '1–4 Hz', theta: '4–8 Hz', alpha: '8–12 Hz', beta: '14–30 Hz', gamma: '35–45 Hz'
    }
    const BAND_STATE: Record<string, string> = {
      delta: 'Deep sleep & healing', theta: 'Meditation & emotional processing',
      alpha: 'Calm wakefulness', beta: 'Alert concentration', gamma: 'Peak cognition',
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="ambient-bg">
          <div className="ambient-orb" style={{ ['--accent' as string]: frequency.colorHex }} />
          <div className="ambient-orb" />
          <div className="ambient-orb" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="glass p-8 text-center">
            {/* Frequency orb */}
            <div className="mx-auto mb-6 relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full breathe"
                   style={{ background: `radial-gradient(circle, ${frequency.colorHex}30, transparent 70%)`,
                            boxShadow: `0 0 50px ${frequency.colorHex}40` }} />
              <span className="text-3xl font-bold" style={{ color: frequency.colorHex }}>
                {frequency.hz}
              </span>
              <span className="text-sm absolute -bottom-1" style={{ color: frequency.colorHex, opacity: 0.7 }}>Hz</span>
            </div>

            <p className="text-sm font-medium uppercase tracking-widest mb-2"
               style={{ color: frequency.colorHex }}>
              Your Frequency
            </p>
            <h2 className="text-3xl font-bold mb-1">{frequency.name}</h2>
            <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
              {frequency.tagline}
            </p>

            {/* Details */}
            <div className="space-y-3 mb-6 text-left">
              <div className="glass p-4 rounded-xl">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                  Solfeggio Base
                </p>
                <p className="font-semibold">{frequency.hz} Hz — {frequency.name}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                  Binaural Beat Layer
                </p>
                <p className="font-semibold">{BAND_LABELS[binauralBand]} ({BAND_HZ[binauralBand]})</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{BAND_STATE[binauralBand]}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                  Why This Works
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {frequency.researchNote}
                </p>
              </div>
            </div>

            {/* Effects */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {frequency.effects.map(e => (
                <span key={e} className="text-xs px-3 py-1 rounded-full"
                      style={{ background: `${frequency.colorHex}18`, color: frequency.colorHex,
                               border: `1px solid ${frequency.colorHex}40` }}>
                  {e}
                </span>
              ))}
            </div>

            <button onClick={beginSession} className="btn-primary w-full"
                    style={{ background: frequency.colorHex }}>
              Begin Session
            </button>
            <button onClick={() => { setShowPrescription(false); setStep(0); setAnswers({}) }}
                    className="btn-ghost w-full mt-3 text-sm">
              Retake questionnaire
            </button>
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
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <button onClick={handleBack} className="btn-ghost py-2 px-3 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {step === 0 ? 'Back' : 'Previous'}
        </button>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {step + 1} of {totalSteps}
        </span>
      </div>

      {/* Progress */}
      <div className="relative z-10 px-6">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8">
        <div className="max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
                  {currentQ.text}
                </h2>
                {currentQ.subtext && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {currentQ.subtext}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {currentQ.options.map((option, i) => {
                  const isSelected = selected === (currentQ.id === 'sessionDuration' ? Number(option.id) : option.id)
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.22 }}
                      className={`tap-card w-full text-left ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? { borderColor: 'var(--accent)', background: 'rgba(16,185,129,0.08)' } : {}}
                    >
                      <span className="text-2xl flex-shrink-0">{option.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug">{option.label}</p>
                        {option.sublabel && (
                          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {option.sublabel}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--accent)' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      )}
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
