import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const {
    platform_id,
    played_at,
    game_type,
    tournament_name,
    is_live,
    buy_in_cents,
    cash_out_cents,
    entries,
    position,
    notes,
    grind_session_id,
  } = body

  // Validate required fields
  if (!platform_id) {
    return NextResponse.json({ error: 'Plataforma é obrigatória' }, { status: 400 })
  }
  if (typeof buy_in_cents !== 'number' || buy_in_cents < 0) {
    return NextResponse.json({ error: 'Buy-in inválido' }, { status: 400 })
  }
  if (typeof cash_out_cents !== 'number' || cash_out_cents < 0) {
    return NextResponse.json({ error: 'Prêmio inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('poker_sessions')
    .insert({
      user_id: user.id,
      platform_id: platform_id as string,
      played_at: (played_at as string) ?? new Date().toISOString().split('T')[0],
      game_type: (game_type as string) ?? null,
      tournament_name: (tournament_name as string) ?? null,
      is_live: (is_live as boolean) ?? false,
      buy_in_cents: buy_in_cents as number,
      cash_out_cents: cash_out_cents as number,
      entries: (entries as number) ?? 1,
      position: (position as number) ?? null,
      notes: (notes as string) ?? null,
      grind_session_id: (grind_session_id as string) ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/sessions] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
