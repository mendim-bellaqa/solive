// NOWPayments API client. SERVER-ONLY — reads secret env vars; never import
// this from a client component.

import { createHmac, timingSafeEqual } from 'crypto'

const apiBase = () =>
  process.env.NOWPAYMENTS_API_BASE || 'https://api.nowpayments.io/v1'

export class NowPaymentsError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'NowPaymentsError'
    this.status = status
  }
}

export function isNowPaymentsConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY)
}

async function npFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new NowPaymentsError(503, 'NOWPAYMENTS_API_KEY is not set')

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  const text = await res.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }

  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message ||
      `NOWPayments request failed (${res.status})`
    throw new NowPaymentsError(res.status, message)
  }
  return body as T
}

/** Payment object as NOWPayments returns it (from POST/GET /payment and IPNs). */
export interface NpPayment {
  payment_id: number | string
  payment_status: string
  pay_address: string
  price_amount: number
  price_currency: string
  pay_amount: number
  pay_currency: string
  actually_paid?: number
  outcome_amount?: number
  outcome_currency?: string
  order_id?: string
  order_description?: string
  expiration_estimate_date?: string
}

/** Coins the owner enabled in the NOWPayments dashboard — drives the picker. */
export async function getMerchantCoins(): Promise<string[]> {
  const data = await npFetch<{ selectedCurrencies?: string[] }>('/merchant/coins')
  return (data.selectedCurrencies ?? []).map(c => c.toLowerCase())
}

/**
 * Smallest accepted payment for a coin, in USD. Advisory only — returns null
 * when the endpoint has no answer, and POST /payment stays the final word.
 */
export async function getMinAmountUsd(payCurrency: string): Promise<number | null> {
  try {
    const data = await npFetch<{ fiat_equivalent?: number | string }>(
      `/min-amount?currency_from=${encodeURIComponent(payCurrency)}&fiat_equivalent=usd`,
    )
    const usd = Number(data.fiat_equivalent)
    return Number.isFinite(usd) && usd > 0 ? usd : null
  } catch {
    return null
  }
}

export async function createPayment(input: {
  priceUsd: number
  payCurrency: string
  orderId: string
  orderDescription: string
  ipnCallbackUrl?: string
}): Promise<NpPayment> {
  return npFetch<NpPayment>('/payment', {
    method: 'POST',
    body: JSON.stringify({
      price_amount: input.priceUsd,
      price_currency: 'usd',
      pay_currency: input.payCurrency,
      order_id: input.orderId,
      order_description: input.orderDescription,
      ...(input.ipnCallbackUrl ? { ipn_callback_url: input.ipnCallbackUrl } : {}),
    }),
  })
}

export async function getPayment(npPaymentId: string): Promise<NpPayment> {
  return npFetch<NpPayment>(`/payment/${encodeURIComponent(npPaymentId)}`)
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === 'object') {
    const src = value as Record<string, unknown>
    return Object.keys(src).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = sortKeysDeep(src[k])
      return acc
    }, {})
  }
  return value
}

/**
 * IPN authenticity check: NOWPayments signs each webhook as HMAC-SHA512 of the
 * body re-serialized with its keys sorted, using the dashboard IPN secret.
 * The signature is the only thing standing between "webhook" and "anyone can
 * grant themselves a plan", hence the timing-safe comparison.
 */
export function verifyIpnSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret || !signature) return false

  let parsed: unknown
  try { parsed = JSON.parse(rawBody) } catch { return false }

  const canonical = JSON.stringify(sortKeysDeep(parsed))
  const expected = createHmac('sha512', secret).update(canonical).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
