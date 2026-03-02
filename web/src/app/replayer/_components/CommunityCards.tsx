'use client'

import { PlayingCard } from './PlayingCard'
import type { Card } from '@/lib/replayer/types'

interface CommunityCardsProps {
  board: Card[]
  pot: number
  currency?: string
}

export function CommunityCards({ board, pot, currency = 'USD' }: CommunityCardsProps) {
  const potStr = currency === 'CHIPS'
    ? pot.toLocaleString()
    : `$${pot.toFixed(2)}`

  return (
    <g>
      {/* Pot display */}
      <foreignObject x={350} y={215} width={200} height={30}>
        {/* @ts-expect-error xmlns required */}
        <div xmlns="http://www.w3.org/1999/xhtml" className="flex justify-center">
          {pot > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-yellow-400">●</span>
              <span className="text-white font-mono">{potStr}</span>
            </div>
          )}
        </div>
      </foreignObject>

      {/* Community cards */}
      <foreignObject x={275} y={175} width={350} height={70}>
        {/* @ts-expect-error xmlns required */}
        <div xmlns="http://www.w3.org/1999/xhtml" className="flex items-center justify-center gap-1 h-full">
          {Array.from({ length: 5 }).map((_, i) => {
            const card = board[i]
            if (!card && i === 0) return null  // no board yet
            if (!card) return null
            return <PlayingCard key={i} card={card} size="md" delay={i * 0.08} />
          })}
        </div>
      </foreignObject>
    </g>
  )
}
