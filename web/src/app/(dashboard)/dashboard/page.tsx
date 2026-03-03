import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils'
import { Plus, Bell, ChevronRight, AlertTriangle } from 'lucide-react'
import SeedButton from '@/components/dev/SeedButton'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: summary },
    { data: sessions },
    { count: unreadCount },
    { data: bankrollEntries },
    { data: continueProgressRaw },
    { data: completedProgress },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('player_financial_summary').select('*').eq('user_id', user!.id).single(),
    supabase.from('poker_session_results').select('*').eq('user_id', user!.id).order('played_at', { ascending: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('is_read', false),
    supabase.from('bankroll_entries').select('platform_id, type, amount_cents').eq('user_id', user!.id),
    supabase.from('lesson_progress')
      .select('lesson_id, lessons(id, title, modules(courses(title, slug, is_published)))')
      .eq('user_id', user!.id)
      .eq('completed', false)
      .gt('progress_percent', 0)
      .order('last_watched_at', { ascending: false })
      .limit(5),
    supabase.from('lesson_progress').select('lesson_id').eq('user_id', user!.id).eq('completed', true),
  ])

  // Pending day-close check
  const today = new Date().toISOString().split('T')[0]
  const [{ data: todaySessions }, { data: todayClose }] = await Promise.all([
    supabase.from('poker_sessions').select('id').eq('user_id', user!.id).eq('played_at', today).limit(1),
    supabase.from('day_closes').select('id').eq('user_id', user!.id).eq('date', today).maybeSingle(),
  ])
  const hasPendingClose = (todaySessions?.length ?? 0) > 0 && !todayClose

  // Calcular saldo por plataforma (bankroll_entries + lucro de sessões)
  const platformBalanceMap: Record<string, number> = {}
  for (const entry of bankrollEntries ?? []) {
    if (!entry.platform_id) continue
    const sign = ['deposit', 'initial', 'rakeback', 'adjustment'].includes(entry.type) ? 1 : -1
    platformBalanceMap[entry.platform_id] = (platformBalanceMap[entry.platform_id] ?? 0) + sign * entry.amount_cents
  }
  for (const s of sessions ?? []) {
    platformBalanceMap[s.platform_id] = (platformBalanceMap[s.platform_id] ?? 0) + s.profit_cents
  }

  // Plataformas (derivadas das sessões para ter os nomes)
  const platformMap: Record<string, string> = {}
  for (const s of sessions ?? []) {
    platformMap[s.platform_id] = s.platform_name
  }
  const platforms = Object.entries(platformMap).map(([id, name]) => ({ id, name }))

  // Continue Assistindo
  type RawProgress = {
    lesson_id: string
    lessons: { id: string; title: string; modules: { courses: { title: string; slug: string; is_published: boolean } | null } | null } | null
  }
  const continueWatching = ((continueProgressRaw ?? []) as unknown as RawProgress[])
    .filter(p => p.lessons?.modules?.courses?.is_published)
    .map(p => ({
      lessonId: p.lesson_id,
      lessonTitle: p.lessons!.title,
      courseTitle: p.lessons!.modules!.courses!.title,
      courseSlug: p.lessons!.modules!.courses!.slug,
    }))

  // Novas Aulas (publicadas, não completadas pelo aluno)
  const completedIds = (completedProgress ?? []).map(p => p.lesson_id)

  let newLessonsQuery = supabase
    .from('lessons')
    .select('id, title, modules(courses(title, slug, is_published))')
    .order('created_at', { ascending: false })
    .limit(20)

  if (completedIds.length > 0) {
    newLessonsQuery = newLessonsQuery.not('id', 'in', `(${completedIds.join(',')})`)
  }

  const { data: newLessonsRaw } = await newLessonsQuery

  type RawNewLesson = {
    id: string
    title: string
    modules: { courses: { title: string; slug: string; is_published: boolean } | null } | null
  }
  const newLessons = ((newLessonsRaw ?? []) as unknown as RawNewLesson[])
    .filter(l => l.modules?.courses?.is_published)
    .slice(0, 5)
    .map(l => ({
      id: l.id,
      title: l.title,
      courseTitle: l.modules!.courses!.title,
      courseSlug: l.modules!.courses!.slug,
    }))

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Jogador'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-5">

      {/* Seed banner */}
      {!summary?.total_sessions && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-1)] border border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] flex-1">
            Nenhum dado ainda. Carregue sessões de exemplo para explorar a plataforma.
          </p>
          <SeedButton />
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, var(--cyan), transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full blur-3xl opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, var(--gold), transparent 70%)' }} />
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />
        </div>
        <div className="relative px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.15em] font-medium">{greeting}</p>
            <h1 className="text-2xl font-black text-white mt-1">
              {firstName}
              <span className="ml-2 text-[var(--gold)]">✦</span>
            </h1>
            <p className="text-sm text-[var(--text-dim)] mt-1.5">
              {summary?.total_sessions
                ? `${summary.total_sessions} torneios · ${formatDuration(summary.total_minutes_played ?? 0)} jogados`
                : 'Registre seu primeiro torneio para começar.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              href="/performance/novo-torneio"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-black transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}
            >
              <Plus size={14} /> Registrar Torneio
            </Link>
            <Link
              href="/notificacoes"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--text-dim)] hover:bg-white/5 hover:text-white transition-all"
            >
              <Bell size={14} /> Ver Mensagens
              {(unreadCount ?? 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-[var(--cyan)] text-[9px] font-bold text-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Notificações badge (quando há muitas mensagens não lidas) */}
      {(unreadCount ?? 0) > 3 && (
        <Link href="/notificacoes"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--cyan)]/8 border border-[var(--cyan)]/25 hover:bg-[var(--cyan)]/12 transition-colors group">
          <Bell size={15} className="text-[var(--cyan)] shrink-0" />
          <p className="text-sm text-[var(--cyan)] font-semibold flex-1">
            {unreadCount} notificações não lidas
          </p>
          <ChevronRight size={14} className="text-[var(--cyan)]/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Aviso de caixa do dia pendente */}
      {hasPendingClose && (
        <Link href="/banca"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--gold)]/8 border border-[var(--gold)]/30 hover:bg-[var(--gold)]/12 transition-colors group">
          <AlertTriangle size={15} className="text-[var(--gold)] shrink-0" />
          <p className="text-sm text-[var(--gold)] font-semibold flex-1">
            Você jogou hoje e ainda não fechou o caixa do dia.
          </p>
          <ChevronRight size={14} className="text-[var(--gold)]/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* ── Client component com filtros, tabs, stats, gráfico, aulas ── */}
      <DashboardClient
        allSessions={sessions ?? []}
        platformBalances={platformBalanceMap}
        platforms={platforms}
        continueWatching={continueWatching}
        newLessons={newLessons}
      />
    </div>
  )
}
