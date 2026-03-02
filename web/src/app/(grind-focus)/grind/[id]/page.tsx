import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GrindSession from '@/components/grind/GrindSession'

const PLATFORM_ORDER = ['pokerstars', 'ggpoker', 'gg poker', 'wpt', 'partypoker', '888poker', 'coinpoker', 'bodog', 'ignition']
function sortPlatforms(platforms: { id: string; name: string }[]) {
  return [...platforms].sort((a, b) => {
    const ai = PLATFORM_ORDER.findIndex(k => a.name.toLowerCase().includes(k))
    const bi = PLATFORM_ORDER.findIndex(k => b.name.toLowerCase().includes(k))
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default async function GrindSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: grindSession } = await supabase
    .from('grind_sessions')
    .select('id, started_at, type, platform_id, game_type, buy_in_cents, tournament_name, is_active, poker_platforms(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!grindSession) notFound()

  if (!grindSession.is_active) redirect('/performance')

  const [{ data: tournaments }, { data: platforms }] = await Promise.all([
    supabase
      .from('poker_session_results')
      .select('id, played_at, tournament_name, game_type, buy_in_cents, cash_out_cents, entries, position, platform_name')
      .eq('grind_session_id', id)
      .eq('user_id', user.id)
      .order('played_at', { ascending: true }),
    supabase
      .from('poker_platforms')
      .select('id, name')
      .eq('is_active', true),
  ])

  const platformInfo = grindSession.poker_platforms as { name: string } | null

  return (
    <GrindSession
      session={{
        id: grindSession.id,
        started_at: grindSession.started_at,
        type: grindSession.type as 'single' | 'mixed',
        platform_id: grindSession.platform_id,
        game_type: grindSession.game_type as import('@/lib/supabase/types').GameType | null,
        buy_in_cents: grindSession.buy_in_cents,
        tournament_name: grindSession.tournament_name,
        platform_name: platformInfo?.name ?? null,
      }}
      initialTournaments={tournaments ?? []}
      platforms={sortPlatforms(platforms ?? [])}
    />
  )
}
