import { createClient } from '@/lib/supabase/server'
import { GraduationCap, Calendar, CheckCircle, Clock, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  scheduled:  { label: 'Agendada',  color: 'text-[var(--cyan)]',  bg: 'bg-[var(--cyan)]/10'  },
  completed:  { label: 'Concluída', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
  canceled:   { label: 'Cancelada', color: 'text-[var(--red)]',   bg: 'bg-[var(--red)]/10'   },
}

export default async function MentoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from('mentorship_sessions')
    .select('*, instructor:profiles!mentorship_sessions_instructor_id_fkey(full_name, avatar_url)')
    .eq('student_id', user!.id)
    .order('scheduled_at', { ascending: false })

  const { data: goals } = await supabase
    .from('student_goals')
    .select('*')
    .eq('student_id', user!.id)
    .order('created_at', { ascending: false })

  const typedSessions = (sessions ?? []) as unknown as SessionRow[]
  const upcoming = typedSessions.filter(s => s.status === 'scheduled')
  const past     = typedSessions.filter(s => s.status !== 'scheduled')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Mentoria</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Acompanhe suas sessões e evolução com o instrutor.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sessões */}
        <div className="lg:col-span-2 space-y-4">
          {/* Próximas */}
          {upcoming.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-[var(--cyan)]" /> Próximas sessões
              </h2>
              <div className="space-y-3">
                {upcoming.map(s => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-muted)]" /> Histórico
            </h2>
            {!past.length && !upcoming.length ? (
              <div className="text-center py-10">
                <GraduationCap size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Nenhuma sessão de mentoria ainda.</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Entre em contato com seu instrutor para agendar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {past.map(s => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </div>
        </div>

        {/* Metas / Leaks */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <Target size={14} className="text-[var(--gold)]" /> Metas & Leaks
          </h2>
          {!goals?.length ? (
            <p className="text-xs text-[var(--text-muted)]">Nenhuma meta definida ainda.</p>
          ) : (
            <div className="space-y-2">
              {goals.map(g => (
                <div key={g.id} className={cn(
                  'flex items-start gap-2 p-3 rounded-xl border text-xs',
                  g.is_resolved
                    ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                )}>
                  <CheckCircle size={13} className={g.is_resolved ? 'text-[var(--green)] mt-0.5 shrink-0' : 'text-[var(--text-muted)] mt-0.5 shrink-0'} />
                  <div>
                    <p className={cn('font-medium', g.is_resolved ? 'text-[var(--text-dim)] line-through' : 'text-[var(--foreground)]')}>
                      {g.title}
                    </p>
                    {g.description && <p className="text-[var(--text-muted)] mt-0.5">{g.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type SessionRow = {
  id: string
  title: string | null
  status: string
  scheduled_at: string | null
  homework: string | null
  instructor: { full_name: string } | null
}

function SessionCard({ session }: { session: SessionRow }) {
  const status = (session.status as keyof typeof STATUS_CONFIG) ?? 'scheduled'
  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
      <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 mt-0.5', cfg.bg, cfg.color)}>
        {cfg.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">
          {session.title || 'Sessão de mentoria'}
        </p>
        {session.instructor && (
          <p className="text-xs text-[var(--text-muted)]">com {session.instructor.full_name}</p>
        )}
        {session.scheduled_at && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date(session.scheduled_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        )}
        {session.homework && (
          <p className="text-xs text-[var(--gold)] mt-1.5">
            📝 Dever: {session.homework}
          </p>
        )}
      </div>
    </div>
  )
}
