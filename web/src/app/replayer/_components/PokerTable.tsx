'use client'

import { useMemo } from 'react'
import type { TableState, ParsedHand } from '@/lib/replayer/types'
import { PlayerSeat } from './PlayerSeat'
import { CommunityCards } from './CommunityCards'

interface PokerTableProps {
  hand: ParsedHand
  state: TableState
  showResults?: boolean
}

// Viewbox dimensions
const VW = 900
const VH = 540

// Table ellipse centre and radii
const CX = VW / 2   // 450
const CY = VH / 2   // 270
const RX = 320       // horizontal radius of table felt
const RY = 145       // vertical radius

// Player seats orbit slightly outside the table
const SEAT_RX = 390
const SEAT_RY = 215

// Calculate screen position for seat index i out of n total players.
// Hero is always at the bottom (angle = 90° in SVG coords = 6 o'clock).
// Going counter-clockwise on screen = clockwise from players' perspective.
function seatPosition(i: number, n: number): { x: number; y: number } {
  const angleDeg = 90 - (i * 360) / n   // hero at 90°, going CW (player perspective)
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + SEAT_RX * Math.cos(rad),
    y: CY + SEAT_RY * Math.sin(rad),
  }
}

// Re-order players so that hero is index 0 (appears at bottom)
function getOrderedPlayers(state: TableState, heroName?: string) {
  const players = [...state.players]
  if (!heroName) return players

  const heroIdx = players.findIndex(p => p.name === heroName)
  if (heroIdx <= 0) return players

  // Rotate array so hero is first
  return [...players.slice(heroIdx), ...players.slice(0, heroIdx)]
}

export function PokerTable({ hand, state, showResults = true }: PokerTableProps) {
  const orderedPlayers = useMemo(
    () => getOrderedPlayers(state, hand.heroName),
    [state, hand.heroName]
  )

  const n = orderedPlayers.length

  return (
    <div className="w-full max-w-4xl mx-auto">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.7))' }}
      >
        <defs>
          {/* Felt gradient */}
          <radialGradient id="felt" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1a4731" />
            <stop offset="100%" stopColor="#0d2b1d" />
          </radialGradient>

          {/* Table edge gradient */}
          <radialGradient id="edge" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>

          {/* Glow filter for active player */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Table rail (outer border) ── */}
        <ellipse
          cx={CX} cy={CY}
          rx={RX + 22} ry={RY + 22}
          fill="url(#edge)"
          stroke="#5c3d1e"
          strokeWidth={18}
        />

        {/* ── Felt surface ── */}
        <ellipse
          cx={CX} cy={CY}
          rx={RX} ry={RY}
          fill="url(#felt)"
        />

        {/* ── Subtle felt line pattern ── */}
        <ellipse
          cx={CX} cy={CY}
          rx={RX - 12} ry={RY - 12}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
        <ellipse
          cx={CX} cy={CY}
          rx={RX - 30} ry={RY - 30}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={1}
        />

        {/* ── Brand text on felt ── */}
        <text
          x={CX} y={CY + RY - 20}
          textAnchor="middle"
          fontSize={11}
          fontWeight="400"
          letterSpacing={4}
          fill="rgba(255,255,255,0.07)"
          fontFamily="Georgia, serif"
        >
          POKER SCHOOL
        </text>

        {/* ── Community cards + pot ── */}
        <CommunityCards
          board={state.board}
          pot={state.pot}
          currency={hand.currency}
        />

        {/* ── Player seats ── */}
        {orderedPlayers.map((player, i) => {
          const { x, y } = seatPosition(i, n)
          const isHero = player.name === hand.heroName

          // If showResults is false, hide opponent hole cards
          const displayPlayer = !showResults && !isHero
            ? { ...player, holeCards: [] }
            : player

          return (
            <PlayerSeat
              key={player.name}
              player={displayPlayer}
              x={x}
              y={y}
              currency={hand.currency}
              isHero={isHero}
            />
          )
        })}
      </svg>
    </div>
  )
}
