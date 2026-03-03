import { Suspense } from 'react'
import StudioClient from './StudioClient'

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 breathe"
               style={{ background: 'radial-gradient(circle, #10b98140, transparent)' }} />
          <p className="text-sm">Preparing your session...</p>
        </div>
      </div>
    }>
      <StudioClient />
    </Suspense>
  )
}
