import FrequencyStudio from '@/components/FrequencyStudio'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Try to get user — guests are welcome, auth is optional
  let userEmail = ''
  let userId = ''
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userEmail = user?.email ?? ''
    userId = user?.id ?? ''
  } catch {
    // No Supabase config or not logged in — continue as guest
  }

  return <FrequencyStudio user={{ email: userEmail, id: userId }} />
}
