import { createClient } from '@/lib/supabase/server'
import RankingClient from '@/components/ranking/RankingClient'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: sessions }, { data: profiles }] = await Promise.all([
    supabase
      .from('poker_session_results')
      .select('user_id, played_at, buy_in_cents, profit_cents, duration_minutes'),
    supabase
      .from('profiles')
      .select('id, full_name'),
  ])

  return (
    <RankingClient
      sessions={sessions ?? []}
      profiles={profiles ?? []}
      currentUserId={user.id}
    />
  )
}
