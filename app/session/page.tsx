'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { recommend, recommendationToParams, QuestionnaireAnswers } from '@/lib/recommendation'
import { FREQUENCIES as FREQ_MAP } from '@/lib/frequencies'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Option { id: string; emoji: string; label: string; sub?: string }
interface Q {
  id: keyof QuestionnaireAnswers
  text: string
  hint?: string
  options: Option[]
  conditional?: (a: Partial<QuestionnaireAnswers>) => boolean
}

// ─── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS: Q[] = [
  {
    id: 'currentFeeling',
    text: 'Right now I feel…',
    hint: 'Pick what resonates most',
    options: [
      { id: 'anxious',      emoji: '😰', label: 'Anxious',       sub: 'Stressed, worried'   },
      { id: 'exhausted',    emoji: '😮‍💨', label: 'Exhausted',     sub: 'Drained, low energy' },
      { id: 'in_pain',      emoji: '🤕', label: 'In pain',       sub: 'Physical discomfort' },
      { id: 'unfocused',    emoji: '🌫️', label: 'Unfocused',     sub: 'Foggy, scattered'    },
      { id: 'disconnected', emoji: '🪐', label: 'Disconnected',  sub: 'Numb, detached'      },
      { id: 'sad_heavy',    emoji: '💙', label: 'Sad',           sub: 'Low mood, grief'     },
      { id: 'calm_seeking', emoji: '🔮', label: 'Seeking',       sub: 'Ready to go deeper'  },
    ],
  },
  {
    id: 'primaryNeed',
    text: 'What I most need…',
    options: [
      { id: 'rest_calm',         emoji: '🌊', label: 'Rest',      sub: 'Slow down, breathe'    },
      { id: 'focus_clarity',     emoji: '🎯', label: 'Focus',     sub: 'Sharp, clear thinking' },
      { id: 'emotional_release', emoji: '🌧️', label: 'Release',   sub: 'Let go, process'       },
      { id: 'physical_healing',  emoji: '🌿', label: 'Healing',   sub: 'Recovery, relief'      },
      { id: 'spiritual_depth',   emoji: '✨', label: 'Spiritual', sub: 'Meditation, meaning'   },
      { id: 'energy_boost',      emoji: '🔋', label: 'Energy',    sub: 'Motivation, drive'     },
    ],
  },
  {
    id: 'bodyState',
    text: 'My body…',
    options: [
      { id: 'tense_tight',     emoji: '🪨', label: 'Tense',    sub: 'Tight, holding'  },
      { id: 'sore_aching',     emoji: '🔥', label: 'Sore',     sub: 'Aching, painful' },
      { id: 'restless_wired',  emoji: '⚡', label: 'Restless', sub: "Can't settle"    },
      { id: 'heavy_drained',   emoji: '🪫', label: 'Heavy',    sub: 'Sluggish, drained'},
      { id: 'fine_physically', emoji: '✓',  label: 'Fine',     sub: 'No complaints'   },
    ],
  },
  {
    id: 'mindState',
    text: 'My mind…',
    options: [
      { id: 'racing_overwhelmed', emoji: '🌀', label: 'Racing',    sub: 'Too many thoughts' },
      { id: 'foggy_slow',         emoji: '🌁', label: 'Foggy',     sub: 'Hard to think'     },
      { id: 'scattered',          emoji: '🍃', label: 'Scattered', sub: 'Jumping around'    },
      { id: 'shut_down',          emoji: '❄️', label: 'Numb',      sub: 'Checked out'       },
      { id: 'fairly_clear',       emoji: '💎', label: 'Clear',     sub: 'Present, focused'  },
    ],
  },
  {
    id: 'sleepQuality',
    text: 'My sleep lately…',
    options: [
      { id: 'poor_cant_sleep', emoji: '🌙', label: "Can't sleep",  sub: 'Mind won\'t switch off' },
      { id: 'poor_wake_lots',  emoji: '🔄', label: 'Fragmented',   sub: 'Waking up often'         },
      { id: 'average',         emoji: '😐', label: 'Average',      sub: 'Getting by'              },
      { id: 'good',            emoji: '😴', label: 'Good',         sub: 'Well-rested'             },
    ],
  },
  {
    id: 'sessionDuration',
    text: 'How long do you have?',
    hint: '15+ min for measurable effect',
    options: [
      { id: '15',   emoji: '⏱', label: '15 min', sub: 'Quick reset'          },
      { id: '30',   emoji: '🕐', label: '30 min', sub: 'Recommended'          },
      { id: '45',   emoji: '🕰', label: '45 min', sub: 'Deep session'         },
      { id: '9999', emoji: '∞',  label: 'Open',   sub: "I'll stop when ready" },
    ],
  },
  {
    id: 'painLocation',
    text: 'Where is the pain?',
    conditional: a => a.currentFeeling === 'in_pain',
    options: [
      { id: 'head',           emoji: '🧠', label: 'Head',          sub: 'Headache, pressure' },
      { id: 'neck_shoulders', emoji: '💪', label: 'Neck / Shoulders', sub: 'Tension, stiff'  },
      { id: 'back',           emoji: '🫀', label: 'Back',           sub: 'Lower or upper'    },
      { id: 'full_body',      emoji: '🌡️', label: 'Full body',      sub: 'Widespread aching' },
      { id: 'chest',          emoji: '💔', label: 'Chest',          sub: 'Tightness'         },
    ],
  },
]

const BAND_LABEL: Record<string, string> = {
  delta: 'Delta · 1–4 Hz',  theta: 'Theta · 4–8 Hz',
  alpha: 'Alpha · 8–12 Hz', beta: 'Beta · 14–30 Hz', gamma: 'Gamma · 35–45 Hz',
}

// ─── Small Lissajous ──────────────────────────────────────────────────────────
function MiniLiss({ hz, size = 52 }: { hz: number; size?: number }) {
  function p(hz: number) {
    if (hz <= 285) return { a: 1, b: 2, loops: 2 }
    if (hz <= 417) return { a: 2, b: 3, loops: 3 }
    if (hz <= 528) return { a: 3, b: 4, loops: 4 }
    if (hz <= 741) return { a: 4, b: 5, loops: 5 }
    return { a: 5, b: 7, loops: 7 }
  }
  const { a, b, loops } = p(hz)
  const h = size / 2, r = h * 0.78, N = 160
  const d = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * Math.PI * 2 * loops
    return `${i === 0 ? 'M' : 'L'}${(h + Math.sin(a * t) * r).toFixed(1)},${(h + Math.sin(b * t) * r).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={d + ' Z'} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
            className="spin-slow" style={{ transformOrigin: `${h}px ${h}px` }} />
      <circle cx={h} cy={h} r="1.8" fill="currentColor" opacity="0.55" className="breathe" />
    </svg>
  )
}

// ─── Option button ────────────────────────────────────────────────────────────
function OptionBtn({ opt, selected, onSelect }: {
  opt: Option; selected: boolean; onSelect: () => void
}) {
  return (
    <motion.button
      onClick={onSelect}
      className={`opt-btn ${selected ? 'selected' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Selected top line */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0, left: '10%', right: '10%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 50%, transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Check badge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            style={{
              position: 'absolute', top: 7, right: 7,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontSize: '1.55rem', marginBottom: 6, transition: 'transform 0.2s', transform: selected ? 'scale(1.12)' : 'scale(1)' }}>
        {opt.emoji}
      </div>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2, color: selected ? 'var(--t1)' : 'var(--t2)' }}>
        {opt.label}
      </p>
      {opt.sub && (
        <p style={{ fontSize: '0.62rem', marginTop: 2, color: 'var(--t3)', lineHeight: 1.3 }}>{opt.sub}</p>
      )}
    </motion.button>
  )
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({
  q, index, isActive, isAnswered, selectedId, onSelect,
}: {
  q: Q; index: number; isActive: boolean; isAnswered: boolean
  selectedId?: string; onSelect: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const answerOpt = q.options.find(o => o.id === selectedId)

  useEffect(() => {
    if (isActive && ref.current) {
      const id = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
      return () => clearTimeout(id)
    }
  }, [isActive])

  return (
    <motion.div
      ref={ref}
      className={`q-card ${isActive ? 'active' : ''} ${isAnswered ? 'answered' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38 }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {/* Step dot */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 800,
            background: isAnswered ? 'var(--t1)' : isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
            color: isAnswered ? 'var(--bg)' : isActive ? 'var(--t1)' : 'var(--t3)',
            border: isActive && !isAnswered ? '1px solid var(--border-mid)' : 'none',
          }}>
            {isAnswered
              ? <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : index + 1
            }
          </div>
          <p style={{
            fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: isActive ? 'var(--t1)' : 'var(--t3)',
          }}>
            {q.text}
          </p>
        </div>

        {/* Answered badge */}
        <AnimatePresence>
          {isAnswered && answerOpt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                fontSize: '0.72rem', fontWeight: 600, color: 'var(--t2)',
              }}
            >
              {answerOpt.emoji}
              <span className="hidden sm:inline">{answerOpt.label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Options — expand when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {q.hint && (
              <p style={{ padding: '0 18px 8px', fontSize: '0.73rem', color: 'var(--t3)' }}>{q.hint}</p>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 8,
              padding: '0 14px 14px',
            }}>
              {q.options.map((opt, oi) => (
                <motion.div
                  key={opt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: oi * 0.028 }}
                >
                  <OptionBtn
                    opt={opt}
                    selected={selectedId === opt.id}
                    onSelect={() => onSelect(opt.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({})
  const [activeIdx, setActiveIdx] = useState(0)
  const [rec, setRec] = useState<ReturnType<typeof recommend> | null>(null)
  const [showRec, setShowRec] = useState(false)
  const prescRef = useRef<HTMLDivElement>(null)

  const visible      = QUESTIONS.filter(q => !q.conditional || q.conditional(answers))
  const answeredCount = visible.filter(q => answers[q.id] !== undefined).length
  const allDone      = answeredCount === visible.length
  const progress     = visible.length ? (answeredCount / visible.length) * 100 : 0

  const handleSelect = useCallback((qIdx: number, optId: string) => {
    const q = visible[qIdx]
    if (!q) return
    const val = q.id === 'sessionDuration' ? Number(optId) : optId
    const next = { ...answers, [q.id]: val }
    setAnswers(next)

    setTimeout(() => {
      const nextVisible = QUESTIONS.filter(qq => !qq.conditional || qq.conditional(next))
      const nextUnanswered = nextVisible.findIndex((qq, i) => i > qIdx && next[qq.id] === undefined)
      if (nextUnanswered !== -1) {
        setActiveIdx(nextUnanswered)
      } else if (nextVisible.every(qq => next[qq.id] !== undefined)) {
        const result = recommend(next as QuestionnaireAnswers)
        setRec(result)
        setTimeout(() => {
          setShowRec(true)
          setTimeout(() => prescRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
        }, 200)
      }
    }, 240)
  }, [answers, visible])

  function beginSession() {
    if (!rec) return
    try { sessionStorage.setItem('solive_answers', JSON.stringify(answers)) } catch { /* private */ }
    router.push(`/studio?${recommendationToParams(rec)}`)
  }

  function retake() {
    setShowRec(false); setRec(null); setAnswers({}); setActiveIdx(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const recFreq = rec ? FREQ_MAP[rec.frequency.hz] ?? rec.frequency : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* Ambient */}
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(7,7,15,0.80)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', height: 54 }}>
          {/* Back */}
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--t3)', fontSize: '0.82rem', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 8px', borderRadius: 8, transition: 'color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Solive
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {visible.map((q, i) => (
                <motion.div
                  key={q.id}
                  style={{ height: 5, borderRadius: 999 }}
                  animate={{
                    width: i === activeIdx ? 18 : 5,
                    background: answers[q.id] !== undefined
                      ? 'var(--t1)'
                      : i === activeIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                  }}
                  transition={{ duration: 0.28 }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--t3)', fontFamily: 'monospace', flexShrink: 0 }}>
              {answeredCount}/{visible.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }}>
          <motion.div
            style={{ height: '100%', background: 'var(--t2)', boxShadow: '0 0 6px rgba(255,255,255,0.3)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 140px', position: 'relative', zIndex: 10 }}>
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48 }}
          style={{ marginBottom: 28, textAlign: 'center' }}
        >
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.035em', marginBottom: 6 }}>
            Find your frequency
          </h1>
          <p style={{ color: 'var(--t3)', fontSize: '0.82rem' }}>
            Answer {visible.length} questions · prescription builds instantly
          </p>
        </motion.div>

        {/* Question cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              isActive={activeIdx === i && !showRec}
              isAnswered={answers[q.id] !== undefined}
              selectedId={
                typeof answers[q.id] === 'number'
                  ? String(answers[q.id])
                  : answers[q.id] as string | undefined
              }
              onSelect={id => handleSelect(i, id)}
            />
          ))}
        </div>

        {/* Manual analyze button (after all answered but auto didn't trigger) */}
        <AnimatePresence>
          {allDone && !showRec && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 20, textAlign: 'center' }}
            >
              <button
                className="btn-primary"
                onClick={() => {
                  const result = recommend(answers as QuestionnaireAnswers)
                  setRec(result); setShowRec(true)
                  setTimeout(() => prescRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                }}
                style={{ padding: '13px 36px', fontSize: '0.9rem' }}
              >
                Show my frequency →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prescription ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showRec && rec && recFreq && (
            <motion.div
              ref={prescRef}
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.52, ease: [0.4, 0, 0.2, 1] }}
              style={{ marginTop: 28 }}
            >
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--t4)', fontWeight: 700 }}>
                  YOUR PRESCRIPTION
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div className="glass-premium grain">
                {/* Frequency header */}
                <div style={{
                  padding: '32px 24px 24px',
                  textAlign: 'center',
                  borderBottom: '1px solid var(--border)',
                  position: 'relative', zIndex: 2,
                }}>
                  {/* Animated orb */}
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                    {[1.5, 1.2, 1].map((s, i) => (
                      <motion.div key={s}
                        style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          border: `1px solid rgba(255,255,255,${['0.06', '0.10', '0.18'][i]})`,
                        }}
                        animate={{ scale: [s, s * 1.07, s], opacity: [0.7, 1, 0.7] }}
                        transition={{ repeat: Infinity, duration: 3 + i * 0.6, delay: i * 0.3 }}
                      />
                    ))}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--t2)',
                    }}>
                      <MiniLiss hz={rec.frequency.hz} size={50} />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--t4)', marginBottom: 6 }}>
                    YOUR FREQUENCY
                  </p>
                  <p style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--t1)', marginBottom: 2 }}>
                    {rec.frequency.hz}
                    <span style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--t3)', marginLeft: 4 }}>Hz</span>
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{rec.frequency.name}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--t2)' }}>{rec.frequency.tagline}</p>
                </div>

                {/* Details */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 2 }}>

                  {/* Match bars */}
                  <div>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--t4)', marginBottom: 12 }}>
                      MATCH SCORE
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(rec.scoreBreakdown)
                        .map(([hz, score]) => ({ hz: Number(hz), score, f: FREQ_MAP[Number(hz)] }))
                        .filter(x => x.f && x.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5)
                        .map(({ hz, score, f }, i) => {
                          const maxScore = Math.max(...Object.values(rec.scoreBreakdown))
                          const pct = (score / maxScore) * 100
                          return (
                            <motion.div key={hz}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + i * 0.05 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                            >
                              <span style={{ width: 52, fontSize: '0.7rem', fontFamily: 'monospace', color: i === 0 ? 'var(--t1)' : 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
                                {hz} Hz
                              </span>
                              <div style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <motion.div
                                  style={{ height: '100%', borderRadius: 999, background: i === 0 ? 'var(--t1)' : 'rgba(255,255,255,0.22)' }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
                                />
                              </div>
                              <span style={{ width: 18, fontSize: '0.68rem', color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{score}</span>
                            </motion.div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Session params */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Solfeggio base', value: `${rec.frequency.hz} Hz — ${rec.frequency.name}` },
                      { label: 'Binaural layer', value: BAND_LABEL[rec.binauralBand] ?? rec.binauralBand },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border)',
                      }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>{label}</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--t1)' }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Effects chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {rec.frequency.effects.map(e => (
                      <span key={e} style={{
                        fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        color: 'var(--t2)',
                      }}>
                        {e}
                      </span>
                    ))}
                  </div>

                  {/* Research */}
                  <p style={{ fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--t3)', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                    {rec.frequency.researchNote}
                  </p>
                </div>

                {/* Buttons */}
                <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 2 }}>
                  <button
                    onClick={beginSession}
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '0.9rem', justifyContent: 'center' }}
                  >
                    Begin {rec.frequency.hz} Hz Session →
                  </button>
                  <button
                    onClick={retake}
                    style={{ width: '100%', padding: '10px', fontSize: '0.82rem', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Retake answers
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky bottom CTA */}
      <AnimatePresence>
        {showRec && rec && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
              padding: '12px 16px 20px',
              background: 'linear-gradient(0deg, rgba(7,7,15,0.98) 60%, transparent)',
            }}
          >
            <div style={{ maxWidth: 580, margin: '0 auto' }}>
              <button
                onClick={beginSession}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '0.9rem', justifyContent: 'center' }}
              >
                Begin {rec.frequency.hz} Hz Session →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
