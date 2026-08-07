'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion, useInView } from 'framer-motion'

const Biofield = dynamic(() => import('@/components/Biofield'), { ssr: false })

interface State {
  id: string
  label: string
  when: string
  hz: number
  band: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma'
  beat: number
  color: string
  headline: string
  body: string
  /** The practical instruction — the part most sites leave out. */
  how: string
}

const STATES: State[] = [
  {
    id: 'sleep', label: 'Sleep', when: 'Lights out', hz: 174, band: 'delta', beat: 2,
    color: '#6b8cff',
    headline: 'Descending, not switching off',
    body: 'Sleep onset is a slide through theta into delta rather than a switch. A slow steady beat gives that slide something consistent to follow, and the deep delta stage it leads to is when the fluid spaces between brain cells widen and the day\'s metabolic debris gets flushed out.',
    how: 'Start it before you feel tired, at a volume you can only just hear. The goal is to stop noticing it.',
  },
  {
    id: 'focus', label: 'Focus', when: 'Deep work', hz: 741, band: 'beta', beat: 18,
    color: '#4a90e8',
    headline: 'A floor under the attention',
    body: 'Sustained attention runs on fast, low-amplitude beta activity. A constant tone will not manufacture concentration, but it does remove the thing that most reliably breaks it: an environment that keeps changing. Unvarying sound is the cheapest way to make a room acoustically boring.',
    how: 'Begin the tone a few minutes before the work, not during. Switching it on mid-task is itself an interruption.',
  },
  {
    id: 'creative', label: 'Creativity', when: 'Stuck on something', hz: 417, band: 'theta', beat: 6,
    color: '#8b5cf6',
    headline: 'The doorway state',
    body: 'The theta-dominant minute between waking and sleeping is measurably productive. In a 2021 study, participants who dipped briefly into that first sleep stage and were woken again solved a hidden-rule maths problem roughly three times as often as those kept awake — the trick Dalí chased by dozing with a key over a plate.',
    how: 'Twenty minutes, lying back, mid-afternoon. Set an alarm — the value is in the threshold, not in falling properly asleep.',
  },
  {
    id: 'calm', label: 'Calm', when: 'After a hard day', hz: 432, band: 'alpha', beat: 9,
    color: '#5CE8DC',
    headline: 'Awake, and not braced',
    body: 'Alpha is the rhythm that floods the cortex the instant you close your eyes and vanishes when you open them. It is the signature of a brain that is on but not being asked for anything — the state most people mean when they say they want to relax without going to sleep.',
    how: 'Close your eyes. Alpha is largely suppressed by open-eyed visual input, so this one genuinely depends on it.',
  },
  {
    id: 'balance', label: 'Emotional balance', when: 'Wound up', hz: 396, band: 'alpha', beat: 9,
    color: '#e0607a',
    headline: 'Borrow the tempo for your breath',
    body: 'Breathing near six breaths a minute puts the breath in step with the slow rhythm of blood pressure control, and heart rate variability climbs to its maximum for that person. A steady tone is a metronome you do not have to watch — and the vagal shift that follows is the physiological part of calming down.',
    how: 'Ride the tone: in for five seconds, out for five. Ten cycles is usually enough to feel the change.',
  },
  {
    id: 'recovery', label: 'Recovery', when: 'Rest days', hz: 285, band: 'delta', beat: 2,
    color: '#10b981',
    headline: 'Long, slow, and in the background',
    body: 'Recovery is not an event you can hurry. This pairing exists to be left running — a low carrier and the slowest beat, at a level that sits underneath whatever else you are doing rather than competing with it.',
    how: 'An hour or more, quietly. This is the one session that is not asking for your attention.',
  },
]

export default function StateSelector() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const s = STATES[idx]
  const ref = useRef<HTMLDivElement>(null)
  const near = useInView(ref, { once: true, margin: '400px' })

  return (
    <div ref={ref} style={{ ['--tone' as string]: s.color }}>
      <div className="mb-9">
        <span className="eyebrow">Beyond healing</span>
        <h2 className="h-section" style={{ margin: '14px 0 16px' }}>
          Six states worth<br />
          <span className="spectral">engineering for.</span>
        </h2>
        <p className="lede">
          Sleep, attention, insight, composure — each has a rhythm the brain already
          runs at, and a way of using sound that respects it. Pick a state to see the
          pairing and, more usefully, how to actually run it.
        </p>
      </div>

      {/* State chips */}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Target state">
        {STATES.map((st, i) => {
          const on = i === idx
          return (
            <button
              key={st.id}
              onClick={() => setIdx(i)}
              aria-pressed={on}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 999,
                border: `1px solid ${on ? st.color : 'var(--border)'}`,
                background: on ? `${st.color}1f` : 'rgba(255,255,255,0.03)',
                color: on ? '#fff' : 'var(--t3)',
                fontSize: '0.82rem', fontWeight: 700,
                transition: 'all 0.22s',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: 999,
                background: on ? st.color : 'var(--t-decor)',
                boxShadow: on ? `0 0 10px ${st.color}` : 'none',
                transition: 'all 0.22s',
              }} />
              {st.label}
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 items-stretch">

        {/* Biofield */}
        <div className="viewport" style={{ aspectRatio: '4 / 5', minHeight: 340 }}>
          {near && <Biofield colorHex={s.color} isPlaying={false} quality="preview" />}
          <div className="viewport-ticks" />
          <div className="viewport-label">
            <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Resonant field</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {s.hz}<span style={{ fontSize: '0.45em', color: 'var(--t3)', marginLeft: 4, fontWeight: 700 }}>Hz</span>
            </p>
          </div>
        </div>

        {/* Detail */}
        <div className="card card-tone" style={{ padding: 'clamp(24px, 4vw, 38px)', display: 'flex', flexDirection: 'column' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(110% 70% at 85% 0%, ${s.color}22, transparent 62%)`,
              transition: 'background 0.5s ease',
            }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26 }}
              className="relative z-10 flex flex-col"
              style={{ flex: 1 }}
            >
              <span className="verdict" style={{ alignSelf: 'flex-start' }}>
                {s.band.charAt(0).toUpperCase() + s.band.slice(1)} · {s.beat} Hz beat
              </span>
              <h3 style={{ fontSize: 'clamp(1.35rem, 2.6vw, 1.75rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.18, margin: '20px 0 14px' }}>
                {s.headline}
              </h3>
              <p style={{ fontSize: '0.89rem', lineHeight: 1.75, color: 'var(--t2)', marginBottom: 20 }}>
                {s.body}
              </p>
              <div style={{
                padding: '14px 16px', borderRadius: 14,
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
              }}>
                <span className="eyebrow" style={{ fontSize: '0.6rem', marginBottom: 6 }}>How to run it</span>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.65, color: 'var(--t2)' }}>{s.how}</p>
              </div>

              <div style={{ flex: 1, minHeight: 20 }} />

              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/studio?hz=${s.hz}&binaural=${s.band}&duration=30`)}
                  className="inline-flex items-center gap-2"
                  style={{
                    padding: '13px 22px', borderRadius: 999, border: 'none',
                    background: s.color, color: '#06060e',
                    fontSize: '0.86rem', fontWeight: 800,
                    boxShadow: `0 10px 34px -12px ${s.color}`,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                  Run this session
                </motion.button>
                <span style={{ fontSize: '0.73rem', color: 'var(--t4)' }}>
                  {s.when} · 30 min
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
