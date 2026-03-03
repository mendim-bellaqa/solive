'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import FrequencyStudio from '@/components/FrequencyStudio'
import { BinauralBand, FREQUENCIES } from '@/lib/frequencies'

const VALID_BANDS: BinauralBand[] = ['delta', 'theta', 'alpha', 'beta', 'gamma']
const VALID_HZ = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963]

export default function StudioClient() {
  const params = useSearchParams()
  const router = useRouter()

  const hzRaw = Number(params.get('hz'))
  const bandRaw = params.get('binaural') as BinauralBand
  const durationRaw = Number(params.get('duration'))

  const hz = VALID_HZ.includes(hzRaw) ? hzRaw : 528
  const binauralBand: BinauralBand = VALID_BANDS.includes(bandRaw) ? bandRaw : 'alpha'
  const duration = [15, 30, 45, 9999].includes(durationRaw) ? durationRaw : 30

  if (!FREQUENCIES[hz]) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>No session found.</p>
        <button onClick={() => router.push('/session')} className="btn-primary">
          Start a new session
        </button>
      </div>
    )
  }

  return <FrequencyStudio hz={hz} binauralBand={binauralBand} duration={duration} />
}
