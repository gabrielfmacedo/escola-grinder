import { createClient } from '@/lib/supabase/server'
import SessoesClient from '@/components/sessoes/SessoesClient'

export default async function SessoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawSessions }, { data: platforms }] = await Promise.all([
    supabase
      .from('grind_sessions')
      .select('id, started_at, ended_at, type, platform_id, game_type, buy_in_cents, tournament_name, notes, poker_platforms(name)')
      .eq('user_id', user!.id)
      .eq('is_active', false)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false }),
    supabase
      .from('poker_platforms')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  // Fetch all tournaments belonging to these sessions
  const sessionIds = (rawSessions ?? []).map(s => s.id)
  let allTournaments: Record<string, unknown>[] = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('poker_session_results')
      .select('id, grind_session_id, platform_id, platform_name, played_at, tournament_name, game_type, is_live, buy_in_cents, cash_out_cents, profit_cents, entries, position, itm, duration_minutes')
      .eq('user_id', user!.id)
      .in('grind_session_id', sessionIds)
      .order('played_at', { ascending: true })
    allTournaments = (data ?? []) as Record<string, unknown>[]
  }

  // Pending day-close check: sessions today without a day_close
  const today = new Date().toISOString().split('T')[0]
  const [{ data: todaySessions }, { data: todayClose }] = await Promise.all([
    supabase.from('poker_sessions').select('id').eq('user_id', user!.id).eq('played_at', today).limit(1),
    supabase.from('day_closes').select('id').eq('user_id', user!.id).eq('date', today).maybeSingle(),
  ])
  const hasPendingClose = (todaySessions?.length ?? 0) > 0 && !todayClose

  // Normalize sessions (flatten join)
  type RawSession = {
    id: string; started_at: string; ended_at: string | null; type: string
    platform_id: string | null; game_type: string | null; buy_in_cents: number | null
    tournament_name: string | null; notes: string | null
    poker_platforms: { name: string } | null
  }
  const sessions = ((rawSessions ?? []) as unknown as RawSession[]).map(s => ({
    id: s.id,
    started_at: s.started_at,
    ended_at: s.ended_at,
    type: s.type as 'single' | 'mixed',
    platform_id: s.platform_id,
    platform_name: s.poker_platforms?.name ?? null,
    game_type: s.game_type,
    buy_in_cents: s.buy_in_cents,
    tournament_name: s.tournament_name,
    notes: s.notes,
  }))

  return (
    <SessoesClient
      sessions={sessions}
      allTournaments={allTournaments}
      platforms={platforms ?? []}
      hasPendingClose={hasPendingClose}
    />
  )
}
