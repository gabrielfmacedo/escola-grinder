'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

interface SessionRow {
  user_id: string
  played_at: string
  buy_in_cents: number
  profit_cents: number
  duration_minutes: number | null
}

interface Profile { id: string; full_name: string | null }

type RankingTab = 'lucro' | 'volume'
type PeriodKey  = '7d' | '30d' | '3m' | '1y' | 'all'

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d',  label: '7D',  days: 7   },
  { key: '30d', label: '30D', days: 30  },
  { key: '3m',  label: '3M',  days: 90  },
  { key: '1y',  label: '1A',  days: 365 },
  { key: 'all', label: 'TUDO', days: 0  },
]

const MEDALS = ['🥇', '🥈', '🥉']

function fmt(cents: number, sign = false): string {
  const val = cents / 100
  const s = sign && val > 0 ? '+' : ''
  return s + '$' + Math.abs(val).toFixed(2)
}

export default function RankingClient({
  sessions,
  profiles,
  currentUserId,
}: {
  sessions: SessionRow[]
  profiles: Profile[]
  currentUserId: string
}) {
  const [tab, setTab] = useState<RankingTab>('lucro')
  const [period, setPeriod] = useState<PeriodKey>('all')

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map(p => [p.id, p])),
    [profiles]
  )

  const filtered = useMemo(() => {
    const p = PERIODS.find(p => p.key === period)!
    if (p.days === 0) return sessions
    const cutoff = new Date(Date.now() - p.days * 86400_000)
    return sessions.filter(s => new Date(s.played_at) >= cutoff)
  }, [sessions, period])

  const ranking = useMemo(() => {
    const map: Record<string, { profit: number; sessions: number; invested: number; minutes: number }> = {}
    for (const s of filtered) {
      if (!map[s.user_id]) map[s.user_id] = { profit: 0, sessions: 0, invested: 0, minutes: 0 }
      map[s.user_id].profit   += s.profit_cents
      map[s.user_id].sessions += 1
      map[s.user_id].invested += s.buy_in_cents
      map[s.user_id].minutes  += s.duration_minutes ?? 0
    }

    const entries = Object.entries(map).map(([userId, v]) => ({
      userId,
      profit:   v.profit,
      sessions: v.sessions,
      invested: v.invested,
      roi:      v.invested > 0 ? (v.profit / v.invested) * 100 : 0,
      hourly:   v.minutes > 0 ? v.profit / (v.minutes / 60) : 0,
    }))

    if (tab === 'lucro')  return entries.sort((a, b) => b.profit   - a.profit)
    if (tab === 'volume') return entries.sort((a, b) => b.sessions - a.sessions)
    return entries
  }, [filtered, tab])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Ranking</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Top jogadores do grupo.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tab */}
        <div className="flex gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1">
          {([
            { key: 'lucro'  as RankingTab, label: '💰 Lucro'  },
            { key: 'volume' as RankingTab, label: '🎯 Volume' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                tab === t.key
                  ? 'bg-[var(--surface-2)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Period */}
        <div className="flex gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                period === p.key
                  ? 'bg-[var(--surface-2)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
              )}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {ranking.length === 0 ? (
        <div className="text-center py-20">
          <Trophy size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Nenhum dado no período selecionado.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {ranking.map((row, i) => {
            const profile = profileMap[row.userId]
            const isMe = row.userId === currentUserId
            const isPos = row.profit >= 0

            return (
              <div key={row.userId} className={cn(
                'flex items-center gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0 transition-colors',
                isMe && 'bg-[var(--cyan)]/5'
              )}>
                {/* Position */}
                <div className="w-8 text-center shrink-0">
                  {i < 3
                    ? <span className="text-lg">{MEDALS[i]}</span>
                    : <span className="text-sm font-bold text-[var(--text-muted)]">{i + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-black">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isMe && 'text-[var(--cyan)]')}>
                    {profile?.full_name ?? 'Anônimo'}
                    {isMe && <span className="text-xs font-normal text-[var(--text-muted)] ml-1">(você)</span>}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {row.sessions} torneio{row.sessions !== 1 ? 's' : ''}
                    {row.roi !== 0 && <span className="ml-2">ROI: <span className={row.roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{row.roi >= 0 ? '+' : ''}{row.roi.toFixed(1)}%</span></span>}
                  </p>
                </div>

                {/* Metric */}
                <div className="text-right shrink-0">
                  {tab === 'lucro' && (
                    <>
                      <p className={cn('text-sm font-bold', isPos ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                        {fmt(row.profit, true)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {row.hourly !== 0 ? fmt(row.hourly, true) + '/h' : '—'}
                      </p>
                    </>
                  )}
                  {tab === 'volume' && (
                    <>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {row.sessions} torneios
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">{fmt(row.invested)}</p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
