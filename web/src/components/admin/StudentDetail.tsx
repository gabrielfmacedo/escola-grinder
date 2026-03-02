'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Clock, Trophy, Target, ArrowLeft, Pencil } from 'lucide-react'
import EditStudentModal from '@/components/admin/EditStudentModal'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

interface Session {
  id: string
  played_at: string
  buy_in_cents: number
  cash_out_cents: number
  profit_cents: number
  game_type: string | null
  platform_name: string
  is_live: boolean | null
  tournament_name: string | null
  entries: number | null
  duration_minutes: number | null
}

interface LessonProgressItem {
  user_id: string
  completed: boolean
  lessons: { title: string; courses: { title: string } | null } | null
}

interface Group {
  id: string
  name: string
  color: string | null
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  subscriptions: { status: string; plans: { name: string } | null }[]
  preferred_currency: string | null
}

function roiPercent(invested: number, returned: number): number {
  if (!invested) return 0
  return ((returned - invested) / invested) * 100
}

export default function StudentDetail({
  profile,
  sessions,
  lessonProgress,
  groups,
  allGroups,
}: {
  profile: Profile
  sessions: Session[]
  lessonProgress: LessonProgressItem[]
  groups: Group[]
  allGroups?: Group[]
}) {
  const router = useRouter()
  const [breakdownTab, setBreakdownTab] = useState<'platform' | 'game'>('platform')
  const [showEdit, setShowEdit] = useState(false)

  const totalProfit = sessions.reduce((a, s) => a + s.profit_cents, 0)
  const totalInvested = sessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const roi = roiPercent(totalInvested, totalInvested + totalProfit)
  const totalSessions = sessions.length
  const totalMinutes = sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)
  const isProfitable = totalProfit >= 0

  const sub = profile.subscriptions?.[0]
  const planName = sub?.plans?.name ?? '—'
  const planActive = sub?.status === 'active'

  // Cumulative chart
  const chartData = useMemo(() => {
    let cumulative = 0
    return [...sessions]
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
      .map(s => {
        cumulative += s.profit_cents
        return {
          date: new Date(s.played_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          profit: parseFloat((cumulative / 100).toFixed(2)),
        }
      })
  }, [sessions])

  // Breakdown by platform
  const byPlatform = useMemo(() => {
    const map = new Map<string, { sessions: number; profit: number }>()
    for (const s of sessions) {
      const curr = map.get(s.platform_name) ?? { sessions: 0, profit: 0 }
      curr.sessions++
      curr.profit += s.profit_cents
      map.set(s.platform_name, curr)
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sessions - a.sessions)
  }, [sessions])

  // Breakdown by game type
  const byGame = useMemo(() => {
    const map = new Map<string, { sessions: number; profit: number }>()
    for (const s of sessions) {
      const key = s.game_type ?? 'Outros'
      const curr = map.get(key) ?? { sessions: 0, profit: 0 }
      curr.sessions++
      curr.profit += s.profit_cents
      map.set(key, curr)
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sessions - a.sessions)
  }, [sessions])

  const breakdownData = breakdownTab === 'platform' ? byPlatform : byGame

  // Lesson progress stats
  const totalLessons = lessonProgress.length
  const completedLessons = lessonProgress.filter(l => l.completed).length

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors mb-4">
          <ArrowLeft size={13} /> Voltar
        </button>
        {showEdit && allGroups && (
          <EditStudentModal
            student={{ id: profile.id, full_name: profile.full_name, role: profile.role }}
            groups={allGroups}
            memberGroupIds={groups.map(g => g.id)}
            onClose={() => setShowEdit(false)}
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-black">{profile.full_name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{profile.full_name}</h1>
              <p className="text-sm text-[var(--text-muted)]">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium',
                  planActive ? 'text-[var(--cyan)] bg-[var(--cyan)]/10' : 'text-[var(--text-muted)] bg-[var(--surface-3)]'
                )}>
                  {planName}
                </span>
                {groups.map(g => (
                  <span key={g.id} className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                    style={{ background: `${g.color ?? '#3b9ef5'}30`, border: `1px solid ${g.color ?? '#3b9ef5'}50`, color: g.color ?? '#3b9ef5' }}>
                    {g.name}
                  </span>
                ))}
                <span className="text-[11px] text-[var(--text-muted)]">
                  desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          {allGroups && (
            <button onClick={() => setShowEdit(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-colors">
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Lucro Total', value: `${isProfitable ? '+' : ''}${formatCurrency(totalProfit)}`, color: isProfitable ? 'var(--green)' : 'var(--red)', icon: isProfitable ? TrendingUp : TrendingDown },
          { label: 'ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`, color: roi >= 0 ? 'var(--green)' : 'var(--red)', icon: Target },
          { label: 'Torneios', value: String(totalSessions), color: 'var(--text-dim)', icon: Trophy },
          { label: 'Tempo Total', value: formatDuration(totalMinutes), color: 'var(--text-dim)', icon: Clock },
        ].map(m => (
          <div key={m.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">{m.label}</p>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Evolução do Lucro</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number | string | undefined) => [typeof v === 'number' ? `$${v.toFixed(2)}` : v ?? '—', 'Lucro acumulado']}
              />
              <Line type="monotone" dataKey="profit" stroke={isProfitable ? 'var(--green)' : 'var(--red)'}
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdowns */}
      {sessions.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Breakdown</h2>
            <div className="flex bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
              {([['platform', 'Plataforma'], ['game', 'Tipo']] as const).map(([key, label]) => (
                <button key={key}
                  onClick={() => setBreakdownTab(key)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                    breakdownTab === key ? 'bg-[var(--surface-3)] text-white' : 'text-[var(--text-muted)] hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {breakdownData.map(row => {
              const isPos = row.profit >= 0
              const maxSessions = Math.max(...breakdownData.map(r => r.sessions), 1)
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <p className="text-xs text-[var(--text-dim)] w-28 shrink-0 truncate">{row.name}</p>
                  <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--cyan)]/50"
                      style={{ width: `${(row.sessions / maxSessions) * 100}%` }} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] w-8 text-right shrink-0">{row.sessions}</p>
                  <p className={cn('text-xs font-bold tabular-nums w-20 text-right shrink-0', isPos ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                    {isPos ? '+' : ''}{formatCurrency(row.profit)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lesson progress */}
      {totalLessons > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Progresso nas Aulas</h2>
            <span className="text-xs text-[var(--text-muted)]">{completedLessons}/{totalLessons} concluídas</span>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
            {lessonProgress.map((lp, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{lp.lessons?.title ?? '—'}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{lp.lessons?.courses?.title ?? '—'}</p>
                </div>
                <span className={cn(
                  'shrink-0 ml-3 text-[10px] font-bold px-2 py-0.5 rounded-full',
                  lp.completed
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                )}>
                  {lp.completed ? 'Concluída' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-center py-12 text-sm text-[var(--text-muted)]">Nenhum torneio registrado ainda.</p>
      )}
    </div>
  )
}
