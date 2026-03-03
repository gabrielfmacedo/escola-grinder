import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GrindSetup from '@/components/grind/GrindSetup'

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

export default async function GrindPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check for existing active session
  const { data: active } = await supabase
    .from('grind_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (active) redirect(`/grind/${active.id}`)

  const [{ data: platforms }, { data: entries }, { data: sessions }] = await Promise.all([
    supabase.from('poker_platforms').select('id, name').eq('is_active', true),
    supabase.from('bankroll_entries').select('platform_id, type, amount_cents').eq('user_id', user.id),
    supabase.from('poker_session_results').select('platform_id, profit_cents, rakeback_cents').eq('user_id', user.id),
  ])

  // Calculate balance per platform
  const balanceMap: Record<string, number> = {}
  for (const e of entries ?? []) {
    if (!e.platform_id) continue
    if (!balanceMap[e.platform_id]) balanceMap[e.platform_id] = 0
    if (e.type === 'initial' || e.type === 'deposit') balanceMap[e.platform_id] += e.amount_cents
    if (e.type === 'withdrawal') balanceMap[e.platform_id] -= Math.abs(e.amount_cents)
  }
  for (const s of sessions ?? []) {
    if (!s.platform_id) continue
    if (!balanceMap[s.platform_id]) balanceMap[s.platform_id] = 0
    balanceMap[s.platform_id] += s.profit_cents + (s.rakeback_cents ?? 0)
  }

  return <GrindSetup platforms={sortPlatforms(platforms ?? [])} platformBalances={balanceMap} />
}
