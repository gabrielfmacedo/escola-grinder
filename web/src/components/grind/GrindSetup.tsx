'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Layers, Shuffle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameType } from '@/lib/supabase/types'

interface Platform { id: string; name: string }

const GAME_TYPES: GameType[] = ['MTT', 'SNG', 'Spin&Go', 'Cash', 'Outros']

const TOURNAMENT_SUGGESTIONS = [
  'SNG 9p $5', 'SNG 9p $10', 'MTT $5', 'MTT $11', 'MTT $22',
  'PKO $11', 'PKO $22', 'Spin&Go $5', 'Spin&Go $10',
  'Sunday Special', 'Bounty Builder', 'Mystery Bounty',
]

export default function GrindSetup({ platforms }: { platforms: Platform[] }) {
  const router = useRouter()
  const [type, setType] = useState<'single' | 'mixed'>('single')
  const [platformId, setPlatformId] = useState('')
  const [gameType, setGameType] = useState<GameType>('MTT')
  const [buyIn, setBuyIn] = useState('')
  const [tournamentName, setTournamentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    if (type === 'single' && !platformId) { setError('Selecione a plataforma.'); return }
    if (type === 'single' && !buyIn) { setError('Informe o buy-in.'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/grind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        platform_id: platformId || null,
        game_type: type === 'single' ? gameType : null,
        buy_in_cents: type === 'single' ? Math.round(parseFloat(buyIn) * 100) : null,
        tournament_name: type === 'single' ? (tournamentName || null) : null,
      }),
    })

    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao iniciar sessão'); return }

    router.push(`/grind/${data.id}`)
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/20 mb-4">
          <Zap size={24} className="text-[var(--cyan)]" />
        </div>
        <h1 className="text-2xl font-black text-white">Modo Grind</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure sua sessão de torneios</p>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-5">

        {/* Tipo de sessão */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide block mb-2">
            Tipo de Sessão
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setType('single'); if (!platformId) setPlatformId(platforms[0]?.id ?? '') }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-semibold transition-colors',
                type === 'single'
                  ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
              )}
            >
              <Layers size={20} className={type === 'single' ? 'text-[var(--cyan)]' : ''} />
              <div>
                <p>Single Buy-in</p>
                <p className="text-[11px] font-normal text-[var(--text-muted)]">Mesmo torneio repetido</p>
              </div>
            </button>
            <button type="button" onClick={() => setType('mixed')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-semibold transition-colors',
                type === 'mixed'
                  ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'
              )}
            >
              <Shuffle size={20} className={type === 'mixed' ? 'text-[var(--cyan)]' : ''} />
              <div>
                <p>Misto</p>
                <p className="text-[11px] font-normal text-[var(--text-muted)]">Torneios variados</p>
              </div>
            </button>
          </div>
        </div>

        {/* Plataforma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Plataforma{type === 'single' ? ' *' : ' (opcional)'}
            </label>
            <select value={platformId} onChange={e => setPlatformId(e.target.value)}
              className={inputCls}>
              {type === 'mixed' && <option value="">— Por torneio —</option>}
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {type === 'single' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Tipo de jogo</label>
              <select value={gameType} onChange={e => setGameType(e.target.value as GameType)}
                className={inputCls}>
                {GAME_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {type === 'single' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Nome do torneio</label>
              <input
                list="gs-tournament-suggestions"
                type="text"
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
                placeholder="Ex: MTT $11, PKO $22..."
                className={inputCls}
              />
              <datalist id="gs-tournament-suggestions">
                {TOURNAMENT_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Buy-in ($) <span className="text-[var(--red)]">*</span></label>
              <input type="number" min="0" step="0.01"
                value={buyIn} onChange={e => setBuyIn(e.target.value)}
                placeholder="0.00" className={inputCls} />
            </div>
          </>
        )}

        {error && <p className="text-sm text-[var(--red)]">{error}</p>}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-black text-sm transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {loading ? 'Iniciando...' : 'Iniciar Sessão'}
        </button>
      </div>
    </div>
  )
}
