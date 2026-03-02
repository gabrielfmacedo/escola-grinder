import { createClient } from '@/lib/supabase/server'
import { Bell, BookOpen, Trophy, DollarSign, Info, GraduationCap, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import MarkReadButton from '@/components/notifications/MarkReadButton'
import Link from 'next/link'
import type { NotificationType } from '@/lib/supabase/types'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  new_content: { icon: BookOpen,     color: 'text-[var(--cyan)]',     bg: 'bg-[var(--cyan)]/10'   },
  mentorship:  { icon: GraduationCap,color: 'text-[var(--blue)]',     bg: 'bg-[var(--blue)]/10'   },
  achievement: { icon: Trophy,       color: 'text-[var(--gold)]',     bg: 'bg-[var(--gold)]/10'   },
  financial:   { icon: DollarSign,   color: 'text-[var(--green)]',    bg: 'bg-[var(--green)]/10'  },
  system:      { icon: Info,         color: 'text-[var(--text-dim)]', bg: 'bg-[var(--surface-3)]' },
}

export default async function NotificacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const unread = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Notificações</h1>
          {unread > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{unread} não lida{unread !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unread > 0 && <MarkReadButton userId={user!.id} />}
      </div>

      {!notifications?.length && (
        <div className="text-center py-20">
          <Bell size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Nenhuma notificação ainda.</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map(n => {
          const cfg = TYPE_CONFIG[n.type]
          const Icon = cfg.icon
          const Wrapper = n.action_url ? Link : 'div'
          const wrapperProps = n.action_url ? { href: n.action_url } : {}
          return (
            // @ts-expect-error dynamic wrapper
            <Wrapper key={n.id} {...wrapperProps} className={cn(
              'flex items-start gap-4 p-4 rounded-xl border transition-colors',
              n.action_url && 'hover:border-[var(--cyan)]/30 cursor-pointer',
              n.is_read
                ? 'bg-[var(--surface-1)] border-[var(--border)]'
                : 'bg-[var(--surface-2)] border-[var(--border)] border-l-2 border-l-[var(--cyan)]'
            )}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                <Icon size={16} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold', n.is_read ? 'text-[var(--text-dim)]' : 'text-[var(--foreground)]')}>
                  {n.title}
                </p>
                {n.message && <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.message}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {n.action_url && (
                    <span className="text-[11px] text-[var(--cyan)] flex items-center gap-0.5 font-medium">
                      <ExternalLink size={10} /> Ver mais
                    </span>
                  )}
                </div>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-[var(--cyan)] shrink-0 mt-1.5" />}
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}
