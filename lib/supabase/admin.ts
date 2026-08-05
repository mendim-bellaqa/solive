import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. SERVER-ONLY — it bypasses row level security,
 * which is exactly why all writes to `payments` and `entitlements` go through
 * it (clients can only read their own rows). Returns null when the key isn't
 * configured so routes can answer 503 instead of crashing.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
