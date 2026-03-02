import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BankrollEntryType } from '@/lib/supabase/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [{ data: entries }, { data: sessions }] = await Promise.all([
    supabase.from('bankroll_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('poker_session_results').select('platform_id, platform_name, buy_in_cents, cash_out_cents, rakeback_cents, profit_cents, itm').eq('user_id', user.id),
  ])

  const allEntries = entries ?? []
  const allSessions = sessions ?? []

  // Global summary
  const bancaTotal = allEntries.filter(e => (e.type === 'initial' || e.type === 'deposit') && e.amount_cents > 0)
    .reduce((a, e) => a + e.amount_cents, 0)
  const saques = allEntries.filter(e => e.type === 'withdrawal')
    .reduce((a, e) => a + Math.abs(e.amount_cents), 0)
  const sessionProfit = allSessions.reduce((a, s) => a + s.profit_cents, 0)
  const rakebackFromEntries = allEntries.filter(e => e.type === 'rakeback').reduce((a, e) => a + e.amount_cents, 0)
  const adjustments = allEntries.filter(e => e.type === 'adjustment').reduce((a, e) => a + e.amount_cents, 0)
  const bancaAtual = bancaTotal - saques + sessionProfit + rakebackFromEntries + adjustments
  const totalInvested = allSessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const roi = totalInvested > 0 ? (sessionProfit / totalInvested) * 100 : 0
  const itmCount = allSessions.filter(s => s.itm).length
  const itmPct = allSessions.length > 0 ? (itmCount / allSessions.length) * 100 : 0

  // By platform
  const platformMap = new Map<string, { name: string; bancaTotal: number; saques: number; sessionProfit: number; rakeback: number }>()
  for (const s of allSessions) {
    const cur = platformMap.get(s.platform_id) ?? { name: s.platform_name, bancaTotal: 0, saques: 0, sessionProfit: 0, rakeback: 0 }
    cur.sessionProfit += s.profit_cents
    cur.rakeback += s.rakeback_cents ?? 0
    platformMap.set(s.platform_id, cur)
  }
  for (const e of allEntries) {
    if (!e.platform_id) continue
    const cur = platformMap.get(e.platform_id)
    if (!cur) continue
    if (e.type === 'initial' || e.type === 'deposit') cur.bancaTotal += e.amount_cents
    if (e.type === 'withdrawal') cur.saques += Math.abs(e.amount_cents)
  }
  const byPlatform = [...platformMap.entries()].map(([id, v]) => ({
    platform_id: id,
    platform_name: v.name,
    banca_total_cents: v.bancaTotal,
    saques_cents: v.saques,
    session_profit_cents: v.sessionProfit,
    banca_atual_cents: v.bancaTotal - v.saques + v.sessionProfit + v.rakeback,
  })).sort((a, b) => b.session_profit_cents - a.session_profit_cents)

  return NextResponse.json({
    entries: allEntries,
    summary: {
      banca_total_cents: bancaTotal,
      banca_atual_cents: bancaAtual,
      saques_cents: saques,
      session_profit_cents: sessionProfit,
      roi_percent: Math.round(roi * 100) / 100,
      itm_pct: Math.round(itmPct * 10) / 10,
      total_sessions: allSessions.length,
      by_platform: byPlatform,
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { type, amount_cents, platform_id, date, notes } = body

  const validTypes: BankrollEntryType[] = ['initial', 'deposit', 'withdrawal', 'rakeback', 'adjustment']
  if (!validTypes.includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (typeof amount_cents !== 'number' || amount_cents === 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })

  const { data, error } = await supabase.from('bankroll_entries').insert({
    user_id: user.id,
    type,
    amount_cents,
    platform_id: platform_id || null,
    date: date ?? new Date().toISOString().split('T')[0],
    notes: notes || null,
  }).select('id').single()

  if (error) { console.error('[POST /api/bankroll]', error); return NextResponse.json({ error: error.message }, { status: 500 }) }
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabase.from('bankroll_entries').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
