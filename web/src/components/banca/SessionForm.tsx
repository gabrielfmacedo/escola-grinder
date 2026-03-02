'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { GameType } from '@/lib/supabase/types'

interface Platform { id: string; name: string }

const GAME_TYPES: GameType[] = ['MTT', 'Cash', 'Spin&Go', 'SNG', 'Outros']

export default function SessionForm({ platforms }: { platforms: Platform[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    platform_id: platforms[0]?.id ?? '',
    played_at: new Date().toISOString().split('T')[0],
    game_type: 'MTT' as GameType,
    stakes: '',
    buy_in: '',
    cash_out: '',
    rakeback: '',
    duration_hours: '',
    duration_minutes: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const buyIn = Math.round(parseFloat(form.buy_in) * 100)
    const cashOut = Math.round(parseFloat(form.cash_out) * 100)

    if (isNaN(buyIn) || buyIn < 0) { setError('Buy-in inválido.'); return }
    if (isNaN(cashOut) || cashOut < 0) { setError('Cash-out inválido.'); return }

    const rakeback = form.rakeback ? Math.round(parseFloat(form.rakeback) * 100) : 0
    const durationH = parseInt(form.duration_hours) || 0
    const durationM = parseInt(form.duration_minutes) || 0
    const totalMinutes = durationH * 60 + durationM

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: dbError } = await supabase.from('poker_sessions').insert({
      user_id: user!.id,
      platform_id: form.platform_id,
      played_at: form.played_at,
      game_type: form.game_type,
      stakes: form.stakes || null,
      buy_in_cents: buyIn,
      cash_out_cents: cashOut,
      rakeback_cents: rakeback || null,
      duration_minutes: totalMinutes || null,
      notes: form.notes || null,
    })

    setLoading(false)
    if (dbError) { setError(dbError.message); return }

    router.push('/banca')
    router.refresh()
  }

  const profit = (parseFloat(form.cash_out) || 0) + (parseFloat(form.rakeback) || 0) - (parseFloat(form.buy_in) || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Linha 1: Data + Plataforma + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Data">
          <input type="date" value={form.played_at} onChange={e => set('played_at', e.target.value)}
            required className={input()} />
        </Field>
        <Field label="Plataforma">
          <select value={form.platform_id} onChange={e => set('platform_id', e.target.value)}
            required className={input()}>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Tipo de jogo">
          <select value={form.game_type} onChange={e => set('game_type', e.target.value as GameType)}
            className={input()}>
            {GAME_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      {/* Linha 2: Stakes */}
      <Field label="Stakes / Torneio">
        <input type="text" value={form.stakes} onChange={e => set('stakes', e.target.value)}
          placeholder='ex: NL5 · $5.50 MTT · $11 PKO'
          className={input()} />
      </Field>

      {/* Linha 3: Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Buy-in (R$)" required>
          <input type="number" min="0" step="0.01" value={form.buy_in}
            onChange={e => set('buy_in', e.target.value)}
            placeholder="0,00" required className={input()} />
        </Field>
        <Field label="Cash-out (R$)" required>
          <input type="number" min="0" step="0.01" value={form.cash_out}
            onChange={e => set('cash_out', e.target.value)}
            placeholder="0,00" required className={input()} />
        </Field>
        <Field label="Rakeback (R$)">
          <input type="number" min="0" step="0.01" value={form.rakeback}
            onChange={e => set('rakeback', e.target.value)}
            placeholder="0,00" className={input()} />
        </Field>
      </div>

      {/* Preview do resultado */}
      {form.buy_in && form.cash_out && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold',
          profit >= 0
            ? 'bg-[var(--green)]/8 border-[var(--green)]/20 text-[var(--green)]'
            : 'bg-[var(--red)]/8 border-[var(--red)]/20 text-[var(--red)]'
        )}>
          <span>Resultado desta sessão</span>
          <span>{profit >= 0 ? '+' : ''}R$ {profit.toFixed(2).replace('.', ',')}</span>
        </div>
      )}

      {/* Linha 4: Duração */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Horas">
          <input type="number" min="0" max="24" value={form.duration_hours}
            onChange={e => set('duration_hours', e.target.value)}
            placeholder="0" className={input()} />
        </Field>
        <Field label="Minutos">
          <input type="number" min="0" max="59" value={form.duration_minutes}
            onChange={e => set('duration_minutes', e.target.value)}
            placeholder="0" className={input()} />
        </Field>
      </div>

      {/* Notas */}
      <Field label="Notas">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Observações da sessão, situações marcantes..."
          rows={3} className={cn(input(), 'resize-none')} />
      </Field>

      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Registrar sessão'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[var(--text-muted)] font-medium">
        {label}{required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function input() {
  return cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )
}
