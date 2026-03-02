'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { ActionType } from '@/lib/replayer/types'

interface ActionBadgeProps {
  action?: ActionType
  amount?: number
  currency?: string
  isAllIn?: boolean
}

const ACTION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  fold:        { label: 'FOLD',    bg: '#374151', text: '#9ca3af' },
  check:       { label: 'CHECK',   bg: '#1d4ed8', text: '#93c5fd' },
  call:        { label: 'CALL',    bg: '#0f766e', text: '#5eead4' },
  bet:         { label: 'BET',     bg: '#b45309', text: '#fde68a' },
  raise:       { label: 'RAISE',   bg: '#b91c1c', text: '#fca5a5' },
  'post-sb':   { label: 'SB',      bg: '#6b21a8', text: '#d8b4fe' },
  'post-bb':   { label: 'BB',      bg: '#6b21a8', text: '#d8b4fe' },
  'post-ante': { label: 'ANTE',    bg: '#4b5563', text: '#d1d5db' },
  show:        { label: 'SHOW',    bg: '#065f46', text: '#6ee7b7' },
  muck:        { label: 'MUCK',    bg: '#374151', text: '#9ca3af' },
  collect:     { label: 'WIN',     bg: '#166534', text: '#86efac' },
}

export function ActionBadge({ action, amount, currency = 'USD', isAllIn }: ActionBadgeProps) {
  if (!action || !ACTION_CONFIG[action]) return null

  const cfg = ACTION_CONFIG[action]

  const label = isAllIn && (action === 'call' || action === 'raise' || action === 'bet')
    ? 'ALL-IN'
    : cfg.label

  const bgColor = isAllIn ? '#7c3aed' : cfg.bg
  const textColor = isAllIn ? '#c4b5fd' : cfg.text

  const amountStr = amount !== undefined && amount > 0
    ? currency === 'CHIPS'
      ? ` ${amount.toLocaleString()}`
      : ` $${amount.toFixed(2)}`
    : ''

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={label + amountStr}
        initial={{ opacity: 0, scale: 0.7, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.18 }}
        style={{ backgroundColor: bgColor }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest whitespace-nowrap shadow-lg"
      >
        <span style={{ color: textColor }}>{label}{amountStr}</span>
      </motion.div>
    </AnimatePresence>
  )
}
