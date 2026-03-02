import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FrequencyStudio from '@/components/FrequencyStudio'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return <FrequencyStudio user={{ email: user.email ?? '', id: user.id }} />
}
