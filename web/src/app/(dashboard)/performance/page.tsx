import { createClient } from '@/lib/supabase/server'
import PerformanceClient from '@/components/performance/PerformanceClient'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: sessions }, { data: platforms }] = await Promise.all([
    supabase
      .from('poker_session_results')
      .select('id, user_id, platform_id, played_at, buy_in_cents, cash_out_cents, profit_cents, game_type, platform_name, is_live, tournament_name, entries, duration_minutes, roi_percent')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: true }),
    supabase
      .from('poker_platforms')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <PerformanceClient
      initialSessions={sessions ?? []}
      platforms={platforms ?? []}
    />
  )
}
