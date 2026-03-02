'use client'

import { create } from 'zustand'
import type { ParsedHand, TableState } from '@/lib/replayer/types'
import { computeAllStates, firstActionOfStreet } from '@/lib/replayer/engine'

// Speed presets: ms per action step
export const SPEED_PRESETS = [2000, 1000, 500, 250] as const
export type SpeedPreset = (typeof SPEED_PRESETS)[number]

interface ReplayerStore {
  // ── State ────────────────────────────────────────────────
  hand: ParsedHand | null
  allStates: TableState[]
  currentIndex: number
  isPlaying: boolean
  speed: SpeedPreset
  showResults: boolean   // if false, hide opponent hole cards
  displayInBB: boolean   // convert amounts to big blinds

  // ── Derived (computed from allStates[currentIndex]) ──────
  currentState: TableState | null

  // ── Actions ──────────────────────────────────────────────
  loadHand: (hand: ParsedHand) => void
  clearHand: () => void
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  jumpToIndex: (index: number) => void
  jumpToStreet: (street: 'flop' | 'turn' | 'river') => void
  setSpeed: (speed: SpeedPreset) => void
  toggleResults: () => void
  toggleBBDisplay: () => void
}

export const useReplayerStore = create<ReplayerStore>((set, get) => ({
  hand: null,
  allStates: [],
  currentIndex: 0,
  isPlaying: false,
  speed: 1000,
  showResults: true,
  displayInBB: false,
  currentState: null,

  loadHand: (hand) => {
    const allStates = computeAllStates(hand)
    set({
      hand,
      allStates,
      currentIndex: 0,
      isPlaying: false,
      currentState: allStates[0] ?? null,
    })
  },

  clearHand: () =>
    set({ hand: null, allStates: [], currentIndex: 0, isPlaying: false, currentState: null }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  stepForward: () => {
    const { currentIndex, allStates } = get()
    const next = Math.min(currentIndex + 1, allStates.length - 1)
    set({ currentIndex: next, currentState: allStates[next] ?? null, isPlaying: next === allStates.length - 1 ? false : get().isPlaying })
  },

  stepBack: () => {
    const { currentIndex, allStates } = get()
    const prev = Math.max(currentIndex - 1, 0)
    set({ currentIndex: prev, currentState: allStates[prev] ?? null, isPlaying: false })
  },

  jumpToIndex: (index) => {
    const { allStates } = get()
    const clamped = Math.max(0, Math.min(index, allStates.length - 1))
    set({ currentIndex: clamped, currentState: allStates[clamped] ?? null, isPlaying: false })
  },

  jumpToStreet: (street) => {
    const { hand, allStates } = get()
    if (!hand) return
    const idx = firstActionOfStreet(hand.actions, street)
    set({ currentIndex: idx, currentState: allStates[idx] ?? null, isPlaying: false })
  },

  setSpeed: (speed) => set({ speed }),
  toggleResults: () => set((s) => ({ showResults: !s.showResults })),
  toggleBBDisplay: () => set((s) => ({ displayInBB: !s.displayInBB })),
}))
