import { createClient } from '@/lib/supabase/server'
import PerformanceClient from '@/components/performance/PerformanceClient'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: sessions },
    { data: platforms },
    { data: bankrollEntries },
  ] = await Promise.all([
    supabase
      .from('poker_session_results')
      .select('id, user_id, platform_id, played_at, buy_in_cents, cash_out_cents, profit_cents, game_type, platform_name, is_live, tournament_name, entries, duration_minutes, roi_percent, itm')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: true }),
    supabase
      .from('poker_platforms')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('bankroll_entries')
      .select('platform_id, type, amount_cents')
      .eq('user_id', user!.id),
  ])

  // Compute platform balances (bankroll_entries + session profits)
  const platformBalanceMap: Record<string, number> = {}
  for (const entry of bankrollEntries ?? []) {
    if (!entry.platform_id) continue
    const sign = ['deposit', 'initial', 'rakeback', 'adjustment'].includes(entry.type) ? 1 : -1
    platformBalanceMap[entry.platform_id] = (platformBalanceMap[entry.platform_id] ?? 0) + sign * entry.amount_cents
  }
  for (const s of sessions ?? []) {
    platformBalanceMap[s.platform_id] = (platformBalanceMap[s.platform_id] ?? 0) + s.profit_cents
  }

  return (
    <PerformanceClient
      initialSessions={sessions ?? []}
      platforms={platforms ?? []}
      platformBalances={platformBalanceMap}
    />
  )
}
