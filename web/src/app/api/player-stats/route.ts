import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/player-stats — player reads their own stats + configs + overrides
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [{ data: stats }, { data: overrides }, { data: configs }] = await Promise.all([
    supabase.from('player_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false }),
    supabase.from('player_stat_overrides')
      .select('*')
      .eq('user_id', user.id),
    supabase.from('stat_configs')
      .select('*')
      .order('sort_order')
      .order('name'),
  ])

  return NextResponse.json({ stats: stats ?? [], overrides: overrides ?? [], configs: configs ?? [] })
}
