'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useReplayerStore, SPEED_PRESETS } from '@/stores/replayer'
import type { ParsedHand } from '@/lib/replayer/types'

interface ReplayControlsProps {
  hand: ParsedHand
}

const SPEED_LABELS: Record<number, string> = {
  2000: '0.5x',
  1000: '1x',
  500:  '2x',
  250:  '4x',
}

export function ReplayControls({ hand }: ReplayControlsProps) {
  const {
    currentIndex, allStates, isPlaying, speed, showResults,
    play, pause, stepForward, stepBack, jumpToIndex, jumpToStreet,
    setSpeed, toggleResults,
  } = useReplayerStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const total = allStates.length

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const { currentIndex, allStates, isPlaying } = useReplayerStore.getState()
        if (currentIndex >= allStates.length - 1) {
          useReplayerStore.getState().pause()
        } else {
          useReplayerStore.getState().stepForward()
        }
      }, speed)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') { e.preventDefault(); isPlaying ? pause() : play() }
      if (e.code === 'ArrowRight') stepForward()
      if (e.code === 'ArrowLeft') stepBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, play, pause, stepForward, stepBack])

  // Find which street indices are available for the jump buttons
  const hasFlop = hand.actions.some(a => a.type === 'deal-flop')
  const hasTurn = hand.actions.some(a => a.type === 'deal-turn')
  const hasRiver = hand.actions.some(a => a.type === 'deal-river')

  const progress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 px-2">

      {/* ── Progress bar / scrubber ── */}
      <div className="relative h-2 bg-white/10 rounded-full cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          jumpToIndex(Math.round(ratio * (total - 1)))
        }}
      >
        <motion.div
          className="absolute h-full bg-emerald-500 rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        {/* Action markers */}
        {hand.actions.map((action, i) => {
          const pct = total > 1 ? (i / (total - 1)) * 100 : 0
          const isDeal = action.type.startsWith('deal-')
          if (!isDeal) return null
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-yellow-400/60 rounded-sm"
              style={{ left: `${pct}%` }}
              title={action.type}
            />
          )
        })}
        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* ── Action counter ── */}
      <div className="flex items-center justify-between text-xs text-white/40 font-mono px-1">
        <span>Ação {currentIndex + 1} / {total}</span>
        <span className="capitalize">{allStates[currentIndex]?.currentStreet ?? ''}</span>
      </div>

      {/* ── Main controls ── */}
      <div className="flex items-center justify-between gap-2">

        {/* Street jump buttons */}
        <div className="flex gap-1">
          <button onClick={() => jumpToIndex(0)} className={btn('sm')} title="Início (Preflop)">
            <SkipBack size={13} />
          </button>
          {hasFlop && (
            <button onClick={() => jumpToStreet('flop')} className={btn('sm')}>
              F
            </button>
          )}
          {hasTurn && (
            <button onClick={() => jumpToStreet('turn')} className={btn('sm')}>
              T
            </button>
          )}
          {hasRiver && (
            <button onClick={() => jumpToStreet('river')} className={btn('sm')}>
              R
            </button>
          )}
        </div>

        {/* Core: back / play / forward */}
        <div className="flex items-center gap-2">
          <button onClick={stepBack} className={btn('md')} title="← Voltar (seta ←)">
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={isPlaying ? pause : play}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-emerald-900/50"
            title="Play/Pause (Espaço)"
          >
            {isPlaying ? <Pause size={18} fill="white" color="white" /> : <Play size={18} fill="white" color="white" className="translate-x-0.5" />}
          </button>

          <button onClick={stepForward} className={btn('md')} title="→ Avançar (seta →)">
            <ChevronRight size={18} />
          </button>

          <button onClick={() => jumpToIndex(total - 1)} className={btn('md')} title="Fim">
            <SkipForward size={13} />
          </button>
        </div>

        {/* Speed + options */}
        <div className="flex items-center gap-1">
          {/* Speed presets */}
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {SPEED_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                  speed === s
                    ? 'bg-emerald-600 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Toggle results */}
          <button
            onClick={toggleResults}
            className={btn('md')}
            title={showResults ? 'Ocultar cartas dos oponentes' : 'Mostrar cartas dos oponentes'}
          >
            {showResults ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function btn(size: 'sm' | 'md') {
  return `${size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9'} rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white/60 hover:text-white transition-all font-bold`
}
