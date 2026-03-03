import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solive — 3D Sound Frequency Studio',
  description: 'Create, explore and experience healing frequencies with 3D visualization and 8D spatial audio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
