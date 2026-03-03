'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  itm?: boolean | null
  total_players?: number | null
}

interface EditTournamentModalProps {
  tournament: GrindTournament
  onSave: (updated: GrindTournament) => void
  onClose: () => void
}

export default function EditTournamentModal({ tournament, onSave, onClose }: EditTournamentModalProps) {
  const baseBuyIn = tournament.entries ? tournament.buy_in_cents / tournament.entries : tournament.buy_in_cents
  const [entries, setEntries] = useState(String(tournament.entries ?? 1))
  const [prize, setPrize] = useState(String(tournament.cash_out_cents / 100))
  const [position, setPosition] = useState(String(tournament.position ?? ''))
  const [totalPlayers, setTotalPlayers] = useState(String(tournament.total_players ?? ''))
  const [itm, setItm] = useState(tournament.itm ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-check ITM when prize > 0
  useEffect(() => {
    if (parseFloat(prize) > 0) setItm(true)
  }, [prize])

  const entriesInt = parseInt(entries) || 1
  const prizeVal = parseFloat(prize) || 0
  const profit = prizeVal - (baseBuyIn * entriesInt) / 100

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  async function handleSave() {
    setError(null)
    setLoading(true)

    const prizeCents = Math.round(prizeVal * 100)
    const res = await fetch(`/api/sessions/${tournament.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cash_out_cents: prizeCents,
        buy_in_cents: baseBuyIn * entriesInt,
        entries: entriesInt,
        position: position ? parseInt(position) : null,
        total_players: totalPlayers ? parseInt(totalPlayers) : null,
        itm,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ${res.status}`)
      return
    }

    onSave({
      ...tournament,
      cash_out_cents: prizeCents,
      buy_in_cents: baseBuyIn * entriesInt,
      entries: entriesInt,
      position: position ? parseInt(position) : null,
      total_players: totalPlayers ? parseInt(totalPlayers) : null,
      itm,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-white text-sm">Editar Torneio</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{tournament.tournament_name ?? tournament.game_type ?? 'Single'}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Re-entradas</label>
              <input type="number" min="1" step="1" value={entries}
                onChange={e => setEntries(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Prêmio ($)</label>
              <input type="number" min="0" step="0.01" value={prize}
                onChange={e => setPrize(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Posição</label>
              <input type="number" min="1" step="1" value={position}
                onChange={e => setPosition(e.target.value)} placeholder="Ex: 3" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Total jogadores</label>
              <input type="number" min="1" step="1" value={totalPlayers}
                onChange={e => setTotalPlayers(e.target.value)} placeholder="Ex: 450" className={inputCls} />
            </div>
          </div>

          <button type="button" onClick={() => setItm(v => !v)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors w-full',
              itm
                ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
            )}>
            <Trophy size={13} />
            <span>Fiquei ITM</span>
            <div className={cn(
              'ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              itm ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--border)]'
            )}>
              {itm && <div className="w-2 h-2 rounded-sm bg-black" />}
            </div>
          </button>

          {/* Preview */}
          <div className={cn(
            'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold',
            profit >= 0
              ? 'bg-[var(--green)]/8 border-[var(--green)]/20 text-[var(--green)]'
              : 'bg-[var(--red)]/8 border-[var(--red)]/20 text-[var(--red)]'
          )}>
            <span>Resultado</span>
            <span>{profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>
          </div>

          {error && (
            <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/8 px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--red)]">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
