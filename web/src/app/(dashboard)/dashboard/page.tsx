import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils'
import { Plus, Bell, ChevronRight } from 'lucide-react'
import SeedButton from '@/components/dev/SeedButton'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const upcomingCutoff = new Date().toISOString()

  const [
    { data: profile },
    { data: summary },
    { data: sessions },
    { count: unreadCount },
    { data: courses },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('player_financial_summary').select('*').eq('user_id', user!.id).single(),
    supabase.from('poker_session_results').select('*').eq('user_id', user!.id).order('played_at', { ascending: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('is_read', false),
    supabase.from('courses').select('id, title, slug, required_plan').eq('is_published', true).order('order_index').limit(4),
    supabase.from('events').select('id, title, starts_at, type').gte('starts_at', upcomingCutoff).order('starts_at').limit(3),
  ])

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
          <Link
            href="/performance/novo-torneio"
            className="flex items-center gap-2 self-start sm:self-center px-5 py-2.5 rounded-xl text-sm font-black text-black shrink-0 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}
          >
            <Plus size={14} /> Novo Torneio
          </Link>
        </div>
      </div>

      {/* Notificações badge */}
      {(unreadCount ?? 0) > 0 && (
        <Link href="/notificacoes"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--cyan)]/8 border border-[var(--cyan)]/25 hover:bg-[var(--cyan)]/12 transition-colors group">
          <Bell size={15} className="text-[var(--cyan)] shrink-0" />
          <p className="text-sm text-[var(--cyan)] font-semibold flex-1">
            {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não lida{unreadCount !== 1 ? 's' : ''}
          </p>
          <ChevronRight size={14} className="text-[var(--cyan)]/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* ── Client component com filtros, tabs, stats, breakdowns ── */}
      <DashboardClient
        allSessions={sessions ?? []}
        courses={courses ?? []}
        upcomingEvents={upcomingEvents ?? []}
      />
    </div>
  )
}
