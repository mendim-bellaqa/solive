import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// These are NEXT_PUBLIC_*, so they are inlined at BUILD time — a build that
// runs without them ships `undefined` and no amount of fixing the env
// afterwards helps. Guard rather than assert, so a misconfigured deploy
// degrades to "signed out" instead of throwing during prerender.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

let browserClient: SupabaseClient | null = null

/**
 * Browser Supabase client, created on first use and reused after that.
 * Returns null on the server or when the keys are missing — callers treat
 * that as "not signed in / not tracking" rather than crashing.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return null
  if (!browserClient) {
    try {
      browserClient = createBrowserClient(url!, anonKey!)
    } catch (err) {
      console.warn('[hzaura] Supabase unavailable:', err)
      return null
    }
  }
  return browserClient
}

/** Back-compat alias for the original helper name. */
export function createClient(): SupabaseClient | null {
  return getSupabase()
}
