'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import MiniPnLChart, { PeakPoint } from '@/components/banca/MiniPnLChart'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts'

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
  itm: boolean | null
}

interface Platform { id: string; name: string }

type SortCol = 'sessions' | 'roi' | 'invested' | 'cashout' | 'saldo'

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
  if (days === -1) { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
  if (days === -2) { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d }
  const d = new Date(); d.setDate(d.getDate() - days); return d
}

function getDateEnd(days: number): Date | null {
  if (days === -2) { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
  return null
}

function modalTitle(key: string): string {
  const titles: Record<string, string> = {
    saldo: 'Saldo por Sala', roi: 'ROI por Sala', buyin: 'Buy-in Total por Sala',
    lucro: 'Lucro por Sala', premio: 'Prêmios por Sala', volume: 'Volume por Sala',
    pertorneio: '$ por Torneio por Sala', itm: '% ITM por Sala',
    dias: 'Dias Jogados por Sala', buyin_medio: 'Buy-in Médio por Sala',
    melhordia: 'Melhor Dia', piordia: 'Pior Dia',
  }
  return titles[key] ?? key
}

function BreakdownModal({ title, rows, onClose }: {
  title: string
  rows: { label: string; value: string; color?: string }[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 min-w-[240px] max-w-sm mx-4 max-h-80 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-white mb-3 text-sm">{title}</h3>
        {rows.length === 0
          ? <p className="text-xs text-[var(--text-muted)]">Sem dados para exibir.</p>
          : rows.map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/40 last:border-0">
              <span className="text-xs text-[var(--text-muted)]">{r.label}</span>
              <span className="text-xs font-bold" style={{ color: r.color ?? 'var(--foreground)' }}>{r.value}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, positive, onClick }: {
  label: string
  value: string
  sub?: string
  positive?: boolean
  onClick?: () => void
}) {
  const valueColor = positive === true ? 'var(--green)' : positive === false ? 'var(--red)' : 'var(--foreground)'
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative group text-left bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 transition-all w-full',
        onClick && 'hover:border-[var(--border-hi)] cursor-pointer'
      )}
    >
      {onClick && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(230,48,48,0.04), transparent 60%)' }}
        />
      )}
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-medium mb-2">{label}</p>
      <p className="text-xl font-black" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-1">{sub}</p>}
      {onClick && (
        <p className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          ver por sala →
        </p>
      )}
    </button>
  )
}

function SmallStatCard({ label, value, color, sub }: {
  label: string
  value: string
  color?: string
  sub?: string
}) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-base font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PerformanceClient({
  initialSessions,
  platforms,
  platformBalances,
}: {
  initialSessions: Session[]
  platforms: Platform[]
  platformBalances: Record<string, number>
}) {
  const [periodIdx, setPeriodIdx] = useState(0)
  const [platformId, setPlatformId] = useState('')
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [minBuyIn, setMinBuyIn] = useState('')
  const [maxBuyIn, setMaxBuyIn] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>('sessions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const hasActiveFilter = periodIdx !== 0 || platformId !== '' || selectedDays.size > 0 || minBuyIn !== '' || maxBuyIn !== ''

  function clearFilters() {
    setPeriodIdx(0); setPlatformId(''); setSelectedDays(new Set()); setMinBuyIn(''); setMaxBuyIn('')
  }

  function toggleDay(d: number) {
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filteredSessions = useMemo(() => {
    let s = [...initialSessions]
    const period = PERIODS[periodIdx]
    const from = getDateRange(period.days)
    const to = getDateEnd(period.days)
    if (from) s = s.filter(x => new Date(x.played_at) >= from)
    if (to) s = s.filter(x => new Date(x.played_at) < to)
    if (platformId) s = s.filter(x => x.platform_id === platformId)
    if (selectedDays.size > 0) s = s.filter(x => selectedDays.has(new Date(x.played_at).getDay()))
    const minCents = minBuyIn ? Math.round(parseFloat(minBuyIn) * 100) : null
    const maxCents = maxBuyIn ? Math.round(parseFloat(maxBuyIn) * 100) : null
    if (minCents !== null) s = s.filter(x => x.buy_in_cents >= minCents)
    if (maxCents !== null) s = s.filter(x => x.buy_in_cents <= maxCents)
    return s
  }, [initialSessions, periodIdx, platformId, selectedDays, minBuyIn, maxBuyIn])

  // Core aggregates
  const {
    totalProfit, totalInvested, totalCashout, totalMinutes, totalSessions, itmCount,
  } = useMemo(() => ({
    totalProfit: filteredSessions.reduce((a, s) => a + s.profit_cents, 0),
    totalInvested: filteredSessions.reduce((a, s) => a + s.buy_in_cents, 0),
    totalCashout: filteredSessions.reduce((a, s) => a + s.cash_out_cents, 0),
    totalMinutes: filteredSessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
    totalSessions: filteredSessions.length,
    itmCount: filteredSessions.filter(s => s.itm).length,
  }), [filteredSessions])

  const totalSaldo = Object.values(platformBalances).reduce((a, b) => a + b, 0)
  const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const itmPct = totalSessions > 0 ? (itmCount / totalSessions) * 100 : 0
  const profitPerSession = totalSessions > 0 ? totalProfit / totalSessions : 0
  const hoursPlayed = totalMinutes / 60

  // By platform (for modals + table)
  const byPlatform = useMemo(() => {
    const map: Record<string, { id: string; name: string; sessions: number; profit: number; invested: number; cashout: number; itmCount: number; days: Set<string> }> = {}
    for (const s of filteredSessions) {
      if (!map[s.platform_id]) {
        map[s.platform_id] = { id: s.platform_id, name: s.platform_name, sessions: 0, profit: 0, invested: 0, cashout: 0, itmCount: 0, days: new Set() }
      }
      map[s.platform_id].sessions++
      map[s.platform_id].profit += s.profit_cents
      map[s.platform_id].invested += s.buy_in_cents
      map[s.platform_id].cashout += s.cash_out_cents
      if (s.itm) map[s.platform_id].itmCount++
      map[s.platform_id].days.add(s.played_at.slice(0, 10))
    }
    return Object.values(map)
  }, [filteredSessions])

  // Chart data + top-5 peaks
  const { chartData, peaks } = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
    let cumulative = 0
    const chartData = sorted.map((s, i) => { cumulative += s.profit_cents; return { value: cumulative, index: i } })
    const peaks: PeakPoint[] = [...sorted]
      .map((s, i) => ({ ...s, _idx: i }))
      .filter(s => s.cash_out_cents > 0)
      .sort((a, b) => b.cash_out_cents - a.cash_out_cents)
      .slice(0, 5)
      .map(s => ({ index: s._idx, tournament_name: s.tournament_name ?? s.platform_name, prize_cents: s.cash_out_cents, date: s.played_at, platform_name: s.platform_name }))
    return { chartData, peaks }
  }, [filteredSessions])

  // Unique days set
  const uniqueDaysSet = useMemo(() => new Set(filteredSessions.map(s => s.played_at.slice(0, 10))), [filteredSessions])
  const uniqueDays = uniqueDaysSet.size

  // By-date aggregates (dias up/down, best/worst day)
  const { diasUp, diasDown, bestDay, worstDay } = useMemo(() => {
    const map: Record<string, { profit: number; invested: number; cashout: number; date: string }> = {}
    for (const s of filteredSessions) {
      const d = s.played_at.slice(0, 10)
      if (!map[d]) map[d] = { profit: 0, invested: 0, cashout: 0, date: d }
      map[d].profit += s.profit_cents
      map[d].invested += s.buy_in_cents
      map[d].cashout += s.cash_out_cents
    }
    const entries = Object.values(map)
    const diasUp = entries.filter(e => e.profit > 0).length
    const diasDown = entries.filter(e => e.profit < 0).length
    const bestDay = entries.length ? entries.reduce((b, e) => e.profit > b.profit ? e : b, entries[0]) : null
    const worstDay = entries.length ? entries.reduce((b, e) => e.profit < b.profit ? e : b, entries[0]) : null
    return { diasUp, diasDown, bestDay, worstDay }
  }, [filteredSessions])

  // Streaks
  const { maxWinStreak, maxLoseStreak } = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
    let maxWin = 0, maxLose = 0, curWin = 0, curLose = 0
    for (const s of sorted) {
      if (s.profit_cents > 0) { curWin++; curLose = 0; maxWin = Math.max(maxWin, curWin) }
      else if (s.profit_cents < 0) { curLose++; curWin = 0; maxLose = Math.max(maxLose, curLose) }
      else { curWin = 0; curLose = 0 }
    }
    return { maxWinStreak: maxWin, maxLoseStreak: maxLose }
  }, [filteredSessions])

  // By day of week (for bar chart)
  const byDayOfWeek = useMemo(() => {
    const map: Record<number, { sessions: number; profit: number }> = {}
    for (const s of filteredSessions) {
      const d = new Date(s.played_at).getDay()
      if (!map[d]) map[d] = { sessions: 0, profit: 0 }
      map[d].sessions++
      map[d].profit += s.profit_cents
    }
    return DAYS.map((name, i) => ({ name, sessions: map[i]?.sessions ?? 0, profit: (map[i]?.profit ?? 0) / 100 })).filter(d => d.sessions > 0)
  }, [filteredSessions])

  // Sortable platform table
  const sortedByPlatform = useMemo(() => {
    return [...byPlatform].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      const aRoi = a.invested > 0 ? a.profit / a.invested : 0
      const bRoi = b.invested > 0 ? b.profit / b.invested : 0
      const aSaldo = platformBalances[a.id] ?? 0
      const bSaldo = platformBalances[b.id] ?? 0
      if (sortBy === 'sessions') return (a.sessions - b.sessions) * dir
      if (sortBy === 'roi') return (aRoi - bRoi) * dir
      if (sortBy === 'invested') return (a.invested - b.invested) * dir
      if (sortBy === 'cashout') return (a.cashout - b.cashout) * dir
      if (sortBy === 'saldo') return (aSaldo - bSaldo) * dir
      return 0
    })
  }, [byPlatform, sortBy, sortDir, platformBalances])

  // Derived scalar metrics
  const jogosPorDia = uniqueDays > 0 ? totalSessions / uniqueDays : 0
  const horasPorDia = uniqueDays > 0 ? hoursPlayed / uniqueDays : 0
  const profitPerHour = hoursPlayed > 0 ? totalProfit / hoursPlayed : 0
  const profitPerDay = uniqueDays > 0 ? totalProfit / uniqueDays : 0
  const avgBuyIn = totalSessions > 0 ? totalInvested / totalSessions : 0

  // Modal row builder
  function buildModalRows(key: string): { label: string; value: string; color?: string }[] {
    switch (key) {
      case 'saldo':
        return byPlatform.map(p => ({ label: p.name, value: formatCurrency(platformBalances[p.id] ?? 0), color: (platformBalances[p.id] ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }))
      case 'roi':
        return byPlatform.map(p => { const r = p.invested > 0 ? (p.profit / p.invested) * 100 : 0; return { label: p.name, value: `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`, color: r >= 0 ? 'var(--green)' : 'var(--red)' } })
      case 'buyin':
        return byPlatform.map(p => ({ label: p.name, value: formatCurrency(p.invested) }))
      case 'lucro':
        return byPlatform.map(p => ({ label: p.name, value: (p.profit >= 0 ? '+' : '') + formatCurrency(p.profit), color: p.profit >= 0 ? 'var(--green)' : 'var(--red)' }))
      case 'premio':
        return byPlatform.map(p => ({ label: p.name, value: formatCurrency(p.cashout) }))
      case 'volume':
        return byPlatform.map(p => ({ label: p.name, value: `${p.sessions} torneio${p.sessions !== 1 ? 's' : ''}` }))
      case 'pertorneio':
        return byPlatform.map(p => { const v = p.sessions > 0 ? p.profit / p.sessions : 0; return { label: p.name, value: (v >= 0 ? '+' : '') + formatCurrency(v), color: v >= 0 ? 'var(--green)' : 'var(--red)' } })
      case 'itm':
        return byPlatform.map(p => { const pct = p.sessions > 0 ? (p.itmCount / p.sessions) * 100 : 0; return { label: p.name, value: `${pct.toFixed(1)}%` } })
      case 'dias':
        return byPlatform.map(p => ({ label: p.name, value: `${p.days.size} dia${p.days.size !== 1 ? 's' : ''}` }))
      case 'buyin_medio':
        return byPlatform.map(p => { const avg = p.sessions > 0 ? p.invested / p.sessions : 0; return { label: p.name, value: formatCurrency(avg) } })
      case 'melhordia':
        if (!bestDay) return []
        return [
          { label: 'Data', value: new Date(bestDay.date).toLocaleDateString('pt-BR') },
          { label: 'Lucro', value: '+' + formatCurrency(bestDay.profit), color: 'var(--green)' },
          { label: 'Prêmios', value: formatCurrency(bestDay.cashout) },
          { label: 'ROI', value: bestDay.invested > 0 ? `+${((bestDay.profit / bestDay.invested) * 100).toFixed(1)}%` : '—', color: 'var(--green)' },
        ]
      case 'piordia':
        if (!worstDay) return []
        return [
          { label: 'Data', value: new Date(worstDay.date).toLocaleDateString('pt-BR') },
          { label: 'Lucro', value: formatCurrency(worstDay.profit), color: 'var(--red)' },
          { label: 'Investido', value: formatCurrency(worstDay.invested) },
        ]
      default:
        return []
    }
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  const barPlatformData = byPlatform.map(p => ({ name: p.name, profit: p.profit / 100 }))

  return (
    <div className="space-y-4">
      {/* Breakdown modal */}
      {modal && (
        <BreakdownModal title={modalTitle(modal)} rows={buildModalRows(modal)} onClose={() => setModal(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Performance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Análise completa dos seus torneios</p>
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
            Filtros{hasActiveFilter ? ' (ativo)' : ''}
          </button>
          <Link
            href="/performance/novo-torneio"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-black transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}
          >
            <Plus size={14} /> Novo Torneio
          </Link>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Período</label>
            <div className="flex flex-wrap gap-1.5">
              {PERIODS.map((p, i) => (
                <button key={p.label} onClick={() => setPeriodIdx(i)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    periodIdx === i
                      ? 'bg-[var(--cyan)]/15 border-[var(--cyan)] text-white'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hi)]')}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Plataforma</label>
              <select value={platformId} onChange={e => setPlatformId(e.target.value)} className={inputCls}>
                <option value="">Todas as plataformas</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Buy-in mínimo ($)</label>
              <input type="number" min="0" step="0.01" value={minBuyIn} onChange={e => setMinBuyIn(e.target.value)} placeholder="Ex: 5.00" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Buy-in máximo ($)</label>
              <input type="number" min="0" step="0.01" value={maxBuyIn} onChange={e => setMaxBuyIn(e.target.value)} placeholder="Ex: 100.00" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Dia da semana</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    selectedDays.has(i)
                      ? 'bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--gold)]'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hi)]')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Linha 1: SALDO TOTAL | ROI | BUY-IN TOTAL | LUCRO TOTAL ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="SALDO TOTAL"
          value={formatCurrency(totalSaldo)}
          sub="banca atual"
          positive={totalSaldo >= 0}
          onClick={() => setModal('saldo')}
        />
        <MetricCard
          label="ROI"
          value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
          positive={roi >= 0}
          onClick={() => setModal('roi')}
        />
        <MetricCard
          label="BUY-IN TOTAL"
          value={formatCurrency(totalInvested)}
          onClick={() => setModal('buyin')}
        />
        <MetricCard
          label="LUCRO TOTAL"
          value={`${totalProfit >= 0 ? '+' : ''}${formatCurrency(totalProfit)}`}
          positive={totalProfit >= 0}
          onClick={() => setModal('lucro')}
        />
      </div>

      {/* ── Linha 2: PRÊMIO TOTAL | VOLUME | $/TORNEIO | %ITM ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="PRÊMIO TOTAL"
          value={formatCurrency(totalCashout)}
          onClick={() => setModal('premio')}
        />
        <MetricCard
          label="VOLUME"
          value={String(totalSessions)}
          sub="torneios"
          onClick={() => setModal('volume')}
        />
        <MetricCard
          label="$ / TORNEIO"
          value={`${profitPerSession >= 0 ? '+' : ''}${formatCurrency(profitPerSession)}`}
          positive={profitPerSession >= 0}
          onClick={() => setModal('pertorneio')}
        />
        <MetricCard
          label="% ITM"
          value={`${itmPct.toFixed(1)}%`}
          onClick={() => setModal('itm')}
        />
      </div>

      {/* ── Linha 3: Gráfico 60% + [DIAS JOGADOS / BUY-IN MÉDIO] 40% ── */}
      {chartData.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="grid grid-cols-[60%_40%] gap-4 items-center">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">Evolução da Banca</p>
              <MiniPnLChart data={chartData} positive={totalProfit >= 0} peaks={peaks} height={160} />
            </div>
            <div className="flex flex-col gap-3">
              <MetricCard
                label="DIAS JOGADOS"
                value={String(uniqueDays)}
                onClick={() => setModal('dias')}
              />
              <MetricCard
                label="BUY-IN MÉDIO"
                value={formatCurrency(avgBuyIn)}
                onClick={() => setModal('buyin_medio')}
              />
            </div>
          </div>
        </div>
      )}

      {totalSessions > 0 && (
        <>
          {/* ── Linha 4: DIAS JOGADOS | JOGOS/DIA | HORAS JOGADAS | H/DIA | $/HORA ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SmallStatCard label="DIAS JOGADOS" value={String(uniqueDays)} />
            <SmallStatCard label="JOGOS / DIA" value={uniqueDays > 0 ? jogosPorDia.toFixed(1) : '—'} />
            <SmallStatCard
              label="HORAS JOGADAS"
              value={totalMinutes > 0 ? `${hoursPlayed.toFixed(1)}h` : '—'}
            />
            <SmallStatCard
              label="H / DIA"
              value={uniqueDays > 0 && totalMinutes > 0 ? `${horasPorDia.toFixed(1)}h` : '—'}
            />
            <SmallStatCard
              label="$ / HORA"
              value={hoursPlayed > 0 ? `${profitPerHour >= 0 ? '+' : ''}${formatCurrency(profitPerHour)}` : '—'}
              color={hoursPlayed > 0 ? (profitPerHour >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            />
          </div>

          {/* ── Linha 5: DIAS UP | $/DIA | MELHOR DIA | PIOR DIA ── */}
          {uniqueDays > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* DIAS UP com barra */}
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">DIAS UP</p>
                <p className="text-base font-bold text-[var(--green)]">
                  {diasUp}
                  <span className="text-xs text-[var(--text-muted)] font-normal"> / {uniqueDays}</span>
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--green)]"
                    style={{ width: `${Math.min(100, (diasUp / Math.max(1, uniqueDays)) * 100)}%` }}
                  />
                </div>
              </div>

              <SmallStatCard
                label="$ / DIA"
                value={`${profitPerDay >= 0 ? '+' : ''}${formatCurrency(profitPerDay)}`}
                color={profitPerDay >= 0 ? 'var(--green)' : 'var(--red)'}
              />

              <button
                onClick={() => setModal('melhordia')}
                className="group text-left bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--border-hi)] transition-all w-full"
              >
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">MELHOR DIA</p>
                <p className="text-base font-bold text-[var(--green)]">
                  {bestDay && bestDay.profit > 0 ? `+${formatCurrency(bestDay.profit)}` : '—'}
                </p>
                {bestDay && bestDay.profit > 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {new Date(bestDay.date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </button>

              <button
                onClick={() => setModal('piordia')}
                className="group text-left bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--border-hi)] transition-all w-full"
              >
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">PIOR DIA</p>
                <p className="text-base font-bold text-[var(--red)]">
                  {worstDay && worstDay.profit < 0 ? formatCurrency(worstDay.profit) : '—'}
                </p>
                {worstDay && worstDay.profit < 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {new Date(worstDay.date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </button>
            </div>
          )}

          {/* ── Linha 6: SEQ. VITÓRIAS | SEQ. DERROTAS | FIELD MÉDIO ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SmallStatCard
              label="SEQ. VITÓRIAS"
              value={maxWinStreak > 0 ? `${maxWinStreak} torneio${maxWinStreak !== 1 ? 's' : ''}` : '—'}
              color={maxWinStreak > 0 ? 'var(--green)' : undefined}
            />
            <SmallStatCard
              label="SEQ. DERROTAS"
              value={maxLoseStreak > 0 ? `${maxLoseStreak} torneio${maxLoseStreak !== 1 ? 's' : ''}` : '—'}
              color={maxLoseStreak > 0 ? 'var(--red)' : undefined}
            />
            <SmallStatCard
              label="FIELD MÉDIO"
              value="—"
              sub="requer campo total_players"
            />
          </div>

          {/* ── Linha 7: Bar charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {byPlatform.length > 0 && (
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Resultado por Sala</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barPlatformData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      formatter={(v: number | string) => [typeof v === 'number' ? `$${v.toFixed(2)}` : v, 'Lucro']}
                      contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {barPlatformData.map((r, i) => (
                        <Cell key={i} fill={r.profit >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {byDayOfWeek.length > 1 && (
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Lucro por Dia da Semana</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={byDayOfWeek} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      formatter={(v: number | string) => [typeof v === 'number' ? `$${v.toFixed(2)}` : v, 'Lucro']}
                      contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {byDayOfWeek.map((r, i) => (
                        <Cell key={i} fill={r.profit >= 0 ? 'var(--cyan)' : 'var(--red)'} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Linha 8: PERFORMANCE GERAL POR SALA (tabela sortable) ── */}
          {sortedByPlatform.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Performance Geral por Sala</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wide pb-2 pr-3">Sala</th>
                      {([
                        { col: 'sessions' as SortCol, label: 'Jogos' },
                        { col: 'roi' as SortCol, label: 'ROI' },
                        { col: 'invested' as SortCol, label: 'Buy-in Total' },
                        { col: 'cashout' as SortCol, label: 'Prêmios' },
                        { col: 'saldo' as SortCol, label: 'Saldo' },
                      ]).map(({ col, label }) => (
                        <th key={col} className="text-right pb-2 pr-3 last:pr-0">
                          <button
                            onClick={() => toggleSort(col)}
                            className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wide hover:text-white transition-colors ml-auto"
                          >
                            {label}
                            {sortBy === col ? (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />) : null}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByPlatform.map(r => {
                      const rRoi = r.invested > 0 ? (r.profit / r.invested) * 100 : 0
                      const saldo = platformBalances[r.id] ?? 0
                      return (
                        <tr key={r.id} className="border-b border-[var(--border)]/40 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-3 font-medium text-[var(--foreground)] truncate max-w-[120px]">{r.name}</td>
                          <td className="py-2.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{r.sessions}</td>
                          <td className={cn('py-2.5 pr-3 text-right tabular-nums font-bold', rRoi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                            {rRoi >= 0 ? '+' : ''}{rRoi.toFixed(1)}%
                          </td>
                          <td className="py-2.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{formatCurrency(r.invested)}</td>
                          <td className="py-2.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{formatCurrency(r.cashout)}</td>
                          <td className={cn('py-2.5 text-right tabular-nums font-bold', saldo >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                            {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {totalSessions === 0 && (
        <div className="py-16 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-3">
            {hasActiveFilter ? 'Nenhum torneio com os filtros atuais.' : 'Nenhum torneio registrado ainda.'}
          </p>
          {!hasActiveFilter && (
            <Link href="/performance/novo-torneio" className="text-sm text-[var(--cyan)] hover:underline">
              Registrar primeiro torneio →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
