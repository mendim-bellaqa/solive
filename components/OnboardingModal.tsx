'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'solive_onboarded_v1'

const SLIDES = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="3" fill="#10b981" />
        <circle cx="18" cy="18" r="7" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
        <circle cx="18" cy="18" r="12" stroke="#10b981" strokeWidth="1" opacity="0.35" />
        <circle cx="18" cy="18" r="17" stroke="#10b981" strokeWidth="0.6" opacity="0.15" />
      </svg>
    ),
    accent: '#10b981',
    title: 'Welcome to Solive',
    body: 'Personalized sound healing backed by research. Answer 5 questions about how you feel right now — Solive prescribes the exact Solfeggio frequency and binaural beat for your current state.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
    accent: '#a78bfa',
    title: 'Headphones required',
    body: 'Binaural beats need stereo audio to work — your brain processes the difference between the left and right channel tones to entrain your brainwaves. Without headphones you\'ll only hear the base frequency.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
        <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    accent: '#f59e0b',
    title: 'Real-time cymatic 3D',
    body: 'Your session plays with a live 3D visualization mathematically driven by the frequency. Lower frequencies produce simple geometric forms; higher frequencies create intricate crystalline patterns — all reacting to your sound in real time.',
  },
]

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide]     = useState(0)
  const [direction, setDir]   = useState(1)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch { /* private browsing */ }
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  function next() {
    if (slide < SLIDES.length - 1) {
      setDir(1)
      setSlide(s => s + 1)
    } else {
      dismiss()
    }
  }

  function prev() {
    if (slide > 0) {
      setDir(-1)
      setSlide(s => s - 1)
    }
  }

  const current = SLIDES[slide]

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 bottom-6 z-50 max-w-sm mx-auto rounded-3xl overflow-hidden"
            style={{ background: '#0f0f1c', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Slide content */}
            <div className="px-7 pt-8 pb-2 min-h-56">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide}
                  custom={direction}
                  initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                       style={{ background: `${current.accent}15`, border: `1px solid ${current.accent}30` }}>
                    {current.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{current.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot progress */}
            <div className="flex items-center justify-center gap-1.5 py-4">
              {SLIDES.map((_, i) => (
                <div key={i} className="rounded-full transition-all"
                     style={{
                       width: i === slide ? 18 : 6,
                       height: 6,
                       background: i === slide ? current.accent : 'rgba(255,255,255,0.2)',
                     }} />
              ))}
            </div>

            {/* Actions */}
            <div className="px-7 pb-7 flex gap-3">
              {slide > 0 ? (
                <button
                  onClick={prev}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  Back
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-2xl text-sm transition-all"
                  style={{ color: 'var(--text-muted)' }}>
                  Skip
                </button>
              )}
              <motion.button
                onClick={next}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-shadow"
                style={{ background: current.accent, color: '#000',
                         boxShadow: `0 6px 24px ${current.accent}50` }}>
                {slide === SLIDES.length - 1 ? "Let's go" : 'Next →'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
