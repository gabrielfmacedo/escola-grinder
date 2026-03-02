'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, Clock, Target, Layers, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDuration } from '@/lib/utils'
import PnLChart from '@/components/banca/PnLChart'

interface Session {
  id: string
  user_id: string
  platform_id: string
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
  roi_percent: number | null
}

interface Platform { id: string; name: string }

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PERIODS = [
  { label: 'Tudo', days: 0 },
  { label: 'Hoje', days: -1 },
  { label: 'Ontem', days: -2 },
  { label: '7 dias', days: 7 },
  { label: '28 dias', days: 28 },
  { label: '3 meses', days: 90 },
  { label: '1 ano', days: 365 },
]

function getDateRange(days: number): Date | null {
  if (days === 0) return null
  if (days === -1) {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }
  if (days === -2) {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d
  }
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function getDateEnd(days: number): Date | null {
  if (days === -2) {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }
  return null
}

export default function PerformanceClient({
  initialSessions,
  platforms,
}: {
  initialSessions: Session[]
  platforms: Platform[]
}) {
  const [periodIdx, setPeriodIdx] = useState(0)
  const [platformId, setPlatformId] = useState('')
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [minBuyIn, setMinBuyIn] = useState('')
  const [maxBuyIn, setMaxBuyIn] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilter = periodIdx !== 0 || platformId !== '' || selectedDays.size > 0 || minBuyIn !== '' || maxBuyIn !== ''

  function clearFilters() {
    setPeriodIdx(0)
    setPlatformId('')
    setSelectedDays(new Set())
    setMinBuyIn('')
    setMaxBuyIn('')
  }

  function toggleDay(d: number) {
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  const filteredSessions = useMemo(() => {
    let s = [...initialSessions]

    // Period filter
    const period = PERIODS[periodIdx]
    const from = getDateRange(period.days)
    const to = getDateEnd(period.days)
    if (from) s = s.filter(x => new Date(x.played_at) >= from)
    if (to) s = s.filter(x => new Date(x.played_at) < to)

    // Platform filter
    if (platformId) s = s.filter(x => x.platform_id === platformId)

    // Day of week filter
    if (selectedDays.size > 0) {
      s = s.filter(x => selectedDays.has(new Date(x.played_at).getDay()))
    }

    // Buy-in range filter
    const minCents = minBuyIn ? Math.round(parseFloat(minBuyIn) * 100) : null
    const maxCents = maxBuyIn ? Math.round(parseFloat(maxBuyIn) * 100) : null
    if (minCents !== null) s = s.filter(x => x.buy_in_cents >= minCents)
    if (maxCents !== null) s = s.filter(x => x.buy_in_cents <= maxCents)

    return s
  }, [initialSessions, periodIdx, platformId, selectedDays, minBuyIn, maxBuyIn])

  const totalProfit = filteredSessions.reduce((a, s) => a + s.profit_cents, 0)
  const totalInvested = filteredSessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const totalMinutes = filteredSessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)
  const totalSessions = filteredSessions.length
  const isProfitable = totalProfit >= 0
  const roi = totalInvested > 0 ? ((totalProfit / totalInvested) * 100) : 0
  const hourlyRate = totalMinutes > 0 ? Math.round((totalProfit / totalMinutes) * 60) : 0

  const chartData = useMemo(() => {
    let cumulative = 0
    return [...filteredSessions]
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
      .map(s => {
        cumulative += s.profit_cents
        return {
          date: new Date(s.played_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          cumulative,
        }
      })
  }, [filteredSessions])

  const recentSessions = [...filteredSessions].reverse().slice(0, 20)

  const byGameType = useMemo(() => {
    const map: Record<string, { sessions: number; profit: number }> = {}
    for (const s of filteredSessions) {
      const key = s.game_type ?? 'Outros'
      if (!map[key]) map[key] = { sessions: 0, profit: 0 }
      map[key].sessions++
      map[key].profit += s.profit_cents
    }
    return Object.entries(map).sort((a, b) => b[1].sessions - a[1].sessions)
  }, [filteredSessions])

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Performance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Acompanhe sua evolução financeira nos torneios</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--red)]/40 text-[var(--red)] text-xs font-semibold hover:bg-[var(--red)]/10 transition-colors">
              <X size={12} /> Limpar filtros
            </button>
          )}
          <button onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors',
              showFilters || hasActiveFilter
                ? 'border-[var(--cyan)] bg-[var(--cyan)]/10 text-white'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:text-white'
            )}>
            <ChevronDown size={13} className={cn('transition-transform', showFilters && 'rotate-180')} />
            Filtros {hasActiveFilter ? '(ativo)' : ''}
          </button>
          <Link href="/performance/novo-torneio"
            className="flex items-center gap-2 bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> Novo Torneio
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          {/* Period */}
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Período</label>
            <div className="flex flex-wrap gap-1.5">
              {PERIODS.map((p, i) => (
                <button key={p.label}
                  onClick={() => setPeriodIdx(i)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    periodIdx === i
                      ? 'bg-[var(--cyan)]/15 border-[var(--cyan)] text-white'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hi)]'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Platform */}
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Plataforma</label>
              <select value={platformId} onChange={e => setPlatformId(e.target.value)} className={inputCls}>
                <option value="">Todas as plataformas</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Buy-in range */}
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Buy-in mínimo ($)</label>
              <input type="number" min="0" step="0.01" value={minBuyIn}
                onChange={e => setMinBuyIn(e.target.value)}
                placeholder="Ex: 5.00" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Buy-in máximo ($)</label>
              <input type="number" min="0" step="0.01" value={maxBuyIn}
                onChange={e => setMaxBuyIn(e.target.value)}
                placeholder="Ex: 100.00" className={inputCls} />
            </div>
          </div>

          {/* Day of week */}
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Dia da semana</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button key={d}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    selectedDays.has(i)
                      ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)]'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hi)]'
                  )}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Lucro Total"
          value={(isProfitable ? '+' : '') + formatCurrency(totalProfit)}
          positive={isProfitable}
          icon={isProfitable ? TrendingUp : TrendingDown} />
        <StatCard label="Torneios" value={String(totalSessions)} icon={Layers} />
        <StatCard label="ROI"
          value={(roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'}
          positive={roi >= 0}
          icon={Target} />
        <StatCard label="Taxa Horária"
          value={totalMinutes ? formatCurrency(Math.abs(hourlyRate)) + '/h' : '—'}
          positive={hourlyRate >= 0}
          icon={Clock} />
      </div>

      {/* P&L chart */}
      {chartData.length > 1 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Evolução do Resultado</h2>
          <PnLChart data={chartData} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session list */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              {hasActiveFilter ? `${totalSessions} torneio${totalSessions !== 1 ? 's' : ''} encontrado${totalSessions !== 1 ? 's' : ''}` : 'Últimos Torneios'}
            </h2>
            {totalSessions > 20 && (
              <span className="text-xs text-[var(--text-muted)]">+{totalSessions - 20} anteriores</span>
            )}
          </div>

          {!recentSessions.length ? (
            <div className="py-10 text-center">
              <p className="text-[var(--text-muted)] text-sm mb-3">
                {hasActiveFilter ? 'Nenhum torneio encontrado com os filtros atuais.' : 'Nenhum torneio registrado.'}
              </p>
              {!hasActiveFilter && (
                <Link href="/performance/novo-torneio" className="text-sm text-[var(--cyan)] hover:underline">
                  Registrar primeiro torneio →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-2 pb-2 border-b border-[var(--border)]">
                <span className="text-[11px] text-[var(--text-muted)] w-16">Data</span>
                <span className="text-[11px] text-[var(--text-muted)]">Detalhes</span>
                <span className="text-[11px] text-[var(--text-muted)] text-right">Buy-in</span>
                <span className="text-[11px] text-[var(--text-muted)] text-right w-20">Resultado</span>
              </div>
              {recentSessions.map(s => (
                <div key={s.id}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-2 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs text-[var(--text-muted)] w-16 tabular-nums">
                    {new Date(s.played_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">
                      {s.tournament_name ?? s.platform_name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {[s.platform_name, s.game_type].filter(Boolean).join(' · ')}
                      {s.is_live ? ' · 🎰 Live' : ''}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums text-right">
                    {formatCurrency(s.buy_in_cents)}
                  </span>
                  <span className={cn(
                    'text-xs font-bold tabular-nums text-right w-20',
                    s.profit_cents >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                  )}>
                    {s.profit_cents >= 0 ? '+' : ''}{formatCurrency(s.profit_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {byGameType.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Por Tipo de Jogo</h2>
              <div className="space-y-2">
                {byGameType.map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--foreground)]">{type}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{data.sessions} torneios</p>
                    </div>
                    <span className={cn(
                      'text-xs font-bold',
                      data.profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                    )}>
                      {data.profit >= 0 ? '+' : ''}{formatCurrency(data.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duration breakdown */}
          {totalMinutes > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Volume</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Tempo total</span>
                  <span className="text-xs font-bold text-white">{formatDuration(totalMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Total investido</span>
                  <span className="text-xs font-bold text-white">{formatCurrency(totalInvested)}</span>
                </div>
                {totalSessions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Lucro/torneio</span>
                    <span className={cn('text-xs font-bold', totalProfit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                      {formatCurrency(Math.round(totalProfit / totalSessions))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, positive, icon: Icon }: {
  label: string; value: string; positive?: boolean; icon: React.ElementType
}) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <Icon size={14} className="text-[var(--text-muted)]" />
      </div>
      <p className={cn(
        'text-xl font-bold',
        positive === true && 'text-[var(--green)]',
        positive === false && 'text-[var(--red)]',
        positive === undefined && 'text-[var(--foreground)]',
      )}>
        {value}
      </p>
    </div>
  )
}
