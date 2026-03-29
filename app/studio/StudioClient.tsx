'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import FrequencyStudio from '@/components/FrequencyStudio'
import { BinauralBand } from '@/lib/frequencies'
import type { QuestionnaireAnswers } from '@/lib/recommendation'

const VALID_BANDS: BinauralBand[] = ['delta', 'theta', 'alpha', 'beta', 'gamma']

/** Accept any Hz from 1 – 20 000. Falls back to 528 if out of range. */
function sanitizeHz(raw: number): number {
  if (Number.isFinite(raw) && raw >= 1 && raw <= 20000) return Math.round(raw * 10) / 10
  return 528
}

export default function StudioClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [answers, setAnswers] = useState<QuestionnaireAnswers | undefined>(undefined)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('solive_answers')
      if (saved) setAnswers(JSON.parse(saved))
    } catch { /* private browsing */ }
  }, [])

  const hzRaw       = Number(params.get('hz'))
  const bandRaw     = params.get('binaural') as BinauralBand
  const durationRaw = Number(params.get('duration'))
  const secondaryRaw = Number(params.get('secondary'))

  const hz           = sanitizeHz(hzRaw)
  const binauralBand: BinauralBand = VALID_BANDS.includes(bandRaw) ? bandRaw : 'alpha'
  const duration     = [15, 30, 45, 9999].includes(durationRaw) ? durationRaw : 30
  const secondaryHz  = sanitizeHz(secondaryRaw) !== 528 || secondaryRaw !== 528
    ? (secondaryRaw !== hz && secondaryRaw >= 1 && secondaryRaw <= 20000 ? secondaryRaw : undefined)
    : undefined

  if (!hzRaw) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
               style={{ color: 'var(--text-muted)' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold mb-1">No frequency selected</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Choose a frequency from the home page or complete the questionnaire.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => router.push('/session')} className="btn-primary">
            Find my frequency →
          </button>
          <button onClick={() => router.push('/')} className="btn-ghost">
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <FrequencyStudio
      hz={hz}
      binauralBand={binauralBand}
      duration={duration}
      secondaryHz={secondaryHz}
      answers={answers}
    />
  )
}
