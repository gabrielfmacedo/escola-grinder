'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Target, Layers, ChevronRight, DollarSign, Zap, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import MiniPnLChart from '@/components/banca/MiniPnLChart'
import type { Database } from '@/lib/supabase/types'

type Session = Database['public']['Views']['poker_session_results']['Row']
type Course = { id: string; title: string; slug: string; required_plan: string }
type UpcomingEvent = { id: string; title: string; starts_at: string; type: string }

const PERIODS = [
  { label: '28 dias', days: 28 },
  { label: '3 meses', days: 90 },
  { label: '1 ano',   days: 365 },
  { label: 'Tudo',    days: 0 },
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Tab = 'geral' | 'online' | 'live'

function centsToDisplay(cents: number, currency: 'usd' | 'brl'): string {
  const val = Math.abs(cents) / 100
  const converted = currency === 'brl' ? val * 5 : val
  const sign = cents < 0 ? '-' : cents > 0 ? '+' : ''
  const prefix = currency === 'brl' ? 'R$' : '$'
  return sign + prefix + converted.toFixed(2)
}


const BUY_IN_RANGES = [
  { label: '≤$5',    min: 0,    max: 500  },
  { label: '$5-$10', min: 501,  max: 1000 },
  { label: '$10-$20',min: 1001, max: 2000 },
  { label: '$20-$50',min: 2001, max: 5000 },
  { label: '>$50',   min: 5001, max: Infinity },
]

const EVENT_TYPE_COLOR: Record<string, string> = {
  live_class:      'var(--cyan)',
  content_release: 'var(--green)',
  tournament:      'var(--gold)',
  other:           'var(--text-dim)',
}

export default function DashboardClient({
  allSessions,
  courses,
  upcomingEvents = [],
}: {
  allSessions: Session[]
  courses: Course[]
  upcomingEvents?: UpcomingEvent[]
}) {
  const [period, setPeriod] = useState(0) // index into PERIODS
  const [tab, setTab] = useState<Tab>('geral')
  const [currency, setCurrency] = useState<'usd' | 'brl'>('usd')
  const [breakdownTab, setBreakdownTab] = useState<'game' | 'day' | 'platform' | 'buyin'>('game')

  const hasLive = allSessions.some(s => s.is_live)

  const filtered = useMemo(() => {
    const days = PERIODS[period].days
    const cutoff = days > 0 ? new Date(Date.now() - days * 86400_000) : null
    return allSessions.filter(s => {
      if (cutoff && new Date(s.played_at) < cutoff) return false
      if (tab === 'online' && s.is_live) return false
      if (tab === 'live' && !s.is_live) return false
      return true
    })
  }, [allSessions, period, tab])

  const totalProfit = filtered.reduce((s, t) => s + t.profit_cents, 0)
  const totalInvested = filtered.reduce((s, t) => s + t.buy_in_cents, 0)
  const totalSessions = filtered.length
  const roi = totalInvested > 0 ? ((totalProfit / totalInvested) * 100) : 0
  const profitPerSession = totalSessions > 0 ? totalProfit / totalSessions : 0
  const isProfitable = totalProfit >= 0

  // Cumulative chart
  const chartData = useMemo(() => {
    let cum = 0
    return [...filtered]
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
      .map(s => { cum += s.profit_cents; return { value: cum } })
  }, [filtered])

  // Breakdowns
  const byGameType = useMemo(() => {
    const map: Record<string, { sessions: number; profit: number; invested: number }> = {}
    for (const s of filtered) {
      const k = s.game_type ?? 'Outros'
      if (!map[k]) map[k] = { sessions: 0, profit: 0, invested: 0 }
      map[k].sessions++
      map[k].profit += s.profit_cents
      map[k].invested += s.buy_in_cents
    }
    return Object.entries(map).sort((a, b) => b[1].sessions - a[1].sessions)
  }, [filtered])

  const byDay = useMemo(() => {
    const map: Record<number, { sessions: number; profit: number }> = {}
    for (const s of filtered) {
      const d = new Date(s.played_at).getDay()
      if (!map[d]) map[d] = { sessions: 0, profit: 0 }
      map[d].sessions++
      map[d].profit += s.profit_cents
    }
    return Object.entries(map)
      .map(([d, v]) => ({ day: DAY_NAMES[+d], ...v }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [filtered])

  const byPlatform = useMemo(() => {
    const map: Record<string, { sessions: number; profit: number }> = {}
    for (const s of filtered) {
      const k = s.platform_name ?? 'Outros'
      if (!map[k]) map[k] = { sessions: 0, profit: 0 }
      map[k].sessions++
      map[k].profit += s.profit_cents
    }
    return Object.entries(map).sort((a, b) => b[1].sessions - a[1].sessions)
  }, [filtered])

  const byBuyin = useMemo(() => {
    return BUY_IN_RANGES
      .map(range => {
        const sessions = filtered.filter(s => s.buy_in_cents >= range.min && s.buy_in_cents <= range.max)
        if (!sessions.length) return null
        const profit = sessions.reduce((s, t) => s + t.profit_cents, 0)
        return { label: range.label, sessions: sessions.length, profit }
      })
      .filter(Boolean) as { label: string; sessions: number; profit: number }[]
  }, [filtered])

  const recentSessions = useMemo(() =>
    [...filtered]
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
      .slice(0, 5),
    [filtered]
  )

  return (
    <div className="space-y-5">

      {/* ── Controls: period + tabs + currency ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Context tabs */}
        <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-1">
          {(['geral', 'online', 'live'] as Tab[]).map(t => (
            <button key={t}
              disabled={t === 'live' && !hasLive}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all',
                tab === t
                  ? 'bg-[var(--surface-1)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-dim)] disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              {t === 'live' ? '🎰 Live' : t === 'online' ? '💻 Online' : '📊 Geral'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-1">
            {PERIODS.map((p, i) => (
              <button key={p.label}
                onClick={() => setPeriod(i)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                  period === i
                    ? 'bg-[var(--surface-1)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Currency toggle */}
          <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-1">
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
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Lucro Total"
          value={centsToDisplay(totalProfit, currency)}
          positive={isProfitable}
          accent={isProfitable ? 'var(--green)' : 'var(--red)'}
          icon={isProfitable ? TrendingUp : TrendingDown}
          sub={`${totalSessions} torneios`}
        />
        <StatCard
          label="ROI"
          value={(roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'}
          positive={roi >= 0}
          accent={roi >= 0 ? 'var(--cyan)' : 'var(--red)'}
          icon={Target}
          sub="retorno sobre investido"
        />
        <StatCard
          label="Torneios"
          value={String(totalSessions)}
          accent="var(--gold)"
          icon={Layers}
          sub={PERIODS[period].days > 0 ? `últimos ${PERIODS[period].label}` : 'total'}
        />
        <StatCard
          label="Por torneio"
          value={totalSessions > 0 ? centsToDisplay(profitPerSession, currency) : '—'}
          positive={profitPerSession >= 0}
          accent={profitPerSession >= 0 ? 'var(--green)' : 'var(--red)'}
          icon={DollarSign}
          sub="lucro médio"
        />
      </div>

      {/* ── Corpo ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Coluna esquerda: chart + últimas sessões */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {chartData.length > 1 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">Evolução do resultado</p>
                <Link href="/performance" className="text-xs text-[var(--cyan)] hover:underline font-medium">
                  Ver performance →
                </Link>
              </div>
              <MiniPnLChart data={chartData} positive={isProfitable} />
            </div>
          )}

          {/* Últimos torneios */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">Últimos torneios</p>
              <Link href="/performance" className="text-xs text-[var(--cyan)] hover:underline font-medium">
                Ver todos →
              </Link>
            </div>

            {!recentSessions.length ? (
              <div className="text-center py-8">
                <TrendingUp size={20} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Nenhum torneio no período.</p>
                <Link href="/performance/novo-torneio" className="text-xs text-[var(--cyan)] hover:underline mt-1 block">
                  Registrar torneio →
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentSessions.map(s => (
                  <div key={s.id}
                    className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {s.tournament_name ?? s.platform_name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {[s.platform_name, s.game_type].filter(Boolean).join(' · ')} ·{' '}
                        {new Date(s.played_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {s.is_live ? ' · Live' : ''}
                      </p>
                    </div>
                    <span className={cn(
                      'text-sm font-black tabular-nums shrink-0 ml-4',
                      s.profit_cents >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                    )}>
                      {centsToDisplay(s.profit_cents, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breakdowns */}
          {filtered.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {[
                  { key: 'game',     label: 'Tipo de Jogo' },
                  { key: 'day',      label: 'Dia da Semana' },
                  { key: 'platform', label: 'Plataforma' },
                  { key: 'buyin',    label: 'Buy-in' },
                ].map(b => (
                  <button key={b.key}
                    onClick={() => setBreakdownTab(b.key as typeof breakdownTab)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      breakdownTab === b.key
                        ? 'bg-[var(--surface-3)] text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <BreakdownTable
                rows={
                  breakdownTab === 'game'     ? byGameType.map(([k, v]) => ({ label: k, ...v })) :
                  breakdownTab === 'day'      ? byDay.map(d => ({ label: d.day, sessions: d.sessions, profit: d.profit })) :
                  breakdownTab === 'platform' ? byPlatform.map(([k, v]) => ({ label: k, ...v })) :
                  byBuyin.map(b => ({ label: b.label, sessions: b.sessions, profit: b.profit }))
                }
                currency={currency}
              />
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Próximos eventos */}
          {upcomingEvents.length > 0 && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays size={14} className="text-[var(--gold)]" /> Próximos Eventos
                </p>
                <Link href="/calendario" className="text-xs text-[var(--cyan)] hover:underline font-medium">Ver todos →</Link>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: EVENT_TYPE_COLOR[evt.type] ?? 'var(--text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{evt.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {new Date(evt.starts_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' às '}
                        {new Date(evt.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdos */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={14} className="text-[var(--cyan)]" /> Conteúdos
              </p>
              <Link href="/conteudos" className="text-xs text-[var(--cyan)] hover:underline font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {courses.map(c => (
                <Link key={c.id} href={`/cursos/${c.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--cyan)]/30 hover:bg-[var(--surface-3)] transition-all group">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[var(--cyan)] transition-colors">
                      {c.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] capitalize mt-0.5">{c.required_plan}</p>
                  </div>
                  <ChevronRight size={13} className="text-[var(--text-muted)] shrink-0 ml-2 group-hover:text-[var(--cyan)] transition-colors" />
                </Link>
              ))}
              {!courses.length && (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">Nenhum curso publicado.</p>
              )}
            </div>
          </div>

          {/* Acesso rápido */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-3">Acesso rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/performance/novo-torneio', label: 'Novo Torneio', accent: 'var(--cyan)' },
                { href: '/grind',                    label: 'Modo Grind',   accent: 'var(--gold)' },
                { href: '/performance',              label: 'Performance',  accent: 'var(--green)' },
                { href: '/ranking',                  label: 'Ranking',      accent: 'var(--blue)' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5',
                    item.href === '/grind' && 'col-span-2'
                  )}
                  style={{
                    background: `color-mix(in srgb, ${item.accent} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${item.accent} 20%, transparent)`,
                    color: item.accent,
                  }}
                >
                  {item.href === '/grind' && <Zap size={12} />}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, positive, accent, icon: Icon, sub }: {
  label: string; value: string; positive?: boolean
  accent: string; icon: React.ElementType; sub?: string
}) {
  return (
    <div className="relative overflow-hidden bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 group hover:border-opacity-50 transition-colors">
      <div className="pointer-events-none absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-25"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
      <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.14em] font-bold">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <p className={cn('text-xl font-black',
        positive === true && 'text-[var(--green)]',
        positive === false && 'text-[var(--red)]',
        positive === undefined && 'text-white'
      )}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

function BreakdownTable({
  rows,
  currency,
}: {
  rows: { label: string; sessions: number; profit: number }[]
  currency: 'usd' | 'brl'
}) {
  if (!rows.length) return <p className="text-xs text-[var(--text-muted)] text-center py-4">Sem dados no período.</p>
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="flex items-center justify-between py-1.5">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)]">{r.label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{r.sessions} torneio{r.sessions !== 1 ? 's' : ''}</p>
          </div>
          <span className={cn(
            'text-xs font-bold tabular-nums',
            r.profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
          )}>
            {centsToDisplay(r.profit, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}
