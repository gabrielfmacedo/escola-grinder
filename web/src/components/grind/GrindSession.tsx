'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Plus, TrendingUp, TrendingDown, DollarSign, Target, XCircle, Loader2, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import TournamentForm from '@/components/performance/TournamentForm'
import GrindSingleForm from '@/components/grind/GrindSingleForm'
import type { GameType } from '@/lib/supabase/types'

interface GrindTournament {
  id: string
  played_at: string
  tournament_name: string | null
  game_type: GameType | null
  buy_in_cents: number
  cash_out_cents: number
  entries: number | null
  position: number | null
  platform_name: string
}

interface GrindSessionData {
  id: string
  started_at: string
  type: 'single' | 'mixed'
  platform_id: string | null
  game_type: GameType | null
  buy_in_cents: number | null
  tournament_name: string | null
  platform_name: string | null
}

interface Platform { id: string; name: string }

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const str = (abs / 100).toFixed(2)
  return (cents < 0 ? '-' : '') + '$' + str
}

export default function GrindSession({
  session,
  initialTournaments,
  platforms,
}: {
  session: GrindSessionData
  initialTournaments: GrindTournament[]
  platforms: Platform[]
}) {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<GrindTournament[]>(initialTournaments)
  const [showForm, setShowForm] = useState(false)
  const [ending, setEnding] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Live timer
  useEffect(() => {
    const startMs = new Date(session.started_at).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.started_at])

  const totalInvested = tournaments.reduce((s, t) => s + t.buy_in_cents, 0)
  const totalPrizes = tournaments.reduce((s, t) => s + t.cash_out_cents, 0)
  const totalProfit = totalPrizes - totalInvested
  const totalTournaments = tournaments.length

  const handleTournamentAdded = useCallback(() => {
    setShowForm(false)
    router.refresh()
    // Refetch tournaments via client-side
    fetch(`/api/grind/${session.id}/tournaments`)
      .then(r => r.json())
      .then(d => { if (d.tournaments) setTournaments(d.tournaments) })
      .catch(() => {})
  }, [session.id, router])

  async function handleEnd() {
    setEnding(true)
    const res = await fetch('/api/grind', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id }),
    })
    if (res.ok) {
      setSessionEnded(true)
      setEnding(false)
    } else {
      setEnding(false)
    }
  }

  const winRate = totalTournaments > 0
    ? Math.round((tournaments.filter(t => t.cash_out_cents > 0).length / totalTournaments) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header da sessão */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--green)] uppercase tracking-wide">Sessão Ativa</span>
            </div>
            <h1 className="text-lg font-black text-white">
              {session.type === 'single'
                ? (session.tournament_name ?? 'Single Buy-in')
                : 'Sessão Mista'}
            </h1>
            {session.platform_name && (
              <p className="text-xs text-[var(--text-muted)]">{session.platform_name}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-[var(--text-dim)]">
              <Clock size={14} />
              <span className="font-mono text-lg font-bold text-white">{formatElapsed(elapsed)}</span>
            </div>
          </div>
        </div>

        {/* Stats em linha */}
        <div className="grid grid-cols-4 gap-3">
          <StatMini
            label="Torneios"
            value={String(totalTournaments)}
            icon={Target}
          />
          <StatMini
            label="Investido"
            value={formatCents(totalInvested)}
            icon={DollarSign}
          />
          <StatMini
            label="Prêmios"
            value={formatCents(totalPrizes)}
            icon={DollarSign}
            positive
          />
          <StatMini
            label="Lucro"
            value={(totalProfit >= 0 ? '+' : '') + formatCents(totalProfit)}
            icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
            positive={totalProfit >= 0}
            negative={totalProfit < 0}
          />
        </div>
      </div>

      {/* Formulário inline para adicionar torneio */}
      {showForm ? (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">Registrar Torneio</h2>
            <button onClick={() => setShowForm(false)}
              className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
              <XCircle size={18} />
            </button>
          </div>
          {session.type === 'single' ? (
            <GrindSingleForm
              grindSessionId={session.id}
              platformId={session.platform_id}
              gameType={session.game_type}
              buyInCents={session.buy_in_cents}
              tournamentName={session.tournament_name}
              onSuccess={handleTournamentAdded}
            />
          ) : (
            <TournamentForm
              platforms={platforms}
              grindSessionId={session.id}
              onSuccess={handleTournamentAdded}
            />
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--cyan)]/50 hover:text-white transition-colors text-sm font-semibold"
        >
          <Plus size={16} /> Registrar mais um torneio
        </button>
      )}

      {/* Lista de torneios */}
      {tournaments.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-black text-white mb-3">
            Torneios ({totalTournaments})
          </h2>
          <div className="space-y-2">
            {[...tournaments].reverse().map((t, i) => {
              const profit = t.cash_out_cents - t.buy_in_cents
              return (
                <div key={t.id ?? i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {t.tournament_name ?? t.game_type ?? 'Torneio'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t.platform_name}
                      {t.entries && t.entries > 1 ? ` · ${t.entries}× buy-in` : ''}
                      {t.position ? ` · ${t.position}º lugar` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={cn('text-xs font-bold', profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                      {profit >= 0 ? '+' : ''}{formatCents(profit)}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">{formatCents(t.buy_in_cents)} buy-in</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Encerrar sessão */}
      {showEndConfirm ? (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black text-white">Relatório da Sessão</h2>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Duração', value: formatElapsed(elapsed) },
              { label: 'Torneios', value: String(totalTournaments) },
              { label: 'Total Investido', value: formatCents(totalInvested) },
              { label: 'Total em Prêmios', value: formatCents(totalPrizes) },
              { label: 'Win Rate', value: `${winRate}%` },
              { label: 'Lucro / Torneio', value: totalTournaments ? formatCents(Math.round(totalProfit / totalTournaments)) : '—' },
            ].map(item => (
              <div key={item.label} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Profit summary */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold',
            totalProfit >= 0
              ? 'bg-[var(--green)]/8 border-[var(--green)]/30 text-[var(--green)]'
              : 'bg-[var(--red)]/8 border-[var(--red)]/30 text-[var(--red)]'
          )}>
            <span>Resultado final</span>
            <span>{totalProfit >= 0 ? '+' : ''}{formatCents(totalProfit)}</span>
          </div>

          {sessionEnded ? (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-[var(--green)] font-semibold text-center">Sessão encerrada!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/banca')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/40 text-[var(--gold)] font-bold text-sm hover:bg-[var(--gold)]/20 transition-colors"
                >
                  <CalendarCheck size={14} /> Fechar Caixa
                </button>
                <button
                  onClick={() => { router.push('/performance'); router.refresh() }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors"
                >
                  Ver Performance
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
                Continuar jogando
              </button>
              <button onClick={handleEnd} disabled={ending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--red)]/15 border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)]/25 font-bold text-sm transition-colors disabled:opacity-50">
                {ending ? <Loader2 size={14} className="animate-spin" /> : null}
                {ending ? 'Encerrando...' : 'Confirmar Encerramento'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-dim)] mb-3">Encerrar Sessão</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Duração atual: {formatElapsed(elapsed)}.
            {totalTournaments > 0
              ? ` ${totalTournaments} torneio${totalTournaments !== 1 ? 's' : ''} registrado${totalTournaments !== 1 ? 's' : ''}.`
              : ' Nenhum torneio registrado ainda.'}
          </p>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)]/10 font-bold text-sm transition-colors"
          >
            Encerrar Sessão
          </button>
        </div>
      )}
    </div>
  )
}

function StatMini({
  label, value, icon: Icon, positive, negative,
}: {
  label: string
  value: string
  icon: React.ElementType
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 text-center">
      <Icon size={13} className={cn(
        'mx-auto mb-1',
        positive ? 'text-[var(--green)]' : negative ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'
      )} />
      <p className={cn(
        'text-sm font-black tabular-nums',
        positive ? 'text-[var(--green)]' : negative ? 'text-[var(--red)]' : 'text-white'
      )}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
    </div>
  )
}
