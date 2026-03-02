import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { date, closing_bankroll_cents, rakeback_cents = 0, notes } = body

  if (!date) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 })
  if (typeof closing_bankroll_cents !== 'number') return NextResponse.json({ error: 'Saldo inválido' }, { status: 400 })

  // Compute opening bankroll from entries + sessions before today
  const [{ data: entries }, { data: sessions }, { data: todaySessions }] = await Promise.all([
    supabase.from('bankroll_entries').select('type, amount_cents').eq('user_id', user.id),
    supabase.from('poker_session_results').select('profit_cents, rakeback_cents').eq('user_id', user.id),
    supabase.from('poker_session_results').select('profit_cents, rakeback_cents').eq('user_id', user.id).eq('played_at', date),
  ])

  const allEntries = entries ?? []
  const allSessions = sessions ?? []
  const todaySessionList = todaySessions ?? []

  const bancaTotal = allEntries.filter(e => (e.type === 'initial' || e.type === 'deposit') && e.amount_cents > 0)
    .reduce((a, e) => a + e.amount_cents, 0)
  const saques = allEntries.filter(e => e.type === 'withdrawal').reduce((a, e) => a + Math.abs(e.amount_cents), 0)
  const allSessionProfit = allSessions.reduce((a, s) => a + s.profit_cents, 0)
  const rakebackFromEntries = allEntries.filter(e => e.type === 'rakeback').reduce((a, e) => a + e.amount_cents, 0)
  const adjustments = allEntries.filter(e => e.type === 'adjustment').reduce((a, e) => a + e.amount_cents, 0)
  const currentBankroll = bancaTotal - saques + allSessionProfit + rakebackFromEntries + adjustments

  // Opening = current bankroll minus today's activity
  const todayProfit = todaySessionList.reduce((a, s) => a + s.profit_cents, 0)
  const todayRakeback = todaySessionList.reduce((a, s) => a + (s.rakeback_cents ?? 0), 0)
  const openingBankroll = currentBankroll - todayProfit - todayRakeback

  // Expected closing = opening + today profit + rakeback (from sessions) + rakeback_cents (manual)
  const expectedClosing = openingBankroll + todayProfit + todayRakeback + rakeback_cents
  const adjustmentAmount = closing_bankroll_cents - expectedClosing

  // Check if already closed today
  const { data: existing } = await supabase.from('day_closes').select('id').eq('user_id', user.id).eq('date', date).single()
  if (existing) return NextResponse.json({ error: 'Caixa já fechado para essa data' }, { status: 409 })

  // Insert day_close record
  const { error: closeError } = await supabase.from('day_closes').insert({
    user_id: user.id,
    date,
    opening_bankroll_cents: openingBankroll,
    closing_bankroll_cents,
    session_profit_cents: todayProfit,
    rakeback_cents: rakeback_cents + todayRakeback,
    adjustment_cents: adjustmentAmount,
    notes: notes || null,
  })

  if (closeError) return NextResponse.json({ error: closeError.message }, { status: 500 })

  // If rakeback was entered manually, create bankroll entry
  if (rakeback_cents > 0) {
    await supabase.from('bankroll_entries').insert({
      user_id: user.id,
      type: 'rakeback',
      amount_cents: rakeback_cents,
      date,
      notes: `Rakeback — fechamento de caixa ${date}`,
    })
  }

  // If there's a divergence, create adjustment entry
  if (adjustmentAmount !== 0) {
    await supabase.from('bankroll_entries').insert({
      user_id: user.id,
      type: 'adjustment',
      amount_cents: adjustmentAmount,
      date,
      notes: `Ajuste de fechamento de caixa ${date}`,
    })
  }

  return NextResponse.json({ ok: true, adjustment_cents: adjustmentAmount })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  // Check if today is already closed
  const { data: existing } = await supabase.from('day_closes').select('*').eq('user_id', user.id).eq('date', date).maybeSingle()

  // Get today's sessions
  const { data: todaySessions } = await supabase
    .from('poker_session_results')
    .select('id, platform_name, tournament_name, buy_in_cents, cash_out_cents, profit_cents, rakeback_cents, itm')
    .eq('user_id', user.id)
    .eq('played_at', date)

  return NextResponse.json({
    already_closed: !!existing,
    day_close: existing ?? null,
    today_sessions: todaySessions ?? [],
  })
}
