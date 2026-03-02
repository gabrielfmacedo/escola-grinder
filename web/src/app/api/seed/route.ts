// ROTA DE DESENVOLVIMENTO — cria dados de exemplo para o usuário logado
// Remova em produção!
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Plataformas
  const { data: platforms } = await admin.from('poker_platforms').select('id, name')
  const platformMap = Object.fromEntries((platforms ?? []).map(p => [p.name, p.id]))

  // Sessões realistas (últimos 60 dias, curva de evolução)
  const sessions = [
    // Semana 1 — aprendizado, pequenas perdas
    { days: 58, platform: 'GGPoker',                    game: 'MTT',    stakes: '$3.30',   buy: 330,   out: 0,    rake: 0,   mins: 120 },
    { days: 56, platform: 'PokerStars',                 game: 'MTT',    stakes: '$5.50',   buy: 550,   out: 220,  rake: 0,   mins: 90  },
    { days: 55, platform: 'GGPoker',                    game: 'MTT',    stakes: '$3.30',   buy: 330,   out: 850,  rake: 0,   mins: 180 },
    { days: 53, platform: 'WPN / Americas Cardroom',    game: 'SNG',    stakes: '$5 SNG',  buy: 500,   out: 0,    rake: 0,   mins: 45  },
    { days: 52, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 0,    rake: 0,   mins: 150 },
    // Semana 2 — primeiro resultado maior
    { days: 50, platform: 'PokerStars',                 game: 'MTT',    stakes: '$5.50',   buy: 550,   out: 3200, rake: 0,   mins: 300 },
    { days: 49, platform: 'GGPoker',                    game: 'MTT',    stakes: '$3.30',   buy: 330,   out: 0,    rake: 0,   mins: 110 },
    { days: 48, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 550,  rake: 0,   mins: 200 },
    { days: 46, platform: 'WPN / Americas Cardroom',    game: 'MTT',    stakes: '$22 PKO', buy: 2200,  out: 0,    rake: 0,   mins: 180 },
    { days: 45, platform: 'PokerStars',                 game: 'Cash',   stakes: 'NL5',     buy: 500,   out: 820,  rake: 50,  mins: 120 },
    // Semana 3 — downswing
    { days: 43, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 0,    rake: 0,   mins: 140 },
    { days: 42, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 0,    rake: 0,   mins: 120 },
    { days: 41, platform: 'PokerStars',                 game: 'MTT',    stakes: '$5.50',   buy: 550,   out: 0,    rake: 0,   mins: 95  },
    { days: 40, platform: 'WPN / Americas Cardroom',    game: 'MTT',    stakes: '$22 PKO', buy: 2200,  out: 800,  rake: 0,   mins: 210 },
    { days: 39, platform: 'GGPoker',                    game: 'MTT',    stakes: '$3.30',   buy: 660,   out: 0,    rake: 0,   mins: 100 },
    // Semana 4 — recuperação + grande resultado
    { days: 36, platform: 'PokerStars',                 game: 'MTT',    stakes: '$11',     buy: 1100,  out: 15000,rake: 0,   mins: 480 },
    { days: 35, platform: 'GGPoker',                    game: 'Cash',   stakes: 'NL10',    buy: 1000,  out: 1650, rake: 120, mins: 180 },
    { days: 34, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 0,    rake: 0,   mins: 130 },
    { days: 32, platform: 'WPN / Americas Cardroom',    game: 'MTT',    stakes: '$55 PKO', buy: 5500,  out: 2200, rake: 0,   mins: 360 },
    { days: 30, platform: 'PokerStars',                 game: 'Cash',   stakes: 'NL10',    buy: 1000,  out: 1900, rake: 150, mins: 200 },
    // Semana 5-8 — consistência
    { days: 28, platform: 'GGPoker',                    game: 'MTT',    stakes: '$22 PKO', buy: 2200,  out: 0,    rake: 0,   mins: 160 },
    { days: 27, platform: 'PokerStars',                 game: 'MTT',    stakes: '$11',     buy: 1100,  out: 4500, rake: 0,   mins: 420 },
    { days: 25, platform: 'GGPoker',                    game: 'Cash',   stakes: 'NL10',    buy: 1000,  out: 730,  rake: 80,  mins: 150 },
    { days: 23, platform: 'WPN / Americas Cardroom',    game: 'MTT',    stakes: '$22 PKO', buy: 2200,  out: 8800, rake: 0,   mins: 500 },
    { days: 21, platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 0,    rake: 0,   mins: 120 },
    { days: 19, platform: 'PokerStars',                 game: 'Cash',   stakes: 'NL20',    buy: 2000,  out: 3100, rake: 200, mins: 240 },
    { days: 17, platform: 'GGPoker',                    game: 'MTT',    stakes: '$55',     buy: 5500,  out: 0,    rake: 0,   mins: 200 },
    { days: 15, platform: 'WPN / Americas Cardroom',    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 2200, rake: 0,   mins: 300 },
    { days: 12, platform: 'GGPoker',                    game: 'Cash',   stakes: 'NL20',    buy: 2000,  out: 2800, rake: 200, mins: 180 },
    { days: 10, platform: 'PokerStars',                 game: 'MTT',    stakes: '$22',     buy: 2200,  out: 1100, rake: 0,   mins: 250 },
    { days: 8,  platform: 'GGPoker',                    game: 'MTT',    stakes: '$11',     buy: 1100,  out: 5500, rake: 0,   mins: 420 },
    { days: 6,  platform: 'WPN / Americas Cardroom',    game: 'Cash',   stakes: 'NL20',    buy: 2000,  out: 1500, rake: 180, mins: 160 },
    { days: 4,  platform: 'PokerStars',                 game: 'MTT',    stakes: '$33',     buy: 3300,  out: 0,    rake: 0,   mins: 180 },
    { days: 2,  platform: 'GGPoker',                    game: 'MTT',    stakes: '$22 PKO', buy: 2200,  out: 6600, rake: 0,   mins: 380 },
    { days: 0,  platform: 'PokerStars',                 game: 'Cash',   stakes: 'NL20',    buy: 2000,  out: 3400, rake: 250, mins: 200 },
  ]

  const now = new Date()
  const sessionRows = sessions.map(s => {
    const d = new Date(now)
    d.setDate(d.getDate() - s.days)
    return {
      user_id: user.id,
      platform_id: platformMap[s.platform] ?? Object.values(platformMap)[0],
      played_at: d.toISOString().split('T')[0],
      game_type: s.game as 'MTT' | 'Cash' | 'Spin&Go' | 'SNG' | 'Outros',
      stakes: s.stakes,
      buy_in_cents: s.buy,
      cash_out_cents: s.out,
      rakeback_cents: s.rake || null,
      duration_minutes: s.mins,
    }
  })

  await admin.from('poker_sessions').delete().eq('user_id', user.id)
  await admin.from('poker_sessions').insert(sessionRows)

  // Progresso em algumas aulas
  const { data: lessons } = await admin.from('lessons').select('id').limit(8)
  if (lessons?.length) {
    const progressRows = lessons.slice(0, 6).map(l => ({
      user_id: user.id,
      lesson_id: l.id,
      completed: true,
      progress_percent: 100,
      last_watched_at: new Date().toISOString(),
    }))
    await admin.from('lesson_progress').upsert(progressRows, { onConflict: 'user_id,lesson_id' })
  }

  // Notificações de exemplo
  await admin.from('notifications').delete().eq('user_id', user.id)
  await admin.from('notifications').insert([
    {
      user_id: user.id,
      type: 'achievement' as const,
      title: 'Troféu desbloqueado!',
      message: 'Você registrou suas primeiras 10 sessões. Continue assim!',
      action_url: '/ranking',
      is_read: false,
    },
    {
      user_id: user.id,
      type: 'new_content' as const,
      title: 'Nova aula disponível',
      message: 'Estratégia de Torneios MTT — Módulo ICM foi atualizado.',
      action_url: '/cursos/estrategia-mtt',
      is_read: false,
    },
    {
      user_id: user.id,
      type: 'mentorship' as const,
      title: 'Sessão de mentoria agendada',
      message: 'Você tem uma sessão agendada para amanhã às 20h.',
      action_url: '/mentoria',
      is_read: true,
    },
  ])

  return NextResponse.json({ ok: true, sessions: sessionRows.length })
}
