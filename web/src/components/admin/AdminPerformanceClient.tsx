'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, BookOpen, BarChart2, Trophy, Target, Layers, Users, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────
interface Session {
  id: string
  user_id: string
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

interface Summary {
  user_id: string
  total_profit_cents: number | null
  total_invested_cents: number | null
  total_returned_cents: number | null
  total_sessions: number | null
  total_minutes_played: number | null
  hourly_rate_cents: number | null
}

interface Profile {
  id: string
  full_name: string
  email: string
  created_at: string
}

interface LessonProgress {
  user_id: string
  completed: boolean
}

interface Group {
  id: string
  name: string
  color: string | null
  description: string | null
}

interface GroupMember {
  group_id: string
  user_id: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '28 dias', days: 28 },
  { label: '3 meses', days: 90 },
  { label: '1 ano', days: 365 },
  { label: 'Tudo', days: 0 },
]

function roiPercent(invested: number, returned: number): number {
  if (!invested) return 0
  return ((returned - invested) / invested) * 100
}

function filterByPeriod(sessions: Session[], days: number): Session[] {
  if (!days) return sessions
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return sessions.filter(s => new Date(s.played_at) >= cutoff)
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminPerformanceClient({
  summaries,
  profiles,
  lessonProgress,
  allSessions,
  groups,
  groupMembers,
}: {
  summaries: Summary[]
  profiles: Profile[]
  lessonProgress: LessonProgress[]
  allSessions: Session[]
  groups: Group[]
  groupMembers: GroupMember[]
}) {
  const router = useRouter()
  const [periodIdx, setPeriodIdx] = useState(3) // 'Tudo' default
  const [scopeType, setScopeType] = useState<'all' | 'group' | 'player'>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [playerSearch, setPlayerSearch] = useState('')

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles])

  const progressByUser = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    for (const lp of lessonProgress) {
      const curr = map.get(lp.user_id) ?? { total: 0, done: 0 }
      curr.total++
      if (lp.completed) curr.done++
      map.set(lp.user_id, curr)
    }
    return map
  }, [lessonProgress])

  // Determine which user IDs are in scope
  const scopedUserIds = useMemo<Set<string> | null>(() => {
    if (scopeType === 'all') return null
    if (scopeType === 'group' && selectedGroupId) {
      return new Set(groupMembers.filter(m => m.group_id === selectedGroupId).map(m => m.user_id))
    }
    if (scopeType === 'player' && selectedPlayerId) {
      return new Set([selectedPlayerId])
    }
    return null
  }, [scopeType, selectedGroupId, selectedPlayerId, groupMembers])

  // Filter sessions by period + scope
  const filteredSessions = useMemo(() => {
    let s = filterByPeriod(allSessions, PERIODS[periodIdx].days)
    if (scopedUserIds) s = s.filter(x => scopedUserIds.has(x.user_id))
    return s
  }, [allSessions, periodIdx, scopedUserIds])

  // Filter summaries by scope
  const filteredSummaries = useMemo(() => {
    if (!scopedUserIds) return summaries
    return summaries.filter(s => scopedUserIds.has(s.user_id))
  }, [summaries, scopedUserIds])

  const isSinglePlayer = scopeType === 'player' && selectedPlayerId

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Performance dos Alunos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Dados financeiros e de progresso.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Period selector */}
          <div className="flex bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-1 gap-0.5">
            {PERIODS.map((p, i) => (
              <button key={p.label}
                onClick={() => setPeriodIdx(i)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  periodIdx === i ? 'bg-[var(--cyan)] text-white' : 'text-[var(--text-dim)] hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scope filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <ScopeButton active={scopeType === 'all'} onClick={() => setScopeType('all')}>
          <Users size={13} /> Todos os alunos
        </ScopeButton>
        {groups.map(g => (
          <ScopeButton key={g.id}
            active={scopeType === 'group' && selectedGroupId === g.id}
            onClick={() => { setScopeType('group'); setSelectedGroupId(g.id) }}
            color={g.color}
          >
            {g.name}
          </ScopeButton>
        ))}
        <div className="relative">
          <input
            type="text"
            value={playerSearch}
            onChange={e => { setPlayerSearch(e.target.value); if (e.target.value === '') { setScopeType('all'); setSelectedPlayerId('') } }}
            placeholder="Buscar jogador..."
            className="w-44 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
          />
          {playerSearch && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-2xl z-30 overflow-hidden">
              {profiles
                .filter(p => p.full_name.toLowerCase().includes(playerSearch.toLowerCase()) || p.email.toLowerCase().includes(playerSearch.toLowerCase()))
                .slice(0, 6)
                .map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedPlayerId(p.id); setScopeType('player'); setPlayerSearch(p.full_name) }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                  >
                    <p className="font-medium text-white">{p.full_name}</p>
                    <p className="text-[var(--text-muted)]">{p.email}</p>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {isSinglePlayer
        ? <SinglePlayerView
          profile={profileMap.get(selectedPlayerId)!}
          sessions={filteredSessions}
          progress={progressByUser.get(selectedPlayerId)}
          summary={summaries.find(s => s.user_id === selectedPlayerId)}
          onViewDetail={() => router.push(`/admin/alunos/${selectedPlayerId}`)}
        />
        : <OverviewView
          summaries={filteredSummaries}
          profileMap={profileMap}
          progressByUser={progressByUser}
          sessions={filteredSessions}
          onRowClick={(id) => router.push(`/admin/alunos/${id}`)}
        />
      }
    </div>
  )
}

// ── Scope Button ───────────────────────────────────────────────────────────
function ScopeButton({ children, active, onClick, color }: {
  children: React.ReactNode; active: boolean; onClick: () => void; color?: string | null
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors',
        active
          ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
          : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)] hover:text-white'
      )}
    >
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color ?? '#3b9ef5' }} />}
      {children}
    </button>
  )
}

// ── Overview (all students or group) ───────────────────────────────────────
function OverviewView({
  summaries, profileMap, progressByUser, sessions, onRowClick,
}: {
  summaries: Summary[]
  profileMap: Map<string, Profile>
  progressByUser: Map<string, { total: number; done: number }>
  sessions: Session[]
  onRowClick: (id: string) => void
}) {
  const totalStudents = summaries.length
  const profitable = summaries.filter(s => (s.total_profit_cents ?? 0) > 0).length
  const avgProfit = totalStudents
    ? Math.round(summaries.reduce((a, s) => a + (s.total_profit_cents ?? 0), 0) / totalStudents)
    : 0

  const byROI = [...summaries]
    .filter(s => (s.total_invested_cents ?? 0) > 0)
    .sort((a, b) =>
      roiPercent(b.total_invested_cents ?? 0, b.total_returned_cents ?? 0) -
      roiPercent(a.total_invested_cents ?? 0, a.total_returned_cents ?? 0)
    ).slice(0, 3)

  const bySessions = [...summaries].sort((a, b) => (b.total_sessions ?? 0) - (a.total_sessions ?? 0)).slice(0, 3)
  const byProfit = [...summaries].sort((a, b) => (b.total_profit_cents ?? 0) - (a.total_profit_cents ?? 0)).slice(0, 3)

  // Worst performers (only include students who have at least 1 session)
  const withSessions = summaries.filter(s => (s.total_sessions ?? 0) > 0)
  const worstProfit = [...withSessions].sort((a, b) => (a.total_profit_cents ?? 0) - (b.total_profit_cents ?? 0)).slice(0, 3)
  const worstROI = [...withSessions]
    .filter(s => (s.total_invested_cents ?? 0) > 0)
    .sort((a, b) =>
      roiPercent(a.total_invested_cents ?? 0, a.total_returned_cents ?? 0) -
      roiPercent(b.total_invested_cents ?? 0, b.total_returned_cents ?? 0)
    ).slice(0, 3)
  const leastActive = [...withSessions].sort((a, b) => (a.total_sessions ?? 0) - (b.total_sessions ?? 0)).slice(0, 3)
  const leastVolume = [...withSessions].sort((a, b) => (a.total_invested_cents ?? 0) - (b.total_invested_cents ?? 0)).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Total de Alunos', value: String(totalStudents), color: 'var(--text-dim)', icon: BookOpen },
          { label: 'Lucrativos', value: String(profitable), color: 'var(--green)', icon: TrendingUp },
          { label: 'Média de Lucro', value: formatCurrency(avgProfit), color: avgProfit >= 0 ? 'var(--green)' : 'var(--red)', icon: BarChart2 },
          { label: 'Em prejuízo', value: String(totalStudents - profitable), color: 'var(--red)', icon: TrendingDown },
        ] as const).map(item => (
          <div key={item.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">{item.label}</p>
              <item.icon size={14} style={{ color: item.color }} />
            </div>
            <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Top performers */}
      {summaries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-[var(--green)]" />
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Melhores Resultados</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TopCard title="Maior Lucro" icon={Trophy} color="var(--gold)">
              {byProfit.length > 0
                ? byProfit.map((s, i) => (
                  <TopRow key={s.user_id} rank={i + 1}
                    name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                    valueLabel={formatCurrency(s.total_profit_cents ?? 0)}
                    positive={(s.total_profit_cents ?? 0) >= 0}
                  />
                ))
                : <p className="text-xs text-[var(--text-muted)]">Sem dados.</p>
              }
            </TopCard>

            <TopCard title="Melhor ROI" icon={Target} color="var(--cyan)">
              {byROI.length > 0
                ? byROI.map((s, i) => {
                  const roi = roiPercent(s.total_invested_cents ?? 0, s.total_returned_cents ?? 0)
                  return (
                    <TopRow key={s.user_id} rank={i + 1}
                      name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                      valueLabel={(roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'}
                      positive={roi >= 0}
                    />
                  )
                })
                : <p className="text-xs text-[var(--text-muted)]">Sem dados.</p>
              }
            </TopCard>

            <TopCard title="Mais Ativo" icon={Layers} color="var(--blue)">
              {bySessions.length > 0
                ? bySessions.map((s, i) => (
                  <TopRow key={s.user_id} rank={i + 1}
                    name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                    valueLabel={`${s.total_sessions ?? 0} torneios`}
                  />
                ))
                : <p className="text-xs text-[var(--text-muted)]">Sem dados.</p>
              }
            </TopCard>
          </div>
        </div>
      )}

      {/* Worst performers */}
      {withSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={13} className="text-[var(--red)]" />
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Piores Resultados</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <TopCard title="Menor Lucro" icon={TrendingDown} color="var(--red)">
              {worstProfit.map((s, i) => {
                const profit = s.total_profit_cents ?? 0
                return (
                  <TopRow key={s.user_id} rank={i + 1}
                    name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                    valueLabel={formatCurrency(profit)}
                    positive={profit >= 0}
                  />
                )
              })}
            </TopCard>

            <TopCard title="Menor ROI" icon={BarChart2} color="var(--red)">
              {worstROI.map((s, i) => {
                const roi = roiPercent(s.total_invested_cents ?? 0, s.total_returned_cents ?? 0)
                return (
                  <TopRow key={s.user_id} rank={i + 1}
                    name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                    valueLabel={roi.toFixed(1) + '%'}
                    positive={roi >= 0}
                  />
                )
              })}
            </TopCard>

            <TopCard title="Menos Ativo" icon={BookOpen} color="var(--text-dim)">
              {leastActive.map((s, i) => (
                <TopRow key={s.user_id} rank={i + 1}
                  name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                  valueLabel={`${s.total_sessions ?? 0} torneios`}
                />
              ))}
            </TopCard>

            <TopCard title="Menor Volume" icon={Target} color="var(--text-dim)">
              {leastVolume.map((s, i) => (
                <TopRow key={s.user_id} rank={i + 1}
                  name={profileMap.get(s.user_id)?.full_name ?? 'Sem nome'}
                  valueLabel={formatCurrency(s.total_invested_cents ?? 0)}
                />
              ))}
            </TopCard>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-white">Desempenho Individual</h2>
        </div>
        {summaries.length === 0 ? (
          <p className="text-center py-12 text-sm text-[var(--text-muted)]">Nenhum aluno registrou sessões ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Aluno', 'Torneios', 'Tempo', 'Lucro Total', 'ROI', 'Taxa/h', 'Aulas', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map(s => {
                  const prof = profileMap.get(s.user_id)
                  const prog = progressByUser.get(s.user_id)
                  const profit = s.total_profit_cents ?? 0
                  const roi = roiPercent(s.total_invested_cents ?? 0, s.total_returned_cents ?? 0)
                  const isProfitable = profit >= 0
                  return (
                    <tr key={s.user_id}
                      onClick={() => onRowClick(s.user_id)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-white text-xs">{prof?.full_name ?? 'Sem nome'}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{prof?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--text-dim)] tabular-nums">{s.total_sessions ?? 0}</td>
                      <td className="px-5 py-3 text-xs text-[var(--text-dim)] whitespace-nowrap">{formatDuration(s.total_minutes_played ?? 0)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={cn('text-xs font-bold tabular-nums', isProfitable ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                          {isProfitable ? '+' : ''}{formatCurrency(profit)}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={cn('text-xs tabular-nums', roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                          {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={cn('text-xs tabular-nums', (s.hourly_rate_cents ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                          {formatCurrency(s.hourly_rate_cents ?? 0)}/h
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--text-dim)]">{prog ? `${prog.done}/${prog.total}` : '—'}</td>
                      <td className="px-5 py-3">
                        {isProfitable ? <TrendingUp size={13} className="text-[var(--green)]" /> : <TrendingDown size={13} className="text-[var(--red)]" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Single Player View ─────────────────────────────────────────────────────
function SinglePlayerView({
  profile, sessions, progress, summary, onViewDetail,
}: {
  profile: Profile | undefined
  sessions: Session[]
  progress: { total: number; done: number } | undefined
  summary: Summary | undefined
  onViewDetail: () => void
}) {
  if (!profile) return <p className="text-sm text-[var(--text-muted)]">Jogador não encontrado.</p>

  const totalProfit = sessions.reduce((a, s) => a + s.profit_cents, 0)
  const totalInvested = sessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const roi = roiPercent(totalInvested, totalInvested + totalProfit)
  const totalSessions = sessions.length

  // Cumulative profit chart
  const chartData = useMemo(() => {
    let cumulative = 0
    return [...sessions]
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
      .map(s => {
        cumulative += s.profit_cents
        return {
          date: new Date(s.played_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          profit: cumulative / 100,
        }
      })
  }, [sessions])

  const isProfitable = totalProfit >= 0

  return (
    <div className="space-y-5">
      {/* Player header */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-black">{profile.full_name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-base font-black text-white">{profile.full_name}</h2>
            <p className="text-xs text-[var(--text-muted)]">{profile.email}</p>
            {progress && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Aulas: {progress.done}/{progress.total}</p>
            )}
          </div>
        </div>
        <button onClick={onViewDetail}
          className="shrink-0 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-colors">
          Ver perfil completo →
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Lucro Total', value: `${isProfitable ? '+' : ''}${formatCurrency(totalProfit)}`, color: isProfitable ? 'var(--green)' : 'var(--red)' },
          { label: 'ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`, color: roi >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Torneios', value: String(totalSessions), color: 'var(--text-dim)' },
          { label: 'Lucro/Torneio', value: totalSessions ? formatCurrency(Math.round(totalProfit / totalSessions)) : '—', color: 'var(--text-dim)' },
        ].map(m => (
          <div key={m.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-1">{m.label}</p>
            <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Evolução do Lucro</h3>
          <ResponsiveContainer width="100%" height={200}>
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

      {sessions.length === 0 && (
        <p className="text-center py-12 text-sm text-[var(--text-muted)]">Nenhum torneio registrado no período selecionado.</p>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TopCard({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p className="text-xs font-bold text-white uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function TopRow({ rank, name, valueLabel, positive }: {
  rank: number; name: string; valueLabel: string; positive?: boolean
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm shrink-0">{medal}</span>
        <p className="text-xs font-medium text-[var(--foreground)] truncate">{name}</p>
      </div>
      <span className={cn(
        'text-xs font-bold tabular-nums shrink-0 ml-2',
        positive === true ? 'text-[var(--green)]' : positive === false ? 'text-[var(--red)]' : 'text-[var(--text-dim)]'
      )}>{valueLabel}</span>
    </div>
  )
}
