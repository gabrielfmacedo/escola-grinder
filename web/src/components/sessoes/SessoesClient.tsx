'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight, AlertTriangle, Trophy, CalendarDays, Layers, Shuffle, MapPin, Pencil } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface GrindSession {
  id: string
  started_at: string
  ended_at: string | null
  type: 'single' | 'mixed'
  platform_id: string | null
  platform_name: string | null
  game_type: string | null
  buy_in_cents: number | null
  tournament_name: string | null
  notes: string | null
}

interface Tournament {
  id: string
  grind_session_id: string | null
  platform_id: string
  platform_name: string
  played_at: string
  tournament_name: string | null
  game_type: string | null
  is_live: boolean | null
  buy_in_cents: number
  cash_out_cents: number
  profit_cents: number
  entries: number | null
  position: number | null
  itm: boolean | null
  duration_minutes: number | null
}

interface Platform { id: string; name: string }

type PeriodKey = 'week' | 'month' | 'lastMonth' | 'custom'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week',      label: 'Esta semana' },
  { key: 'month',     label: 'Este mês'    },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'custom',    label: 'Personalizado' },
]

function getRange(period: PeriodKey, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  if (period === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0)
    return { from, to: null }
  }
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from, to: null }
  }
  if (period === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from, to }
  }
  if (period === 'custom' && customFrom && customTo) {
    return {
      from: new Date(customFrom + 'T00:00:00'),
      to: new Date(customTo + 'T23:59:59'),
    }
  }
  return { from: null, to: null }
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SessoesClient({
  sessions,
  allTournaments,
  platforms,
  hasPendingClose,
}: {
  sessions: GrindSession[]
  allTournaments: Record<string, unknown>[]
  platforms: Platform[]
  hasPendingClose: boolean
}) {
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [platformId, setPlatformId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editTournament, setEditTournament] = useState<Tournament | null>(null)

  const tournaments = allTournaments as unknown as Tournament[]

  const { from, to } = getRange(period, customFrom, customTo)

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      const date = new Date(s.started_at)
      if (from && date < from) return false
      if (to && date > to) return false
      if (platformId && s.platform_id !== platformId) return false
      return true
    })
  }, [sessions, from, to, platformId])

  // Aggregate tournaments per session
  const sessionStats = useMemo(() => {
    const map: Record<string, {
      count: number; invested: number; cashout: number; profit: number; itmCount: number
    }> = {}
    for (const t of tournaments) {
      if (!t.grind_session_id) continue
      if (!map[t.grind_session_id]) map[t.grind_session_id] = { count: 0, invested: 0, cashout: 0, profit: 0, itmCount: 0 }
      map[t.grind_session_id].count++
      map[t.grind_session_id].invested += t.buy_in_cents
      map[t.grind_session_id].cashout += t.cash_out_cents
      map[t.grind_session_id].profit += t.profit_cents
      if (t.itm) map[t.grind_session_id].itmCount++
    }
    return map
  }, [tournaments])

  // Summary totals for filtered sessions
  const totals = useMemo(() => {
    let totalSessions = 0, totalTournaments = 0, totalProfit = 0, totalInvested = 0
    for (const s of filtered) {
      totalSessions++
      const stats = sessionStats[s.id]
      if (stats) {
        totalTournaments += stats.count
        totalProfit += stats.profit
        totalInvested += stats.invested
      }
    }
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
    return { totalSessions, totalTournaments, totalProfit, roi }
  }, [filtered, sessionStats])

  const selectedSession = selectedId ? sessions.find(s => s.id === selectedId) ?? null : null
  const selectedTournaments = selectedId ? tournaments.filter(t => t.grind_session_id === selectedId) : []

  const inputCls = cn(
    'bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs',
    'text-[var(--foreground)] focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Sessões</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Histórico das suas sessões de grind</p>
        </div>
        <Link
          href="/grind"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-black transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))' }}
        >
          Nova Sessão
        </Link>
      </div>

      {/* Pending day-close warning */}
      {hasPendingClose && (
        <Link
          href="/banca"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--gold)]/8 border border-[var(--gold)]/30 hover:bg-[var(--gold)]/12 transition-colors group"
        >
          <AlertTriangle size={15} className="text-[var(--gold)] shrink-0" />
          <p className="text-sm text-[var(--gold)] font-semibold flex-1">
            Você jogou hoje e ainda não fechou o caixa do dia.
          </p>
          <span className="text-xs text-[var(--gold)]/70 group-hover:text-[var(--gold)] transition-colors">
            Fechar caixa →
          </span>
        </Link>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period tabs */}
        <div className="flex gap-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p.key ? 'bg-[var(--surface-2)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
              )}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Platform select */}
        <select value={platformId} onChange={e => setPlatformId(e.target.value)} className={inputCls}>
          <option value="">Todas as salas</option>
          {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--text-muted)]">De</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inputCls} />
          <span className="text-xs text-[var(--text-muted)]">até</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inputCls} />
        </div>
      )}

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
          <span><span className="font-bold text-white">{totals.totalSessions}</span> sessão{totals.totalSessions !== 1 ? 'ões' : ''}</span>
          <span><span className="font-bold text-white">{totals.totalTournaments}</span> torneios</span>
          <span className={cn('font-bold', totals.totalProfit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
            {totals.totalProfit >= 0 ? '+' : ''}{formatCurrency(totals.totalProfit)}
          </span>
          <span>ROI: <span className={cn('font-bold', totals.roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>{totals.roi >= 0 ? '+' : ''}{totals.roi.toFixed(1)}%</span></span>
        </div>
      )}

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarDays size={24} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Nenhuma sessão encontrada neste período.</p>
          <Link href="/grind" className="text-xs text-[var(--cyan)] hover:underline mt-2 block">
            Iniciar nova sessão →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(session => {
            const stats = sessionStats[session.id] ?? { count: 0, invested: 0, cashout: 0, profit: 0, itmCount: 0 }
            const roi = stats.invested > 0 ? (stats.profit / stats.invested) * 100 : 0
            const itmPct = stats.count > 0 ? (stats.itmCount / stats.count) * 100 : 0
            const duration = formatDuration(session.started_at, session.ended_at)
            const isSelected = selectedId === session.id
            const isPendingToday = hasPendingClose && session.started_at.startsWith(new Date().toISOString().split('T')[0])

            return (
              <div key={session.id} className="overflow-hidden rounded-2xl">
                <button
                  onClick={() => setSelectedId(isSelected ? null : session.id)}
                  className={cn(
                    'w-full text-left p-4 border transition-all',
                    isSelected
                      ? 'bg-[var(--surface-2)] border-[var(--cyan)]/40 rounded-t-2xl rounded-b-none'
                      : 'bg-[var(--surface-1)] border-[var(--border)] rounded-2xl hover:border-[var(--border-hi)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Top row: platform + type + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-white truncate">
                          {session.platform_name ?? 'Plataforma desconhecida'}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
                          session.type === 'single'
                            ? 'bg-[var(--cyan)]/10 border-[var(--cyan)]/30 text-[var(--cyan)]'
                            : 'bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)]'
                        )}>
                          {session.type === 'single' ? <Layers size={9} /> : <Shuffle size={9} />}
                          {session.type === 'single' ? 'Single' : 'Misto'}
                        </span>
                        {session.game_type && session.type === 'single' && (
                          <span className="text-[10px] text-[var(--text-muted)] font-medium">{session.game_type}</span>
                        )}
                        {isPendingToday && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)]">
                            <AlertTriangle size={9} /> Caixa pendente
                          </span>
                        )}
                      </div>

                      {/* Date + duration */}
                      <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
                        {formatDate(session.started_at)} · {duration}
                      </p>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        <span className="text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-dim)]">{stats.count}</span> torneios
                        </span>
                        <span className="text-[var(--text-muted)]">
                          Buy-in: <span className="font-semibold text-[var(--text-dim)]">{formatCurrency(stats.invested)}</span>
                        </span>
                        <span className={cn('font-bold', stats.profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                          {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                        </span>
                        <span className={cn('text-[var(--text-muted)]')}>
                          ROI: <span className={cn('font-semibold', roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                            {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                          </span>
                        </span>
                        {stats.count > 0 && (
                          <span className="text-[var(--text-muted)]">
                            ITM: <span className="font-semibold text-[var(--gold)]">{itmPct.toFixed(0)}%</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      size={16}
                      className={cn('text-[var(--text-muted)] shrink-0 mt-1 transition-transform', isSelected && 'rotate-90')}
                    />
                  </div>
                </button>

                {/* Inline detail panel */}
                {isSelected && (
                  <SessionDetail
                    session={session}
                    stats={sessionStats[session.id] ?? { count: 0, invested: 0, cashout: 0, profit: 0, itmCount: 0 }}
                    tournaments={selectedTournaments}
                    platforms={platforms}
                    onClose={() => setSelectedId(null)}
                    onEditTournament={setEditTournament}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
      {editTournament && (
        <EditTournamentModal
          tournament={editTournament}
          platforms={platforms}
          onClose={() => setEditTournament(null)}
          onSuccess={() => { setEditTournament(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function SessionDetail({
  session,
  stats,
  tournaments,
  platforms,
  onClose,
  onEditTournament,
}: {
  session: GrindSession
  stats: { count: number; invested: number; cashout: number; profit: number; itmCount: number }
  tournaments: Tournament[]
  platforms: Platform[]
  onClose: () => void
  onEditTournament: (t: Tournament) => void
}) {
  const roi = stats.invested > 0 ? (stats.profit / stats.invested) * 100 : 0
  const itmPct = stats.count > 0 ? (stats.itmCount / stats.count) * 100 : 0
  const duration = formatDuration(session.started_at, session.ended_at)
  const profitPerTournament = stats.count > 0 ? stats.profit / stats.count : 0

  const metricRows = [
    { label: 'Torneios', value: String(stats.count) },
    { label: 'Duração', value: duration },
    { label: 'Total Investido', value: formatCurrency(stats.invested) },
    { label: 'Total em Prêmios', value: formatCurrency(stats.cashout) },
    { label: 'Lucro Total', value: (stats.profit >= 0 ? '+' : '') + formatCurrency(stats.profit), color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'ROI', value: (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%', color: roi >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'ITM', value: `${itmPct.toFixed(1)}% (${stats.itmCount}/${stats.count})`, color: 'var(--gold)' },
    { label: 'Lucro / Torneio', value: (profitPerTournament >= 0 ? '+' : '') + formatCurrency(profitPerTournament), color: profitPerTournament >= 0 ? 'var(--green)' : 'var(--red)' },
  ]

  return (
    <div className="bg-[var(--surface-2)] border border-[var(--cyan)]/40 border-t-0 rounded-b-2xl p-5 space-y-5">
      {/* Session header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">
              {session.tournament_name ?? (session.type === 'single' ? 'Single Buy-in' : 'Sessão Mista')}
            </p>
            {session.buy_in_cents && (
              <span className="text-xs text-[var(--text-muted)]">@ {formatCurrency(session.buy_in_cents)}</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {formatDate(session.started_at)}
            {session.ended_at && ` → ${new Date(session.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metricRows.map(m => (
          <div key={m.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{m.label}</p>
            <p className="text-sm font-bold" style={{ color: m.color ?? 'var(--foreground)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tournament list */}
      {tournaments.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wide mb-2">Torneios</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-2 pb-1.5 border-b border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)]">Torneio</span>
              <span className="text-[10px] text-[var(--text-muted)] text-right w-16">Buy-in</span>
              <span className="text-[10px] text-[var(--text-muted)] text-right w-16">Prêmio</span>
              <span className="text-[10px] text-[var(--text-muted)] text-right w-20">Resultado</span>
            </div>
            {tournaments.map((t, i) => (
              <div key={t.id ?? i} className="group grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--foreground)] truncate">
                    {t.tournament_name ?? t.game_type ?? 'Torneio'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{t.platform_name}</p>
                    {t.is_live && <MapPin size={9} className="text-[var(--gold)] shrink-0" />}
                    {t.itm && <Trophy size={9} className="text-[var(--gold)] shrink-0" />}
                    {t.entries && t.entries > 1 && (
                      <span className="text-[10px] text-[var(--text-muted)]">{t.entries}×</span>
                    )}
                    {t.position && (
                      <span className="text-[10px] text-[var(--text-muted)]">{t.position}º</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-16 text-right">
                  {formatCurrency(t.buy_in_cents)}
                </span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-16 text-right">
                  {t.cash_out_cents > 0 ? formatCurrency(t.cash_out_cents) : '—'}
                </span>
                <span className={cn('text-xs font-bold tabular-nums w-20 text-right', t.profit_cents >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                  {t.profit_cents >= 0 ? '+' : ''}{formatCurrency(t.profit_cents)}
                </span>
                <button
                  onClick={() => onEditTournament(t)}
                  title="Editar torneio"
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-all shrink-0"
                >
                  <Pencil size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tournaments.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] text-center py-2">Nenhum torneio registrado nesta sessão.</p>
      )}
    </div>
  )
}

// ── Edit Tournament Modal ────────────────────────────────────────────────────
function EditTournamentModal({ tournament, platforms, onClose, onSuccess }: {
  tournament: Tournament
  platforms: Platform[]
  onClose: () => void
  onSuccess: () => void
}) {
  const t = tournament
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    platform_id:     t.platform_id,
    played_at:       t.played_at,
    tournament_name: t.tournament_name ?? '',
    game_type:       t.game_type ?? 'MTT',
    is_live:         t.is_live ?? false,
    buy_in:          (t.buy_in_cents / 100).toFixed(2),
    cash_out:        (t.cash_out_cents / 100).toFixed(2),
    entries:         t.entries?.toString() ?? '',
    position:        t.position?.toString() ?? '',
    itm:             t.itm ?? false,
    duration:        t.duration_minutes?.toString() ?? '',
  })

  function set(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const buy_in_cents  = Math.round(parseFloat(form.buy_in)  * 100)
    const cash_out_cents = Math.round(parseFloat(form.cash_out) * 100)
    if (isNaN(buy_in_cents))  { setError('Buy-in inválido');  return }
    if (isNaN(cash_out_cents)) { setError('Prêmio inválido'); return }

    setLoading(true)
    const res = await fetch(`/api/sessions/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_id:     form.platform_id,
        played_at:       form.played_at,
        tournament_name: form.tournament_name || null,
        game_type:       form.game_type,
        is_live:         form.is_live,
        buy_in_cents,
        cash_out_cents,
        entries:         form.entries ? parseInt(form.entries) : null,
        position:        form.position ? parseInt(form.position) : null,
        itm:             form.itm,
        duration_minutes: form.duration ? parseInt(form.duration) : null,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ${res.status}`); return
    }
    onSuccess()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )
  const btnToggle = (active: boolean) => cn(
    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors',
    active
      ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-[var(--cyan)]'
      : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="font-bold text-[var(--foreground)]">Editar Torneio</h2>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--foreground)]"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Sala</label>
              <select value={form.platform_id} onChange={e => set('platform_id', e.target.value)} className={inputCls}>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Data</label>
              <input type="date" value={form.played_at} onChange={e => set('played_at', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Nome do Torneio</label>
            <input type="text" value={form.tournament_name} onChange={e => set('tournament_name', e.target.value)} placeholder="Ex: Sunday Special" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Tipo</label>
              <select value={form.game_type} onChange={e => set('game_type', e.target.value)} className={inputCls}>
                {['MTT', 'SNG', 'Spin&Go', 'Cash', 'Outros'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Duração (min)</label>
              <input type="number" min="0" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="Ex: 120" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Buy-in ($) *</label>
              <input type="number" min="0" step="0.01" value={form.buy_in} onChange={e => set('buy_in', e.target.value)} required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Prêmio ($)</label>
              <input type="number" min="0" step="0.01" value={form.cash_out} onChange={e => set('cash_out', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Entries</label>
              <input type="number" min="1" value={form.entries} onChange={e => set('entries', e.target.value)} placeholder="Ex: 500" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Posição</label>
              <input type="number" min="1" value={form.position} onChange={e => set('position', e.target.value)} placeholder="Ex: 12" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => set('is_live', !form.is_live)} className={btnToggle(form.is_live)}>
              🎰 Live
            </button>
            <button type="button" onClick={() => set('itm', !form.itm)} className={btnToggle(form.itm)}>
              <Trophy size={13} /> ITM
            </button>
            <div /> {/* spacer */}
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}
        </form>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:opacity-90 text-white font-bold text-sm transition-opacity disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
