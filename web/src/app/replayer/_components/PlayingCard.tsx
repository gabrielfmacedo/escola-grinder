'use client'

import { motion } from 'framer-motion'

interface PlayingCardProps {
  card?: string        // 'Ah' | 'Kd' | null = face-down
  size?: 'sm' | 'md' | 'lg'
  delay?: number
  className?: string
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥', d: '♦', c: '♣', s: '♠',
}

const SUIT_COLORS: Record<string, string> = {
  h: '#e53e3e', d: '#e53e3e', c: '#1a1a2e', s: '#1a1a2e',
}

const SIZE_MAP = {
  sm: { w: 32, h: 44, rankSize: 10, suitSize: 14 },
  md: { w: 48, h: 66, rankSize: 14, suitSize: 20 },
  lg: { w: 64, h: 88, rankSize: 18, suitSize: 26 },
}

export function PlayingCard({ card, size = 'md', delay = 0, className = '' }: PlayingCardProps) {
  const { w, h, rankSize, suitSize } = SIZE_MAP[size]
  const isFaceDown = !card

  const rank = card ? card.slice(0, -1) : ''
  const suit = card ? card.slice(-1).toLowerCase() : ''
  const color = suit ? SUIT_COLORS[suit] : '#1a1a2e'
  const symbol = suit ? SUIT_SYMBOLS[suit] : ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.3, delay, ease: 'backOut' }}
      className={className}
      style={{ width: w, height: h, perspective: 400, display: 'inline-block' }}
    >
      {isFaceDown ? (
        // Face-down card: dark back
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="0" y="0" width={w} height={h} rx={4} ry={4} fill="#1e3a2e" stroke="#2d5a3d" strokeWidth="1.5" />
          <rect x="3" y="3" width={w - 6} height={h - 6} rx={2} ry={2} fill="none" stroke="#2d5a3d" strokeWidth="1" />
          {/* Diamond pattern */}
          <pattern id={`dp-${w}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="none" stroke="#2d5a3d" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <rect x="5" y="5" width={w - 10} height={h - 10} rx={2} fill={`url(#dp-${w})`} />
        </svg>
      ) : (
        // Face-up card
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* Card background */}
          <rect x="0" y="0" width={w} height={h} rx={4} ry={4} fill="#f8f6f0" stroke="#d4c9a8" strokeWidth="1" />
          {/* Subtle shadow inset */}
          <rect x="1" y="1" width={w - 2} height={h - 2} rx={3} ry={3} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

          {/* Top-left rank + suit */}
          <text
            x={4}
            y={rankSize + 1}
            fontSize={rankSize}
            fontWeight="700"
            fontFamily="Georgia, serif"
            fill={color}
          >
            {rank}
          </text>
          <text
            x={4}
            y={rankSize * 2 + 1}
            fontSize={rankSize - 2}
            fontFamily="Georgia, serif"
            fill={color}
          >
            {symbol}
          </text>

          {/* Center suit symbol */}
          <text
            x={w / 2}
            y={h / 2 + suitSize * 0.4}
            fontSize={suitSize}
            fontFamily="Georgia, serif"
            fill={color}
            textAnchor="middle"
            opacity="0.85"
          >
            {symbol}
          </text>

          {/* Bottom-right rank + suit (rotated 180°) */}
          <g transform={`rotate(180, ${w / 2}, ${h / 2})`}>
            <text
              x={4}
              y={rankSize + 1}
              fontSize={rankSize}
              fontWeight="700"
              fontFamily="Georgia, serif"
              fill={color}
            >
              {rank}
            </text>
            <text
              x={4}
              y={rankSize * 2 + 1}
              fontSize={rankSize - 2}
              fontFamily="Georgia, serif"
              fill={color}
            >
              {symbol}
            </text>
          </g>
        </svg>
      )}
    </motion.div>
  )
}
