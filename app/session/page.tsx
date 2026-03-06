'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { recommend, recommendationToParams, QuestionnaireAnswers } from '@/lib/recommendation'
import { FREQUENCIES } from '@/lib/frequencies'

// ─── Question definitions ────────────────────────────────────────────────────
interface Option {
  id: string
  emoji: string
  label: string
  sublabel?: string
  color?: string
}

interface Question {
  id: keyof QuestionnaireAnswers
  text: string
  subtext?: string
  options: Option[]
  conditional?: (answers: Partial<QuestionnaireAnswers>) => boolean
  layout?: 'grid' | 'list'
}

const QUESTIONS: Question[] = [
  {
    id: 'currentFeeling',
    text: 'Right now, I feel…',
    subtext: 'Choose what resonates most with your current state.',
    layout: 'grid',
    options: [
      { id:'anxious',      emoji:'😰', label:'Anxious',            sublabel:'Worried, stressed', color:'#e05050' },
      { id:'exhausted',    emoji:'😮‍💨', label:'Exhausted',          sublabel:'Drained, low energy', color:'#e8a020' },
      { id:'in_pain',      emoji:'🤕', label:'In pain',            sublabel:'Physical discomfort', color:'#e8a020' },
      { id:'unfocused',    emoji:'🌫️', label:'Unfocused',          sublabel:'Scattered, foggy', color:'#7c6ff7' },
      { id:'disconnected', emoji:'🪐', label:'Disconnected',       sublabel:'Numb, detached', color:'#4a90e8' },
      { id:'sad_heavy',    emoji:'💙', label:'Sad or heavy',       sublabel:'Grief, low mood', color:'#4a90e8' },
      { id:'calm_seeking', emoji:'🔮', label:'Seeking more',       sublabel:'Ready to go deeper', color:'#00c896' },
    ],
  },
  {
    id: 'bodyState',
    text: 'My body feels…',
    subtext: 'Tune into physical sensations right now.',
    layout: 'grid',
    options: [
      { id:'tense_tight',    emoji:'🪨', label:'Tense',         sublabel:'Tight, holding', color:'#e05050' },
      { id:'sore_aching',    emoji:'🔥', label:'Sore',          sublabel:'Aching, painful', color:'#e8a020' },
      { id:'restless_wired', emoji:'⚡', label:'Restless',      sublabel:"Can't settle", color:'#7c6ff7' },
      { id:'heavy_drained',  emoji:'🪫', label:'Drained',       sublabel:'Heavy, sluggish', color:'#4a90e8' },
      { id:'fine_physically',emoji:'✓',  label:'Fine',          sublabel:'No discomfort', color:'#00c896' },
    ],
  },
  {
    id: 'mindState',
    text: 'My mind is…',
    subtext: 'Observe your mental state without judgment.',
    layout: 'grid',
    options: [
      { id:'racing_overwhelmed', emoji:'🌀', label:'Racing',          sublabel:'Too many thoughts', color:'#e05050' },
      { id:'foggy_slow',         emoji:'🌁', label:'Foggy',           sublabel:'Hard to think', color:'#e8a020' },
      { id:'scattered',          emoji:'🍃', label:'Scattered',       sublabel:'Jumping around', color:'#7c6ff7' },
      { id:'shut_down',          emoji:'❄️', label:'Shut down',       sublabel:'Numb, checked out', color:'#4a90e8' },
      { id:'fairly_clear',       emoji:'💎', label:'Clear',           sublabel:'Present, focused', color:'#00c896' },
    ],
  },
  {
    id: 'sleepQuality',
    text: 'My sleep lately has been…',
    layout: 'grid',
    options: [
      { id:'poor_cant_sleep', emoji:'🌙', label:"Can't sleep",        sublabel:"Mind won't switch off", color:'#7c6ff7' },
      { id:'poor_wake_lots',  emoji:'🔄', label:'Fragmented',         sublabel:'Waking up often', color:'#e8a020' },
      { id:'average',         emoji:'😐', label:'Average',            sublabel:'Getting by', color:'#4a90e8' },
      { id:'good',            emoji:'😴', label:'Restful',            sublabel:'Well-rested', color:'#00c896' },
    ],
  },
  {
    id: 'primaryNeed',
    text: 'What I most need right now is…',
    subtext: 'This shapes your entire frequency prescription.',
    layout: 'grid',
    options: [
      { id:'rest_calm',         emoji:'🌊', label:'Rest & calm',       sublabel:'Slow down, breathe', color:'#4a90e8' },
      { id:'focus_clarity',     emoji:'🎯', label:'Focus',             sublabel:'Sharp, clear thinking', color:'#7c6ff7' },
      { id:'emotional_release', emoji:'🌧️', label:'Release',           sublabel:'Let go, process', color:'#e05050' },
      { id:'physical_healing',  emoji:'🌿', label:'Heal body',         sublabel:'Recovery, relief', color:'#00c896' },
      { id:'spiritual_depth',   emoji:'✨', label:'Spiritual',         sublabel:'Meditation, meaning', color:'#b06ef5' },
      { id:'energy_boost',      emoji:'🔋', label:'Energy',            sublabel:'Motivation, drive', color:'#e8a020' },
    ],
  },
  {
    id: 'painLocation',
    text: 'Where is the pain located?',
    subtext: 'Be as specific as feels accurate.',
    layout: 'grid',
    conditional: (a) => a.currentFeeling === 'in_pain',
    options: [
      { id:'head',          emoji:'🧠', label:'Head',         sublabel:'Headache, pressure', color:'#e05050' },
      { id:'neck_shoulders',emoji:'💪', label:'Neck/Shoulders',sublabel:'Tension, stiff', color:'#e8a020' },
      { id:'back',          emoji:'🫀', label:'Back',          sublabel:'Lower or upper', color:'#7c6ff7' },
      { id:'full_body',     emoji:'🌡️', label:'Full body',     sublabel:'Widespread aching', color:'#4a90e8' },
      { id:'chest',         emoji:'💔', label:'Chest',         sublabel:'Tightness, pressure', color:'#e05050' },
    ],
  },
  {
    id: 'painIntensity',
    text: 'How intense is the pain?',
    layout: 'list',
    conditional: (a) => a.currentFeeling === 'in_pain',
    options: [
      { id:'mild',     emoji:'🟡', label:'Mild',     sublabel:'Noticeable but manageable', color:'#e8a020' },
      { id:'moderate', emoji:'🟠', label:'Moderate', sublabel:'Distracting, hard to ignore', color:'#e05050' },
      { id:'severe',   emoji:'🔴', label:'Severe',   sublabel:'Significantly affecting me', color:'#e05050' },
    ],
  },
  {
    id: 'sessionDuration',
    text: 'How long do you have?',
    subtext: 'Research shows 15–20 min minimum for measurable effect.',
    layout: 'grid',
    options: [
      { id:'15',   emoji:'⏱',  label:'15 min',    sublabel:'Quick reset', color:'#4a90e8' },
      { id:'30',   emoji:'🕐',  label:'30 min',    sublabel:'Recommended', color:'#00c896' },
      { id:'45',   emoji:'🕰',  label:'45 min',    sublabel:'Deep session', color:'#b06ef5' },
      { id:'9999', emoji:'∞',  label:'Open',      sublabel:"I'll stop when ready", color:'#7c6ff7' },
    ],
  },
]

const ANSWER_LABELS: Record<string, string> = {
  anxious:'Anxious', exhausted:'Exhausted', in_pain:'In pain',
  unfocused:'Unfocused', disconnected:'Disconnected', sad_heavy:'Sad/heavy', calm_seeking:'Calm, seeking more',
  tense_tight:'Tense/tight', sore_aching:'Sore/aching', restless_wired:'Restless', heavy_drained:'Drained', fine_physically:'Physically fine',
  racing_overwhelmed:'Racing mind', foggy_slow:'Foggy', scattered:'Scattered', shut_down:'Shut down', fairly_clear:'Fairly clear',
  poor_cant_sleep:'Trouble sleeping', poor_wake_lots:'Restless sleep', average:'Average sleep', good:'Good sleep',
  rest_calm:'Rest & calm', focus_clarity:'Focus', emotional_release:'Emotional release', physical_healing:'Physical healing',
  spiritual_depth:'Spiritual depth', energy_boost:'Energy',
}

const BAND_LABELS: Record<string, string> = { delta:'Delta', theta:'Theta', alpha:'Alpha', beta:'Beta', gamma:'Gamma' }
const BAND_HZ:    Record<string, string> = { delta:'1–4 Hz', theta:'4–8 Hz', alpha:'8–12 Hz', beta:'14–30 Hz', gamma:'35–45 Hz' }
const BAND_STATE: Record<string, string> = {
  delta:'Deep sleep & healing', theta:'Deep meditation & emotional processing',
  alpha:'Calm wakefulness & stress relief', beta:'Alert concentration', gamma:'Peak cognition',
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.97 }),
}

// ─── Mini Lissajous ─────────────────────────────────────────────────────────
function MiniLissajous({ hz, color, size = 40 }: { hz: number; color: string; size?: number }) {
  const getParams = (hz: number) => {
    if (hz <= 285) return { a:1, b:2, loops:2 }
    if (hz <= 417) return { a:2, b:3, loops:3 }
    if (hz <= 528) return { a:3, b:4, loops:4 }
    if (hz <= 741) return { a:4, b:5, loops:5 }
    return { a:5, b:7, loops:7 }
  }
  const { a, b, loops } = getParams(hz)
  const N = 120; const half = size / 2; const r = half * 0.78
  const pts = Array.from({ length:N+1 }, (_,i) => {
    const t = (i/N)*Math.PI*2*loops
    return `${i===0?'M':'L'}${(half+Math.sin(a*t)*r).toFixed(1)},${(half+Math.sin(b*t)*r).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pts+' Z'} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.75"
            className="spin-slow" style={{ transformOrigin:`${half}px ${half}px` }} />
      <circle cx={half} cy={half} r={2} fill={color} opacity="0.5" className="breathe" />
    </svg>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({})
  const [showPrescription, setShowPrescription] = useState(false)
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommend> | null>(null)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleQuestions = QUESTIONS.filter(q => !q.conditional || q.conditional(answers))
  const currentQ  = visibleQuestions[step]
  const totalSteps = visibleQuestions.length
  const progress  = ((step) / totalSteps) * 100
  const selectedVal = answers[currentQ?.id]
  const selectedId  = typeof selectedVal === 'number' ? String(selectedVal) : selectedVal

  // Get the hover/selected color for reactive background
  const activeColor = hoveredOption
    ? currentQ?.options.find(o => o.id === hoveredOption)?.color
    : selectedId
      ? currentQ?.options.find(o => o.id === selectedId)?.color
      : null

  function handleSelect(optionId: string) {
    const key = currentQ.id
    const value = key === 'sessionDuration' ? Number(optionId) : optionId
    const newAnswers = { ...answers, [key]: value }
    setAnswers(newAnswers)

    setTimeout(() => {
      const newVisible = QUESTIONS.filter(q => !q.conditional || q.conditional(newAnswers))
      if (step < newVisible.length - 1) {
        setDirection(1); setStep(s => s + 1)
      } else {
        const rec = recommend(newAnswers as QuestionnaireAnswers)
        setRecommendation(rec)
        setShowPrescription(true)
      }
    }, 280)
  }

  function handleBack() {
    if (step > 0) {
      setDirection(-1); setStep(s => s - 1)
    } else {
      router.push('/')
    }
  }

  function beginSession() {
    if (!recommendation) return
    try { sessionStorage.setItem('solive_answers', JSON.stringify(answers)) } catch { /* private */ }
    router.push(`/studio?${recommendationToParams(recommendation)}`)
  }

  function retake() {
    setShowPrescription(false); setRecommendation(null); setStep(0); setAnswers({})
  }

  // ─── Prescription Card ──────────────────────────────────────────────────
  if (showPrescription && recommendation) {
    const { frequency, binauralBand, scoreBreakdown } = recommendation
    const topScores = Object.entries(scoreBreakdown)
      .map(([hz, score]) => ({ hz:Number(hz), score, freq:FREQUENCIES[Number(hz)] }))
      .filter(x => x.freq && x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0,5)
    const maxScore   = topScores[0]?.score || 1
    const secondFreq = topScores[1]?.freq
    const answerSummary = [answers.currentFeeling, answers.mindState, answers.sleepQuality, answers.primaryNeed]
      .filter(Boolean).map(k => ANSWER_LABELS[k as string] || k).join(' · ')

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
        <div className="ambient-bg">
          <div className="ambient-orb" style={{ background:frequency.colorHex }} />
          <div className="ambient-orb" /><div className="ambient-orb" />
        </div>

        <motion.div
          initial={{ opacity:0, y:40, scale:0.94 }}
          animate={{ opacity:1, y:0, scale:1 }}
          transition={{ duration:0.55, ease:[0.4,0,0.2,1] }}
          className="relative z-10 w-full max-w-md">

          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="shimmer-overlay" />
            {/* Header */}
            <div className="px-7 pt-8 pb-6 text-center relative z-10"
                 style={{ background:`linear-gradient(160deg, ${frequency.colorHex}16, transparent)`,
                          borderBottom:`1px solid ${frequency.colorHex}22` }}>
              {/* Animated orb */}
              <div className="relative w-24 h-24 mx-auto mb-5">
                {[1.4, 1.2, 1].map((s, i) => (
                  <motion.div key={s}
                    className="absolute inset-0 rounded-full"
                    style={{ border:`1px solid ${frequency.colorHex}${i === 0 ? '18' : i === 1 ? '28' : '55'}` }}
                    animate={{ scale:[s, s*1.06, s], opacity:[0.6, 0.9, 0.6] }}
                    transition={{ repeat:Infinity, duration:3+i*0.5, ease:'easeInOut', delay:i*0.3 }} />
                ))}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <MiniLissajous hz={frequency.hz} color={frequency.colorHex} size={60} />
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                 style={{ color:frequency.colorHex }}>Your Frequency Today</p>
              <h2 className="text-3xl font-black mb-0.5 tabular-nums" style={{ color:frequency.colorHex }}>
                {frequency.hz}<span className="text-lg font-normal opacity-60 ml-0.5">Hz</span>
              </h2>
              <p className="text-xl font-bold mb-1 tracking-tight">{frequency.name}</p>
              <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{frequency.tagline}</p>
              {answerSummary && (
                <p className="text-xs mt-3 opacity-55 italic" style={{ color:'var(--text-secondary)' }}>
                  Based on: {answerSummary}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="px-7 py-6 space-y-5 relative z-10">
              {/* Score chart */}
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--text-muted)' }}>
                  Why this frequency — match score
                </p>
                <div className="space-y-2">
                  {topScores.map(({ hz, score, freq:f }, i) => {
                    const pct = (score/maxScore)*100; const isWinner = i===0
                    return (
                      <motion.div key={hz}
                        initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                        transition={{ delay:0.25+i*0.07 }}
                        className="flex items-center gap-3">
                        <span className="text-xs w-14 flex-shrink-0 font-mono"
                              style={{ color: isWinner ? f?.colorHex : 'var(--text-muted)' }}>
                          {hz} Hz
                        </span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                          <motion.div className="h-full rounded-full"
                            style={{ background: isWinner ? f?.colorHex : 'rgba(255,255,255,0.18)' }}
                            initial={{ width:0 }}
                            animate={{ width:`${pct}%` }}
                            transition={{ delay:0.35+i*0.07, duration:0.5, ease:'easeOut' }} />
                        </div>
                        <span className="text-xs w-6 text-right flex-shrink-0"
                              style={{ color: isWinner ? f?.colorHex : 'var(--text-muted)' }}>{score}</span>
                        {isWinner && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background:`${f?.colorHex}20`, color:f?.colorHex }}>✓</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Session details */}
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="space-y-2.5">
                <p className="text-xs uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>Your session</p>
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background:`${frequency.colorHex}0e`, border:`1px solid ${frequency.colorHex}22` }}>
                  <div>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>Solfeggio base</p>
                    <p className="text-sm font-semibold">{frequency.hz} Hz — {frequency.name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                       style={{ background:`${frequency.colorHex}18`, color:frequency.colorHex }}>♩</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl"
                     style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>Binaural layer</p>
                    <p className="text-sm font-semibold">{BAND_LABELS[binauralBand]} · {BAND_HZ[binauralBand]}</p>
                    <p className="text-xs mt-0.5" style={{ color:'var(--text-secondary)' }}>{BAND_STATE[binauralBand]}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                       style={{ background:'rgba(255,255,255,0.06)', color:'var(--text-secondary)' }}>≋</div>
                </div>
                {secondFreq && (
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                       style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:secondFreq.colorHex }} />
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                      Runner-up: <span style={{ color:secondFreq.colorHex }}>{secondFreq.hz} Hz {secondFreq.name}</span>
                      {' '}— subtle undertone layer
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Research */}
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
                className="p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color:'var(--text-muted)' }}>Research backing</p>
                <p className="text-xs leading-relaxed" style={{ color:'var(--text-secondary)' }}>{frequency.researchNote}</p>
              </motion.div>

              {/* Effect chips */}
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.58 }} className="flex flex-wrap gap-2">
                {frequency.effects.map(e => (
                  <span key={e} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background:`${frequency.colorHex}14`, color:frequency.colorHex, border:`1px solid ${frequency.colorHex}30` }}>
                    {e}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-7 pb-8 space-y-3 relative z-10">
              <motion.button onClick={beginSession}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.65 }}
                whileHover={{ scale:1.015 }} whileTap={{ scale:0.98 }}
                className="w-full py-4 rounded-2xl font-semibold text-base tracking-tight"
                style={{ background:frequency.colorHex, color:'#000', boxShadow:`0 8px 30px ${frequency.colorHex}45` }}>
                Begin Session →
              </motion.button>
              <motion.button onClick={retake}
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.72 }}
                className="w-full py-2.5 rounded-xl text-sm" style={{ color:'var(--text-muted)' }}>
                Retake questionnaire
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Questionnaire ───────────────────────────────────────────────────────
  const isGrid = currentQ?.layout === 'grid'
  const cols   = currentQ?.options.length === 4 ? 'grid-cols-2' : currentQ?.options.length >= 6 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Reactive ambient background */}
      <motion.div className="ambient-bg" animate={{ opacity: 1 }}>
        <motion.div
          className="ambient-orb"
          animate={{ background: activeColor || '#00c896' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
        <div className="ambient-orb" />
        <div className="ambient-orb" />
      </motion.div>

      {/* Reactive radial glow */}
      <AnimatePresence>
        {activeColor && (
          <motion.div
            key={activeColor}
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.5 }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ background:`radial-gradient(ellipse 70% 60% at 50% 60%, ${activeColor}0c, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <button onClick={handleBack}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all"
                style={{ color:'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {step === 0 ? 'Home' : 'Back'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg glass"
                style={{ color:'var(--text-muted)' }}>
            {step + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-5">
        <div className="progress-bar">
          <motion.div
            className="progress-fill h-full rounded-full"
            animate={{ width:`${progress}%`, background: activeColor || 'var(--accent)' }}
            transition={{ width:{ duration:0.4, ease:'easeOut' }, background:{ duration:0.6 } }}
            style={{ boxShadow:`0 0 12px ${activeColor || 'var(--accent)'}70` }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-5">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration:0.3, ease:[0.4,0,0.2,1] }}>

              {/* Question text */}
              <div className="mb-7">
                <motion.h2
                  className="text-2xl sm:text-3xl font-bold mb-2 leading-tight tracking-tight"
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.05 }}>
                  {currentQ.text}
                </motion.h2>
                {currentQ.subtext && (
                  <motion.p className="text-sm leading-relaxed" style={{ color:'var(--text-secondary)' }}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}>
                    {currentQ.subtext}
                  </motion.p>
                )}
              </div>

              {/* Options */}
              {isGrid ? (
                <div className={`grid ${cols} gap-3`}>
                  {currentQ.options.map((option, i) => {
                    const isSelected = selectedId === option.id
                    const isHovered  = hoveredOption === option.id
                    const c = option.color || '#00c896'

                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        onMouseEnter={() => setHoveredOption(option.id)}
                        onMouseLeave={() => setHoveredOption(null)}
                        initial={{ opacity:0, y:16, scale:0.96 }}
                        animate={{ opacity:1, y:0, scale:1 }}
                        transition={{ delay: i * 0.04, duration:0.25 }}
                        whileTap={{ scale:0.95 }}
                        className="option-card text-center py-5 px-3 relative"
                        style={{
                          background: isSelected ? `${c}18` : isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? `1.5px solid ${c}60` : isHovered ? `1.5px solid rgba(255,255,255,0.15)` : `1.5px solid rgba(255,255,255,0.07)`,
                          boxShadow: isSelected ? `0 0 24px ${c}25, 0 8px 30px rgba(0,0,0,0.4)` : isHovered ? '0 8px 30px rgba(0,0,0,0.35)' : 'none',
                          WebkitTapHighlightColor: 'transparent',
                        } as React.CSSProperties}
                      >
                        {/* Top shimmer */}
                        {(isSelected || isHovered) && (
                          <motion.div
                            initial={{ opacity:0 }} animate={{ opacity:1 }}
                            className="absolute top-0 left-0 right-0 h-px"
                            style={{ background:`linear-gradient(90deg, transparent, ${c}80, transparent)` }} />
                        )}

                        {/* Selected indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale:0, opacity:0 }}
                              animate={{ scale:1, opacity:1 }}
                              exit={{ scale:0, opacity:0 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background:c }}>
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Big emoji */}
                        <motion.div
                          className="text-3xl mb-2"
                          animate={isSelected ? { scale:[1, 1.12, 1] } : {}}
                          transition={{ duration:0.3 }}>
                          {option.emoji}
                        </motion.div>

                        <p className="font-semibold text-sm leading-tight mb-0.5"
                           style={{ color: isSelected ? c : 'var(--text-primary)' }}>
                          {option.label}
                        </p>
                        {option.sublabel && (
                          <p className="text-xs leading-snug" style={{ color:'var(--text-muted)' }}>
                            {option.sublabel}
                          </p>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                /* List layout for pain intensity */
                <div className="space-y-2.5">
                  {currentQ.options.map((option, i) => {
                    const isSelected = selectedId === option.id
                    const c = option.color || '#00c896'
                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        initial={{ opacity:0, x:16 }}
                        animate={{ opacity:1, x:0 }}
                        transition={{ delay:i*0.045, duration:0.22 }}
                        className="w-full text-left"
                        style={{ WebkitTapHighlightColor:'transparent' }}>
                        <div className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all"
                             style={{
                               background: isSelected ? `${c}12` : 'rgba(255,255,255,0.04)',
                               border: isSelected ? `1.5px solid ${c}55` : '1.5px solid rgba(255,255,255,0.07)',
                               transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                             }}>
                          <span className="text-2xl flex-shrink-0 w-10 text-center">{option.emoji}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{option.label}</p>
                            {option.sublabel && <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{option.sublabel}</p>}
                          </div>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background:c }}>
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
