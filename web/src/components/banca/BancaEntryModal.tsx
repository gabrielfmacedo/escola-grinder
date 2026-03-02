'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BankrollEntryType } from '@/lib/supabase/types'
import { X } from 'lucide-react'

const TYPES: { value: BankrollEntryType; label: string; desc: string }[] = [
  { value: 'initial',    label: 'Banca Inicial', desc: 'Saldo que já tinha antes de começar a registrar' },
  { value: 'deposit',    label: 'Depósito',      desc: 'Novo aporte na banca' },
  { value: 'withdrawal', label: 'Saque',         desc: 'Valor retirado da banca' },
  { value: 'rakeback',   label: 'Rakeback',      desc: 'Rakeback recebido da plataforma' },
  { value: 'adjustment', label: 'Ajuste',        desc: 'Correção manual de saldo' },
]

interface Platform { id: string; name: string }

export default function BancaEntryModal({
  platforms,
  defaultType = 'deposit',
  onClose,
  onSuccess,
}: {
  platforms: Platform[]
  defaultType?: BankrollEntryType
  onClose: () => void
  onSuccess: () => void
}) {
  const [type, setType] = useState<BankrollEntryType>(defaultType)
  const [amount, setAmount] = useState('')
  const [platformId, setPlatformId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents === 0) {
      setError('Valor inválido')
      return
    }

    // Withdrawals are stored as positive values; sign is applied by the UI/API logic
    const finalCents = type === 'withdrawal' ? Math.abs(amountCents) : amountCents

    setLoading(true)
    const res = await fetch('/api/bankroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount_cents: finalCents,
        platform_id: platformId || null,
        date,
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

  const selectedType = TYPES.find(t => t.value === type)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-[var(--foreground)]">Nova Entrada de Bankroll</h2>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl border text-xs font-semibold transition-colors text-left',
                    type === t.value
                      ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {selectedType && (
              <p className="text-xs text-[var(--text-muted)] mt-2">{selectedType.desc}</p>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Valor ($) <span className="text-[var(--red)]">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
          </div>

          {/* Platform (optional) */}
          {platforms.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Plataforma (opcional)</label>
              <select
                value={platformId}
                onChange={e => setPlatformId(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--cyan)]/60 [&_option]:bg-[var(--surface-2)]"
              >
                <option value="">— Global (sem plataforma) —</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observação opcional..."
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
            />
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
