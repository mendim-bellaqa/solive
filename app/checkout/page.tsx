import { Suspense } from 'react'
import Header from '@/components/Header'
import CheckoutClient from './CheckoutClient'

export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Loading checkout…</p>
        </div>
      }>
        <CheckoutClient />
      </Suspense>
    </>
  )
}
