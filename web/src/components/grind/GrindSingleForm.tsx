'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameType } from '@/lib/supabase/types'

interface GrindSingleFormProps {
  grindSessionId: string
  platformId: string | null
  gameType: GameType | null
  buyInCents: number | null
  tournamentName: string | null
  onSuccess: () => void
}

export default function GrindSingleForm({
  grindSessionId,
  platformId,
  gameType,
  buyInCents,
  tournamentName,
  onSuccess,
}: GrindSingleFormProps) {
  const [entries, setEntries] = useState('1')
  const [prize, setPrize] = useState('')
  const [position, setPosition] = useState('')
  const [totalPlayers, setTotalPlayers] = useState('')
  const [itm, setItm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-check ITM when prize > 0
  useEffect(() => {
    if (parseFloat(prize) > 0) setItm(true)
  }, [prize])

  const baseBuyIn = buyInCents ?? 0
  const totalBuyIn = baseBuyIn * (parseInt(entries) || 1)
  const prizeValue = parseFloat(prize) || 0
  const profit = prizeValue - totalBuyIn / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!platformId) {
      setError('Plataforma não identificada. Encerre e inicie uma nova sessão.')
      return
    }

    const entriesInt = parseInt(entries) || 1
    const prizeCents = prize ? Math.round(parseFloat(prize) * 100) : 0

    setLoading(true)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_id: platformId,
        played_at: new Date().toISOString().split('T')[0],
        game_type: gameType,
        tournament_name: tournamentName,
        is_live: false,
        buy_in_cents: baseBuyIn * entriesInt,
        cash_out_cents: prizeCents,
        entries: entriesInt,
        position: position ? parseInt(position) : null,
        total_players: totalPlayers ? parseInt(totalPlayers) : null,
        grind_session_id: grindSessionId,
        itm,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ao registrar (${res.status})`)
      return
    }

    setEntries('1')
    setPrize('')
    setPosition('')
    setTotalPlayers('')
    setItm(false)
    onSuccess()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info do torneio pré-configurado */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{tournamentName ?? gameType ?? 'Single Buy-in'}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Buy-in: ${(baseBuyIn / 100).toFixed(2)} por entrada
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-muted)] font-medium">Re-entradas</label>
          <input
            type="number" min="1" step="1"
            value={entries}
            onChange={e => setEntries(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-muted)] font-medium">Prêmio ($)</label>
          <input
            type="number" min="0" step="0.01"
            value={prize}
            onChange={e => setPrize(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-muted)] font-medium">Posição final</label>
          <input
            type="number" min="1" step="1"
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="Ex: 3"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-muted)] font-medium">Total jogadores</label>
          <input
            type="number" min="1" step="1"
            value={totalPlayers}
            onChange={e => setTotalPlayers(e.target.value)}
            placeholder="Ex: 450"
            className={inputCls}
          />
        </div>
      </div>

      {/* ITM */}
      <button
        type="button"
        onClick={() => setItm(v => !v)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors w-full',
          itm
            ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
            : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
        )}
      >
        <Trophy size={13} />
        <span>Fiquei ITM</span>
        <div className={cn(
          'ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
          itm ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--border)]'
        )}>
          {itm && <div className="w-2 h-2 rounded-sm bg-black" />}
        </div>
      </button>

      {/* Preview resultado */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold',
        profit >= 0
          ? 'bg-[var(--green)]/8 border-[var(--green)]/20 text-[var(--green)]'
          : 'bg-[var(--red)]/8 border-[var(--red)]/20 text-[var(--red)]'
      )}>
        <span>
          Resultado
          {parseInt(entries) > 1 && (
            <span className="font-normal text-[var(--text-muted)] ml-1.5 text-xs">
              ({entries}× ${(baseBuyIn / 100).toFixed(2)})
            </span>
          )}
        </span>
        <span>{profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/8 px-3 py-2.5">
          <p className="text-sm font-medium text-[var(--red)]">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Registrando...' : 'Registrar'}
      </button>
    </form>
  )
}
