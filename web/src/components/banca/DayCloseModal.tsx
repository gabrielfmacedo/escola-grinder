'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { X, CalendarCheck, Edit3 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Session = Database['public']['Views']['poker_session_results']['Row']

function fmt(cents: number, sign = false): string {
  const val = cents / 100
  const s = sign && val > 0 ? '+' : ''
  return s + '$' + Math.abs(val).toFixed(2)
}

export default function DayCloseModal({
  todaySessions,
  currentBancaAtual,
  onClose,
  onSuccess,
}: {
  todaySessions: Session[]
  currentBancaAtual: number
  onClose: () => void
  onSuccess: () => void
}) {
  const today = new Date().toISOString().split('T')[0]

  // Per-session adjusted cash_outs (for reconciliation)
  const [adjustedCashOuts, setAdjustedCashOuts] = useState<Record<string, string>>({})
  const [rakeback, setRakeback] = useState('')
  const [confirmedBalance, setConfirmedBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<string | null>(null)

  const rakebackCents = Math.round((parseFloat(rakeback) || 0) * 100)

  const todayProfit = useMemo(() => {
    return todaySessions.reduce((sum, s) => {
      const cashOut = adjustedCashOuts[s.id] !== undefined
        ? Math.round(parseFloat(adjustedCashOuts[s.id] || '0') * 100)
        : s.cash_out_cents
      return sum + (cashOut - s.buy_in_cents)
    }, 0)
  }, [todaySessions, adjustedCashOuts])

  const sessionRakeback = useMemo(() =>
    todaySessions.reduce((a, s) => a + (s.rakeback_cents ?? 0), 0),
    [todaySessions]
  )

  // Opening = bankroll atual - today's original activity
  const originalTodayProfit = todaySessions.reduce((a, s) => a + s.profit_cents, 0)
  const openingBankroll = currentBancaAtual - originalTodayProfit - sessionRakeback

  const expectedClosing = openingBankroll + todayProfit + sessionRakeback + rakebackCents
  const confirmedCents = confirmedBalance ? Math.round(parseFloat(confirmedBalance) * 100) : expectedClosing
  const divergence = confirmedCents - expectedClosing

  async function submit() {
    setError(null)

    // If sessions have adjusted cash_outs, PATCH them first
    const patchPromises = todaySessions
      .filter(s => adjustedCashOuts[s.id] !== undefined)
      .map(s => {
        const newCashOut = Math.round(parseFloat(adjustedCashOuts[s.id] || '0') * 100)
        return fetch(`/api/sessions/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cash_out_cents: newCashOut }),
        })
      })

    if (patchPromises.length > 0) {
      await Promise.all(patchPromises)
    }

    setLoading(true)
    const res = await fetch('/api/bankroll/day-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        closing_bankroll_cents: confirmedCents,
        rakeback_cents: rakebackCents,
        notes: notes || null,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ${res.status}`)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-[var(--gold)]" />
            <h2 className="font-bold text-[var(--foreground)]">Fechar Caixa do Dia</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--foreground)]">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Opening */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Banca de ontem</span>
            <span className="font-semibold text-[var(--foreground)]">{fmt(openingBankroll)}</span>
          </div>

          {/* Today sessions */}
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium mb-2">Torneios de hoje ({todaySessions.length})</p>
            <div className="space-y-1 rounded-xl border border-[var(--border)] overflow-hidden">
              {todaySessions.map(s => {
                const isEditing = editingSession === s.id
                const cashOutVal = adjustedCashOuts[s.id] !== undefined
                  ? adjustedCashOuts[s.id]
                  : (s.cash_out_cents / 100).toFixed(2)
                const cashOut = Math.round(parseFloat(cashOutVal || '0') * 100)
                const profit = cashOut - s.buy_in_cents

                return (
                  <div key={s.id} className="px-3 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--foreground)] truncate">{s.tournament_name ?? s.platform_name}</p>
                        <p className="text-xs text-[var(--text-muted)]">Buy-in: {fmt(s.buy_in_cents)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashOutVal}
                            onChange={e => setAdjustedCashOuts(prev => ({ ...prev, [s.id]: e.target.value }))}
                            onBlur={() => setEditingSession(null)}
                            autoFocus
                            className="w-24 bg-[var(--surface-1)] border border-[var(--cyan)] rounded px-2 py-1 text-sm text-right text-[var(--foreground)] focus:outline-none"
                          />
                        ) : (
                          <>
                            <span className={cn('text-sm font-semibold', profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                              {fmt(profit, true)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingSession(s.id)}
                              className="text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rakeback */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Rakeback Manual ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rakeback}
              onChange={e => setRakeback(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
          </div>

          {/* Expected closing */}
          <div className="bg-[var(--surface-2)] rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Lucro do dia</span>
              <span className={cn('font-semibold', todayProfit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                {fmt(todayProfit, true)}
              </span>
            </div>
            {rakebackCents > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rakeback</span>
                <span className="font-semibold text-[var(--gold)]">+{fmt(rakebackCents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-bold">
              <span className="text-[var(--foreground)]">Banca esperada</span>
              <span className="text-[var(--foreground)]">{fmt(expectedClosing)}</span>
            </div>
          </div>

          {/* Confirmed balance */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Saldo real confirmado ($)
              <span className="text-[var(--text-dim)] ml-1">(deixe em branco se concordar com o esperado)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={confirmedBalance}
              onChange={e => setConfirmedBalance(e.target.value)}
              placeholder={`${(expectedClosing / 100).toFixed(2)}`}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
            {divergence !== 0 && (
              <p className={cn('text-xs', divergence > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                Ajuste de {fmt(divergence, true)} será registrado automaticamente
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações do dia..."
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[var(--gold)] hover:opacity-90 text-black font-bold text-sm transition-opacity disabled:opacity-50"
          >
            {loading ? 'Fechando...' : 'Confirmar Fechamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
