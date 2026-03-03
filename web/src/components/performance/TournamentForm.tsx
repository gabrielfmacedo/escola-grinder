'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { GameType } from '@/lib/supabase/types'
import { Monitor, MapPin, Trophy, Crosshair } from 'lucide-react'

interface Platform { id: string; name: string }

const GAME_TYPES: GameType[] = ['MTT', 'SNG', 'Spin&Go', 'Cash', 'Outros']

const TOURNAMENT_SUGGESTIONS = [
  'SNG 9p $5', 'SNG 9p $10', 'SNG 9p $22',
  'MTT $5', 'MTT $11', 'MTT $22', 'MTT $33', 'MTT $55',
  'PKO $11', 'PKO $22', 'PKO $33', 'PKO $55',
  'Spin&Go $5', 'Spin&Go $10', 'Spin&Go $25',
  'Sunday Special', 'Sunday Million', 'Big $109', 'Big $55', 'Bounty Builder',
  'Mystery Bounty', 'Turbo $11', 'Turbo $22', 'Hyper $11',
  'SCOOP', 'WCOOP', 'WSOP Online',
]

// Plataformas em ordem preferida
const PLATFORM_ORDER = [
  'pokerstars', 'ggpoker', 'gg poker', 'wpt', 'partypoker', '888poker',
  '888 poker', 'coinpoker', 'bodog', 'ignition',
]

function sortPlatforms(platforms: Platform[]): Platform[] {
  return [...platforms].sort((a, b) => {
    const ai = PLATFORM_ORDER.findIndex(k => a.name.toLowerCase().includes(k))
    const bi = PLATFORM_ORDER.findIndex(k => b.name.toLowerCase().includes(k))
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default function TournamentForm({
  platforms,
  grindSessionId,
  defaultBuyIn,
  defaultName,
  onSuccess,
}: {
  platforms: Platform[]
  grindSessionId?: string
  defaultBuyIn?: string
  defaultName?: string
  onSuccess?: () => void
}) {
  const router = useRouter()
  const sorted = sortPlatforms(platforms)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    platform_id: sorted[0]?.id ?? '',
    played_at: new Date().toISOString().split('T')[0],
    game_type: 'MTT' as GameType,
    tournament_name: defaultName ?? '',
    is_live: false,
    buy_in: defaultBuyIn ?? '',
    prize: '',
    entries: '1',
    position: '',
    notes: '',
    itm: false,
    is_pko: false,
  })

  // Auto-check ITM when prize > 0
  useEffect(() => {
    if (parseFloat(form.prize) > 0) {
      setForm(f => ({ ...f, itm: true }))
    }
  }, [form.prize])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const buyIn = Math.round(parseFloat(form.buy_in) * 100)
    const prize = form.prize ? Math.round(parseFloat(form.prize) * 100) : 0
    const entries = parseInt(form.entries) || 1

    if (isNaN(buyIn) || buyIn < 0) { setError('Buy-in inválido.'); return }
    if (!form.platform_id) { setError('Selecione uma plataforma.'); return }

    setLoading(true)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_id: form.platform_id,
        played_at: form.played_at,
        game_type: form.game_type,
        tournament_name: form.tournament_name || null,
        is_live: form.is_live,
        buy_in_cents: buyIn * entries,
        cash_out_cents: prize,
        entries,
        position: form.position ? parseInt(form.position) : null,
        notes: form.notes || null,
        grind_session_id: grindSessionId ?? null,
        itm: form.itm,
        is_pko: form.is_pko,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ao salvar (${res.status})`)
      return
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push('/performance')
      router.refresh()
    }
  }

  const totalBuyIn = (parseFloat(form.buy_in) || 0) * (parseInt(form.entries) || 1)
  const prize = parseFloat(form.prize) || 0
  const profit = prize - totalBuyIn

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Linha 1: Data + Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Data">
          <input type="date" value={form.played_at} onChange={e => set('played_at', e.target.value)}
            required className={inputCls()} />
        </Field>
        <Field label="Plataforma">
          <select value={form.platform_id} onChange={e => set('platform_id', e.target.value)}
            required className={inputCls()}>
            {sorted.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {/* Online / Live toggle */}
      <div>
        <label className="text-xs text-[var(--text-muted)] font-medium block mb-2">Modalidade</label>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => set('is_live', false)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
              !form.is_live
                ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
            )}
          >
            <Monitor size={13} /> Online
          </button>
          <button type="button"
            onClick={() => set('is_live', true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
              form.is_live
                ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
            )}
          >
            <MapPin size={13} /> Live
          </button>
        </div>
      </div>

      {/* Tipo de jogo + Nome do torneio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tipo de jogo">
          <select value={form.game_type} onChange={e => set('game_type', e.target.value as GameType)}
            className={inputCls()}>
            {GAME_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Nome do torneio">
          <input
            list="tournament-suggestions"
            type="text"
            value={form.tournament_name}
            onChange={e => set('tournament_name', e.target.value)}
            placeholder="Ex: MTT $11, PKO $22..."
            className={inputCls()}
          />
          <datalist id="tournament-suggestions">
            {TOURNAMENT_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        </Field>
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Buy-in ($)" required>
          <input type="number" min="0" step="0.01" value={form.buy_in}
            onChange={e => set('buy_in', e.target.value)}
            placeholder="0.00" required className={inputCls()} />
        </Field>
        <Field label="Re-entradas">
          <input type="number" min="1" step="1" value={form.entries}
            onChange={e => set('entries', e.target.value)}
            className={inputCls()} />
        </Field>
        <Field label="Prêmio ($)">
          <input type="number" min="0" step="0.01" value={form.prize}
            onChange={e => set('prize', e.target.value)}
            placeholder="0.00" className={inputCls()} />
        </Field>
      </div>

      {/* PKO + ITM */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, is_pko: !f.is_pko }))}
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
            form.is_pko
              ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-[var(--cyan)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
          )}
        >
          <Crosshair size={14} />
          <span>PKO / Bounty</span>
          <div className={cn(
            'ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            form.is_pko ? 'bg-[var(--cyan)] border-[var(--cyan)]' : 'border-[var(--border)]'
          )}>
            {form.is_pko && <div className="w-2 h-2 rounded-sm bg-black" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, itm: !f.itm }))}
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
            form.itm
              ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
          )}
        >
          <Trophy size={14} />
          <span>ITM</span>
          <div className={cn(
            'ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            form.itm ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--border)]'
          )}>
            {form.itm && <div className="w-2 h-2 rounded-sm bg-black" />}
          </div>
        </button>
      </div>

      {/* Preview do resultado */}
      {form.buy_in && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold',
          profit >= 0
            ? 'bg-[var(--green)]/8 border-[var(--green)]/20 text-[var(--green)]'
            : 'bg-[var(--red)]/8 border-[var(--red)]/20 text-[var(--red)]'
        )}>
          <span>
            Resultado
            {parseInt(form.entries) > 1 && (
              <span className="font-normal text-[var(--text-muted)] ml-1.5">
                ({form.entries}× ${parseFloat(form.buy_in || '0').toFixed(2)} = ${totalBuyIn.toFixed(2)})
              </span>
            )}
          </span>
          <span>{profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>
        </div>
      )}

      {/* Posição (opcional) */}
      <Field label="Posição final (opcional)">
        <input type="number" min="1" step="1" value={form.position}
          onChange={e => set('position', e.target.value)}
          placeholder="Ex: 3 (3º lugar)" className={inputCls()} />
      </Field>

      {/* Notas */}
      <Field label="Notas">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Observações, situações marcantes..."
          rows={3} className={cn(inputCls(), 'resize-none')} />
      </Field>

      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      <div className="flex gap-3">
        {!onSuccess && (
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Registrar Torneio'}
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

function inputCls() {
  return cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )
}
