import { createClient } from '@/lib/supabase/server'
import { Calendar, ExternalLink, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import CalendarAdmin from '@/components/calendar/CalendarAdmin'
import type { EventType } from '@/lib/supabase/types'

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string }> = {
  live_class:       { label: 'Aula ao Vivo',     color: 'text-[var(--cyan)]',  bg: 'bg-[var(--cyan)]/10'  },
  content_release:  { label: 'Novo Conteúdo',    color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
  tournament:       { label: 'Torneio',          color: 'text-[var(--gold)]',  bg: 'bg-[var(--gold)]/10'  },
  other:            { label: 'Outro',            color: 'text-[var(--text-dim)]', bg: 'bg-[var(--surface-3)]' },
}

function formatEventDate(starts_at: string, ends_at: string | null): string {
  const start = new Date(starts_at)
  const day = start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  const time = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (!ends_at) return `${day} às ${time}`
  const end = new Date(ends_at)
  const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}–${endTime}`
}

function isUpcoming(starts_at: string): boolean {
  return new Date(starts_at) >= new Date(Date.now() - 3600_000)
}

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = ['admin', 'instructor'].includes(profile?.role ?? '')

  const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', cutoff)
    .order('starts_at', { ascending: true })

  const upcoming = (events ?? []).filter(e => isUpcoming(e.starts_at))
  const past = (events ?? []).filter(e => !isUpcoming(e.starts_at))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Calendário</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Aulas ao vivo, lançamentos e torneios.</p>
        </div>
        {isAdmin && <CalendarAdmin />}
      </div>

      {/* Próximos eventos */}
      <section>
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Próximos eventos {upcoming.length > 0 && <span className="ml-1.5 bg-[var(--cyan)]/20 text-[var(--cyan)] px-1.5 py-0.5 rounded-full text-[10px]">{upcoming.length}</span>}
        </h2>

        {!upcoming.length && (
          <div className="text-center py-12 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl">
            <Calendar size={28} className="text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento próximo.</p>
            {isAdmin && <p className="text-xs text-[var(--text-muted)] mt-1">Clique em "+ Novo Evento" para criar.</p>}
          </div>
        )}

        <div className="space-y-3">
          {upcoming.map(evt => {
            const cfg = TYPE_CONFIG[evt.type as EventType]
            return (
              <div key={evt.id}
                className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4 flex gap-4 items-start hover:border-[var(--border-hi)] transition-colors">
                {/* Type badge */}
                <div className={cn('rounded-xl px-3 py-1.5 shrink-0 text-center min-w-[72px]', cfg.bg)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-wide', cfg.color)}>{cfg.label}</p>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{evt.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatEventDate(evt.starts_at, evt.ends_at)}</p>
                  {evt.description && <p className="text-xs text-[var(--text-dim)] mt-1">{evt.description}</p>}
                </div>
                {/* Link */}
                {evt.url && (
                  <Link href={evt.url} target="_blank"
                    className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--cyan)] hover:bg-[var(--cyan)]/5 transition-colors">
                    <ExternalLink size={15} />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Eventos passados */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Recentes</h2>
          <div className="space-y-2">
            {past.map(evt => {
              const cfg = TYPE_CONFIG[evt.type as EventType]
              return (
                <div key={evt.id}
                  className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3.5 flex items-center gap-3 opacity-60">
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-dim)] truncate">{evt.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{formatEventDate(evt.starts_at, evt.ends_at)}</p>
                  </div>
                  {evt.url && (
                    <Link href={evt.url} target="_blank" className="text-[var(--text-muted)] hover:text-[var(--cyan)]">
                      <ExternalLink size={13} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
