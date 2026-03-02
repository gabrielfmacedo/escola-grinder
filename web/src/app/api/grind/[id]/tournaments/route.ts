import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('poker_session_results')
    .select('id, played_at, tournament_name, game_type, buy_in_cents, cash_out_cents, entries, position, platform_name')
    .eq('grind_session_id', id)
    .eq('user_id', user.id)
    .order('played_at', { ascending: true })

  return NextResponse.json({ tournaments: data ?? [] })
}
