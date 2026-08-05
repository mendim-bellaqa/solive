import { NextResponse } from 'next/server'
import { getMerchantCoins, isNowPaymentsConfigured } from '@/lib/nowpayments'

export const dynamic = 'force-dynamic'

/** Coins available in the checkout picker — exactly what the owner enabled
 *  in the NOWPayments dashboard. */
export async function GET() {
  if (!isNowPaymentsConfigured()) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Crypto payments are not configured yet (NOWPAYMENTS_API_KEY is missing).' },
      { status: 503 },
    )
  }
  try {
    const currencies = await getMerchantCoins()
    return NextResponse.json({ currencies })
  } catch {
    return NextResponse.json(
      { error: 'upstream', message: 'Could not load the available cryptocurrencies. Please try again in a moment.' },
      { status: 502 },
    )
  }
}
