'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useReplayerStore } from '@/stores/replayer'
import { PokerTable } from '../_components/PokerTable'
import { ReplayControls } from '../_components/ReplayControls'
import { ActionBadge } from '../_components/ActionBadge'

export default function ReplayerViewPage() {
  const router = useRouter()
  const { hand, currentState, showResults } = useReplayerStore()

  // If no hand loaded, redirect to upload page
  useEffect(() => {
    if (!hand) router.replace('/replayer')
  }, [hand, router])

  if (!hand || !currentState) return null

  const lastAction = currentState.lastAction
  const isShowdown = currentState.currentStreet === 'showdown'

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center py-6 px-4 gap-6">

      {/* ── Hand info bar ── */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-white/40 px-1">
        <div className="flex items-center gap-3">
          <span className="font-mono">#{hand.handId.slice(-10)}</span>
          <span>·</span>
          <span>
            {hand.site === 'pokerstars' ? 'PokerStars' : 'GGPoker'} ·{' '}
            {hand.currency === 'CHIPS'
              ? `${hand.stakes.sb}/${hand.stakes.bb}`
              : `$${hand.stakes.sb}/$${hand.stakes.bb}`
            }
          </span>
          <span>·</span>
          <span>{hand.tableName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Last action summary */}
          {lastAction?.playerName && lastAction.type && (
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="max-w-[100px] truncate">{lastAction.playerName}</span>
              <ActionBadge
                action={lastAction.type}
                amount={lastAction.amount ?? lastAction.totalAmount}
                currency={hand.currency}
                isAllIn={lastAction.isAllIn}
              />
            </div>
          )}

          <button
            onClick={() => router.push('/replayer')}
            className="ml-4 text-white/30 hover:text-white/60 transition-colors"
          >
            ← Nova mão
          </button>
        </div>
      </div>

      {/* ── Poker table ── */}
      <div className="w-full max-w-4xl">
        <PokerTable
          hand={hand}
          state={currentState}
          showResults={showResults}
        />
      </div>

      {/* ── Street indicator ── */}
      <div className="flex items-center gap-2 text-xs">
        {(['preflop', 'flop', 'turn', 'river', 'showdown'] as const).map(street => (
          <div
            key={street}
            className="flex items-center gap-1.5"
          >
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                currentState.currentStreet === street
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : currentState.currentStreet === 'showdown' ||
                    (['flop', 'turn', 'river'].indexOf(street) <= ['flop', 'turn', 'river'].indexOf(currentState.currentStreet as never))
                    ? 'bg-emerald-900'
                    : 'bg-white/10'
              }`}
            />
            <span
              className={`capitalize ${
                currentState.currentStreet === street ? 'text-emerald-400' : 'text-white/20'
              }`}
            >
              {street === 'preflop' ? 'Pré-flop' : street === 'showdown' ? 'Showdown' : street.charAt(0).toUpperCase() + street.slice(1)}
            </span>
            {street !== 'showdown' && <span className="text-white/10 ml-1">·</span>}
          </div>
        ))}
      </div>

      {/* ── Replay controls ── */}
      <ReplayControls hand={hand} />

      {/* ── Showdown result ── */}
      {isShowdown && hand.winners.length > 0 && (
        <div className="w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">Resultado</span>
            <div className="flex flex-wrap justify-center gap-3">
              {hand.winners.map((w, i) => (
                <div key={i} className="text-center">
                  <div className="text-white font-semibold">{w.playerName}</div>
                  <div className="text-emerald-400 font-mono text-sm">
                    +{hand.currency === 'CHIPS' ? w.amount.toLocaleString() : `$${w.amount.toFixed(2)}`}
                  </div>
                  {w.description && (
                    <div className="text-white/30 text-xs">{w.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
