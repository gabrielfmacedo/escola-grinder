'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PlayCircle, BookOpen, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import MiniPnLChart from '@/components/banca/MiniPnLChart'
import type { Database } from '@/lib/supabase/types'
import type { PeakPoint } from '@/components/banca/MiniPnLChart'

type Session = Database['public']['Views']['poker_session_results']['Row']

interface ContinueLesson {
  lessonId: string
  lessonTitle: string
  courseTitle: string
  courseSlug: string
}

interface NewLesson {
  id: string
  title: string
  courseTitle: string
  courseSlug: string
}

type ModalKey =
  | 'saldo' | 'roi' | 'buyin' | 'lucro'
  | 'premio' | 'volume' | 'pertorneio' | 'itm'
  | 'dias' | 'buyin_medio'

const PERIODS = [
  { key: '7d',   label: '7D',   days: 7   },
  { key: '30d',  label: '30D',  days: 30  },
  { key: '90d',  label: '90D',  days: 90  },
  { key: '365d', label: '365D', days: 365 },
  { key: 'all',  label: 'TUDO', days: 0   },
]

function fmt(cents: number, currency: 'usd' | 'brl'): string {
  const val = Math.abs(cents) / 100
  const converted = currency === 'brl' ? val * 5 : val
  const prefix = currency === 'brl' ? 'R$' : '$'
  return prefix + converted.toFixed(2)
}

export default function DashboardClient({
  allSessions,
  platformBalances,
  platforms,
  continueWatching,
  newLessons,
}: {
  allSessions: Session[]
  platformBalances: Record<string, number>
  platforms: { id: string; name: string }[]
  continueWatching: ContinueLesson[]
  newLessons: NewLesson[]
}) {
  const [period, setPeriod] = useState('30d')
  const [tab, setTab] = useState<'geral' | 'online' | 'live'>('geral')
  const [currency, setCurrency] = useState<'usd' | 'brl'>('usd')
  const [modal, setModal] = useState<ModalKey | null>(null)

  const hasLive = allSessions.some(s => s.is_live)

  const filtered = useMemo(() => {
    const p = PERIODS.find(p => p.key === period)!
    const cutoff = p.days > 0 ? new Date(Date.now() - p.days * 86400_000) : null
    return allSessions.filter(s => {
      if (cutoff && new Date(s.played_at) < cutoff) return false
      if (tab === 'online' && s.is_live) return false
      if (tab === 'live' && !s.is_live) return false
      return true
    })
  }, [allSessions, period, tab])

  // ── Métricas ─────────────────────────────────────────────
  const totalSessions  = filtered.length
  const totalInvested  = filtered.reduce((s, t) => s + t.buy_in_cents, 0)
  const totalProfit    = filtered.reduce((s, t) => s + t.profit_cents, 0)
  const totalPrize     = filtered.reduce((s, t) => s + t.cash_out_cents, 0)
  const roi            = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const profitPerSess  = totalSessions > 0 ? totalProfit / totalSessions : 0
  const itmCount       = filtered.filter(s => s.itm).length
  const itmPct         = totalSessions > 0 ? (itmCount / totalSessions) * 100 : 0
  const uniqueDays     = useMemo(() => new Set(filtered.map(s => s.played_at.slice(0, 10))).size, [filtered])
  const avgBuyIn       = totalSessions > 0 ? totalInvested / totalSessions : 0
  const totalSaldo     = Object.values(platformBalances).reduce((a, b) => a + b, 0)
  const isProfitable   = totalProfit >= 0

  // ── Breakdown por plataforma ─────────────────────────────
  const byPlatform = useMemo(() => {
    const map: Record<string, {
      name: string; sessions: number; profit: number
      invested: number; cashout: number; itmCount: number; days: Set<string>
    }> = {}
    for (const s of filtered) {
      const pid = s.platform_id
      if (!map[pid]) map[pid] = { name: s.platform_name, sessions: 0, profit: 0, invested: 0, cashout: 0, itmCount: 0, days: new Set() }
      map[pid].sessions++
      map[pid].profit   += s.profit_cents
      map[pid].invested += s.buy_in_cents
      map[pid].cashout  += s.cash_out_cents
      if (s.itm) map[pid].itmCount++
      map[pid].days.add(s.played_at.slice(0, 10))
    }
    return Object.values(map).sort((a, b) => b.sessions - a.sessions)
  }, [filtered])

  // ── Gráfico e peaks ──────────────────────────────────────
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.played_at.localeCompare(b.played_at)),
    [filtered]
  )

  const chartData = useMemo(() => {
    let cum = 0
    return sorted.map((s, i) => { cum += s.profit_cents; return { value: cum, index: i } })
  }, [sorted])

  const peaks = useMemo<PeakPoint[]>(() => {
    return [...filtered]
      .filter(s => s.cash_out_cents > 0)
      .sort((a, b) => b.cash_out_cents - a.cash_out_cents)
      .slice(0, 5)
      .map(s => {
        const idx = sorted.findIndex(r => r.id === s.id)
        return {
          index: idx,
          tournament_name: s.tournament_name ?? s.game_type ?? 'Torneio',
          prize_cents: s.cash_out_cents,
          date: s.played_at,
          platform_name: s.platform_name,
        }
      })
      .filter(p => p.index >= 0)
  }, [filtered, sorted])

  // ── Configuração dos modais ──────────────────────────────
  type ModalRow = { label: string; value: string; sub?: string; color?: string }
  const buildModalRows = (key: ModalKey): { title: string; rows: ModalRow[] } => {
    const bpList = byPlatform

    switch (key) {
      case 'saldo':
        return {
          title: 'Saldo por Sala',
          rows: platforms.length > 0
            ? platforms.map(p => {
                const bal = platformBalances[p.id] ?? 0
                return { label: p.name, value: fmt(Math.abs(bal), currency), color: bal >= 0 ? 'var(--green)' : 'var(--red)', sub: bal >= 0 ? 'positivo' : 'negativo' }
              })
            : [],
        }
      case 'roi':
        return {
          title: 'ROI por Sala',
          rows: bpList.map(p => {
            const r = p.invested > 0 ? (p.profit / p.invested) * 100 : 0
            return { label: p.name, value: (r >= 0 ? '+' : '') + r.toFixed(1) + '%', color: r >= 0 ? 'var(--green)' : 'var(--red)', sub: `${p.sessions} torneios` }
          }),
        }
      case 'buyin':
        return {
          title: 'Buy-in Total por Sala',
          rows: bpList.map(p => ({ label: p.name, value: fmt(p.invested, currency), sub: `${p.sessions} torneios` })),
        }
      case 'lucro':
        return {
          title: 'Lucro por Sala',
          rows: bpList.map(p => ({
            label: p.name,
            value: (p.profit >= 0 ? '+' : '-') + fmt(Math.abs(p.profit), currency),
            color: p.profit >= 0 ? 'var(--green)' : 'var(--red)',
            sub: `${p.sessions} torneios`,
          })),
        }
      case 'premio':
        return {
          title: 'Prêmio Total por Sala',
          rows: bpList.map(p => ({ label: p.name, value: fmt(p.cashout, currency), sub: `${p.sessions} torneios` })),
        }
      case 'volume':
        return {
          title: 'Volume por Sala',
          rows: bpList.map(p => ({ label: p.name, value: `${p.sessions} torneios`, sub: `${p.days.size} dias jogados` })),
        }
      case 'pertorneio': {
        return {
          title: '$ por Torneio por Sala',
          rows: bpList.map(p => {
            const ppt = p.sessions > 0 ? p.profit / p.sessions : 0
            return { label: p.name, value: (ppt >= 0 ? '+' : '-') + fmt(Math.abs(ppt), currency), color: ppt >= 0 ? 'var(--green)' : 'var(--red)' }
          }),
        }
      }
      case 'itm':
        return {
          title: '% ITM por Sala',
          rows: bpList.map(p => {
            const pct = p.sessions > 0 ? (p.itmCount / p.sessions) * 100 : 0
            return { label: p.name, value: pct.toFixed(1) + '%', sub: `${p.itmCount}/${p.sessions} torneios` }
          }),
        }
      case 'dias':
        return {
          title: 'Dias Jogados por Sala',
          rows: bpList.map(p => ({ label: p.name, value: `${p.days.size} dias`, sub: `${p.sessions} torneios` })),
        }
      case 'buyin_medio':
        return {
          title: 'Buy-in Médio por Sala',
          rows: bpList.map(p => {
            const avg = p.sessions > 0 ? p.invested / p.sessions : 0
            return { label: p.name, value: fmt(avg, currency), sub: `${p.sessions} torneios` }
          }),
        }
    }
  }

  const activeModal = modal ? buildModalRows(modal) : null

  return (
    <div className="space-y-4">

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-2.5">
        {/* Env tabs */}
        <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1">
          {(['geral', 'online', 'live'] as const).map(t => (
            <button key={t}
              disabled={t === 'live' && !hasLive}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all',
                tab === t
                  ? 'bg-[var(--surface-1)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-dim)] disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              {t === 'live' ? '🎰 Live' : t === 'online' ? '💻 Online' : '📊 Geral'}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {/* Period */}
          <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  period === p.key
                    ? 'bg-[var(--surface-1)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Currency */}
          <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1 ml-auto">
            {(['usd', 'brl'] as const).map(c => (
              <button key={c}
                onClick={() => setCurrency(c)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  currency === c
                    ? 'bg-[var(--cyan)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
                )}
              >
                {c === 'usd' ? '$ USD' : 'R$ BRL'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 1: SALDO TOTAL | ROI | BUY-IN TOTAL | LUCRO TOTAL ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="SALDO TOTAL"
          value={fmt(Math.abs(totalSaldo), currency)}
          color={totalSaldo >= 0 ? 'var(--green)' : 'var(--red)'}
          sub="banca atual"
          note="* não afetado pelo período"
          highlight={totalSaldo >= 0 ? 'green' : 'red'}
          onClick={() => setModal('saldo')}
        />
        <MetricCard
          label="ROI"
          value={(roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'}
          color={roi >= 0 ? 'var(--green)' : 'var(--red)'}
          sub="retorno s/ investido"
          highlight={roi >= 0 ? 'green' : 'red'}
          onClick={() => setModal('roi')}
        />
        <MetricCard
          label="BUY-IN TOTAL"
          value={fmt(totalInvested, currency)}
          color="var(--text-dim)"
          sub={`${totalSessions} torneios`}
          onClick={() => setModal('buyin')}
        />
        <MetricCard
          label="LUCRO TOTAL"
          value={(totalProfit >= 0 ? '+' : '-') + fmt(Math.abs(totalProfit), currency)}
          color={totalProfit >= 0 ? 'var(--green)' : 'var(--red)'}
          sub="lucro líquido"
          onClick={() => setModal('lucro')}
        />
      </div>

      {/* ── Row 2: PRÊMIO TOTAL | VOLUME | $/TORNEIO | % ITM ──────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="PRÊMIO TOTAL"
          value={fmt(totalPrize, currency)}
          color="var(--gold)"
          sub="total de cashouts"
          onClick={() => setModal('premio')}
        />
        <MetricCard
          label="VOLUME"
          value={String(totalSessions)}
          color="var(--text-dim)"
          sub="torneios jogados"
          onClick={() => setModal('volume')}
        />
        <MetricCard
          label="$ / TORNEIO"
          value={totalSessions > 0
            ? (profitPerSess >= 0 ? '+' : '-') + fmt(Math.abs(profitPerSess), currency)
            : '—'}
          color={profitPerSess >= 0 ? 'var(--green)' : 'var(--red)'}
          sub="lucro médio"
          onClick={() => setModal('pertorneio')}
        />
        <MetricCard
          label="% ITM"
          value={totalSessions > 0 ? itmPct.toFixed(1) + '%' : '—'}
          color="var(--gold)"
          sub={`${itmCount} no dinheiro`}
          onClick={() => setModal('itm')}
        />
      </div>

      {/* ── Gráfico 60% + métricas 40% ─────────────────────────── */}
      {chartData.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">Evolução da Banca</p>
            <Link href="/performance" className="text-xs text-[var(--cyan)] hover:underline font-medium">
              Ver performance →
            </Link>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '60% 1fr' }}>
            {/* Chart */}
            <MiniPnLChart data={chartData} positive={isProfitable} peaks={peaks} height={160} />

            {/* Right metrics */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setModal('dias')}
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-4 text-left hover:border-[var(--border-hi)] transition-colors group"
              >
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.18em] font-bold mb-2">Dias Jogados</p>
                <p className="text-2xl font-black text-white">{uniqueDays}</p>
                <p className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">por sala →</p>
              </button>
              <button
                onClick={() => setModal('buyin_medio')}
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-4 text-left hover:border-[var(--border-hi)] transition-colors group"
              >
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.18em] font-bold mb-2">Buy-in Médio</p>
                <p className="text-2xl font-black text-white">{fmt(avgBuyIn, currency)}</p>
                <p className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">por sala →</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Continue Assistindo + Novas Aulas ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Continue Assistindo */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <PlayCircle size={14} className="text-[var(--cyan)]" /> Continue Assistindo
            </p>
            <Link href="/conteudos" className="text-xs text-[var(--cyan)] hover:underline font-medium">Ver todos →</Link>
          </div>
          {continueWatching.length === 0 ? (
            <div className="text-center py-6">
              <PlayCircle size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Nenhuma aula em andamento.</p>
              <Link href="/conteudos" className="text-xs text-[var(--cyan)] hover:underline mt-1 block">
                Explorar conteúdo →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {continueWatching.map(l => (
                <Link key={l.lessonId} href={`/cursos/${l.courseSlug}/aula/${l.lessonId}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--cyan)]/30 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-[var(--cyan)]/10 flex items-center justify-center shrink-0">
                    <PlayCircle size={13} className="text-[var(--cyan)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[var(--cyan)] transition-colors">{l.lessonTitle}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{l.courseTitle}</p>
                  </div>
                  <ChevronRight size={12} className="text-[var(--text-muted)] shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Novas Aulas */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen size={14} className="text-[var(--gold)]" /> Novas Aulas
            </p>
            <Link href="/conteudos" className="text-xs text-[var(--cyan)] hover:underline font-medium">Ver todas →</Link>
          </div>
          {newLessons.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Nenhuma aula nova disponível.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {newLessons.map(l => (
                <Link key={l.id} href={`/cursos/${l.courseSlug}/aula/${l.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <BookOpen size={13} className="text-[var(--gold)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[var(--gold)] transition-colors">{l.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{l.courseTitle}</p>
                  </div>
                  <ChevronRight size={12} className="text-[var(--text-muted)] shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Breakdown Modal ──────────────────────────────────────── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-white text-sm">{activeModal.title}</h3>
              <button onClick={() => setModal(null)} className="text-[var(--text-dim)] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-0.5 max-h-80 overflow-y-auto">
              {activeModal.rows.length > 0 ? activeModal.rows.map(r => (
                <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-[var(--border)]/40 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    {r.sub && <p className="text-[11px] text-[var(--text-muted)]">{r.sub}</p>}
                  </div>
                  <span className="text-sm font-bold" style={{ color: r.color ?? 'var(--foreground)' }}>
                    {r.value}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">Sem dados no período.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label, value, color, sub, note, onClick, highlight,
}: {
  label: string
  value: string
  color: string
  sub?: string
  note?: string
  onClick?: () => void
  highlight?: 'green' | 'red'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl p-4 text-left group hover:border-opacity-60 transition-colors w-full',
        highlight === 'green'
          ? 'bg-[var(--green)]/8 border border-[var(--green)]/40'
          : highlight === 'red'
          ? 'bg-[var(--red)]/8 border border-[var(--red)]/40'
          : 'bg-[var(--surface-1)] border border-[var(--border)]'
      )}
    >
      <div
        className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-[0.12] group-hover:opacity-20 transition-opacity"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.18em] font-bold mb-2">{label}</p>
      <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{sub}</p>}
      {note && <p className="text-[9px] text-[var(--text-dim)] mt-0.5 opacity-60">{note}</p>}
      <p className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        ver por sala →
      </p>
    </button>
  )
}
