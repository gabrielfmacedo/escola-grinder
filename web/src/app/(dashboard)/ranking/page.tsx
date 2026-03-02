import { createClient } from '@/lib/supabase/server'
import { Trophy, TrendingUp, Medal } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ranking por lucro total (todos os alunos)
  const { data: ranking } = await supabase
    .from('player_financial_summary')
    .select('user_id, total_profit_cents, total_sessions, hourly_rate_cents')
    .order('total_profit_cents', { ascending: false })
    .limit(20)

  // Busca perfis dos usuários no ranking
  const userIds = ranking?.map(r => r.user_id) ?? []
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Ranking</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Top jogadores por lucro acumulado.</p>
      </div>

      {!ranking?.length && (
        <div className="text-center py-20">
          <Trophy size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Nenhuma sessão registrada ainda.</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Registre sessões na banca para aparecer no ranking.</p>
        </div>
      )}

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {ranking?.map((row, i) => {
          const profile = profileMap[row.user_id]
          const isMe = row.user_id === user!.id
          const profit = row.total_profit_cents ?? 0
          const positive = profit >= 0

          return (
            <div key={row.user_id} className={cn(
              'flex items-center gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0 transition-colors',
              isMe && 'bg-[var(--cyan)]/5'
            )}>
              {/* Posição */}
              <div className="w-8 text-center shrink-0">
                {i < 3
                  ? <span className="text-lg">{MEDAL[i]}</span>
                  : <span className="text-sm font-bold text-[var(--text-muted)]">{i + 1}</span>
                }
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-black">
                  {profile?.full_name?.charAt(0) ?? '?'}
                </span>
              </div>

              {/* Nome */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isMe && 'text-[var(--cyan)]')}>
                  {profile?.full_name ?? 'Anônimo'} {isMe && <span className="text-xs font-normal">(você)</span>}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{row.total_sessions} sessões</p>
              </div>

              {/* Lucro */}
              <div className="text-right shrink-0">
                <p className={cn('text-sm font-bold', positive ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                  {positive ? '+' : ''}{formatCurrency(profit)}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {formatCurrency(row.hourly_rate_cents ?? 0)}/h
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
