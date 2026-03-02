import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GameType, GrindSessionType } from '@/lib/supabase/types'

// POST — criar nova grind session
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { type, platform_id, game_type, buy_in_cents, tournament_name } = await req.json()
  if (!type) return NextResponse.json({ error: 'Tipo obrigatório' }, { status: 400 })

  // Encerrar qualquer sessão ativa anterior
  await supabase
    .from('grind_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { data, error } = await supabase
    .from('grind_sessions')
    .insert({
      user_id: user.id,
      type: type as GrindSessionType,
      platform_id: (platform_id as string) ?? null,
      game_type: (game_type as GameType) ?? null,
      buy_in_cents: buy_in_cents ?? null,
      tournament_name: tournament_name ?? null,
      is_active: true,
    })
    .select('id, started_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — encerrar grind session
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('grind_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// GET — buscar sessão ativa do usuário
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('grind_sessions')
    .select('id, started_at, type, platform_id, game_type, buy_in_cents, tournament_name, poker_platforms(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ session: data ?? null })
}
