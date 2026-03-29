import type { Metadata, Viewport } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Solive — Healing Frequency Studio',
  description: 'Personalized healing frequencies based on your state. Real-time 3D cymatic visualization. Backed by sound therapy research.',
  keywords: ['healing frequencies', 'solfeggio', 'binaural beats', 'sound therapy', '3D visualization', 'meditation'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Solive',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Solive — Healing Frequency Studio',
    description: 'Personalized sound healing sessions. 10 Solfeggio frequencies. Real-time 3D cymatic visualization.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#06060e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ background: 'var(--bg-void)', minHeight: '100vh' }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
