'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PlayerState } from '@/lib/replayer/types'
import { PlayingCard } from './PlayingCard'
import { ActionBadge } from './ActionBadge'

interface PlayerSeatProps {
  player: PlayerState
  x: number       // SVG x coordinate (centre of seat)
  y: number       // SVG y coordinate (centre of seat)
  currency?: string
  isHero?: boolean
}

// Convert SVG coords to foreignObject top-left
const FO_W = 110
const FO_H = 90

export function PlayerSeat({ player, x, y, currency = 'USD', isHero = false }: PlayerSeatProps) {
  const opacity = player.isFolded ? 0.35 : 1

  const stackStr = currency === 'CHIPS'
    ? player.stack.toLocaleString()
    : `$${player.stack.toFixed(2)}`

  const position = player.isDealer
    ? 'BTN'
    : player.isSmallBlind
    ? 'SB'
    : player.isBigBlind
    ? 'BB'
    : ''

  // Initials for avatar
  const initials = player.name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <motion.g
      animate={{ opacity }}
      transition={{ duration: 0.3 }}
    >
      {/* Seat card via foreignObject */}
      <foreignObject
        x={x - FO_W / 2}
        y={y - FO_H / 2}
        width={FO_W}
        height={FO_H}
        className="overflow-visible"
      >
        {/* @ts-expect-error xmlns required for foreignObject */}
        <div xmlns="http://www.w3.org/1999/xhtml" className="flex flex-col items-center gap-1 select-none">

          {/* Hole cards (above avatar) */}
          <div className="flex gap-0.5 mb-0.5">
            {player.holeCards.length > 0 ? (
              player.holeCards.map((card, i) => (
                <PlayingCard key={card + i} card={card} size="sm" delay={i * 0.05} />
              ))
            ) : !player.isFolded ? (
              // Show face-down if still in hand
              <>
                <PlayingCard size="sm" delay={0} />
                <PlayingCard size="sm" delay={0.05} />
              </>
            ) : null}
          </div>

          {/* Avatar + Name row */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-full"
            style={{
              background: isHero
                ? 'linear-gradient(135deg, #065f46cc, #0f766ecc)'
                : player.isActive
                ? 'linear-gradient(135deg, #1e3a5f, #1d4ed8)'
                : 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: player.isActive
                ? '1.5px solid #60a5fa'
                : isHero
                ? '1.5px solid #34d399'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: player.isActive ? '0 0 8px #3b82f680' : 'none',
            }}
          >
            {/* Avatar circle */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{
                background: isHero ? '#059669' : '#334155',
                color: isHero ? '#ecfdf5' : '#94a3b8',
              }}
            >
              {initials}
            </div>

            {/* Name + stack */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-white truncate leading-tight" title={player.name}>
                {player.name.length > 10 ? player.name.slice(0, 9) + '…' : player.name}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono leading-tight">
                {stackStr}
              </span>
            </div>

            {/* Position badge */}
            {position && (
              <span
                className="ml-auto text-[8px] font-bold px-1 rounded shrink-0"
                style={{
                  background: position === 'BTN' ? '#b45309' : position === 'SB' ? '#6b21a8' : '#1d4ed8',
                  color: '#fff',
                }}
              >
                {position}
              </span>
            )}
          </div>

          {/* Action badge + current bet */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <AnimatePresence>
              {player.lastAction && (
                <ActionBadge
                  key={player.lastAction}
                  action={player.lastAction}
                  amount={player.lastActionAmount}
                  currency={currency}
                  isAllIn={player.isAllIn}
                />
              )}
            </AnimatePresence>

            {/* Chips in front (current bet this street) */}
            {player.currentBet > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] text-yellow-300 font-mono font-bold"
              >
                {currency === 'CHIPS'
                  ? player.currentBet.toLocaleString()
                  : `$${player.currentBet.toFixed(2)}`}
              </motion.div>
            )}
          </div>
        </div>
      </foreignObject>

      {/* Dealer button (D chip) */}
      {player.isDealer && (
        <circle
          cx={x + FO_W / 2 - 8}
          cy={y - FO_H / 2 + 8}
          r={9}
          fill="#f59e0b"
          stroke="#92400e"
          strokeWidth={1.5}
        />
      )}
      {player.isDealer && (
        <text
          x={x + FO_W / 2 - 8}
          y={y - FO_H / 2 + 12}
          textAnchor="middle"
          fontSize={8}
          fontWeight="900"
          fill="#1c1917"
        >
          D
        </text>
      )}
    </motion.g>
  )
}
