import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solive — Healing Frequency Studio',
  description: 'Personalized healing frequencies based on your state. Real-time 3D cymatic visualization. Backed by sound therapy research.',
  keywords: ['healing frequencies', 'solfeggio', 'binaural beats', 'sound therapy', '3D visualization', 'meditation'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-void)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
