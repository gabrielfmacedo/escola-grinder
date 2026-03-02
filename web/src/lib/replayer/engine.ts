import type { ParsedHand, HandAction, PlayerState, TableState, Street, ActionType } from './types'

// ─── Compute visual state at any action index ─────────────────
//
// This is a pure function: given a parsed hand and an index,
// it replays every action up to that point and returns the
// current visual snapshot of the table.
// ─────────────────────────────────────────────────────────────

export function computeTableState(hand: ParsedHand, currentActionIndex: number): TableState {
  // ── Initialise player states ──────────────────────────────
  const playerMap: Record<string, PlayerState> = {}

  for (const p of hand.players) {
    playerMap[p.name] = {
      seat: p.seat,
      name: p.name,
      stack: p.stack,
      currentBet: 0,
      totalInvested: 0,
      isFolded: false,
      isAllIn: false,
      isActive: false,
      holeCards: p.isHero ? [...p.holeCards] : [],
      isDealer: p.seat === hand.buttonSeat,
      isSmallBlind: false,
      isBigBlind: false,
      lastAction: undefined,
      lastActionAmount: undefined,
    }
  }

  let pot = 0
  let board: string[] = []
  let currentStreet: Street = 'preflop'
  let lastAction: HandAction | undefined
  let isHandOver = false

  // Tracks how much each player has put in this STREET (for raise calculations)
  const streetBets: Record<string, number> = {}

  const resetStreet = () => {
    for (const p of Object.values(playerMap)) {
      p.currentBet = 0
      p.lastAction = undefined
      p.lastActionAmount = undefined
    }
    for (const key of Object.keys(streetBets)) delete streetBets[key]
  }

  // ── Replay actions ────────────────────────────────────────
  const limit = Math.min(currentActionIndex, hand.actions.length - 1)

  for (let i = 0; i <= limit; i++) {
    const action = hand.actions[i]
    lastAction = action

    const player = action.playerName ? playerMap[action.playerName] : undefined

    switch (action.type as ActionType) {

      case 'post-ante': {
        if (!player || action.amount === undefined) break
        const actual = Math.min(action.amount, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet += actual
        streetBets[player.name] = (streetBets[player.name] || 0) + actual
        player.lastAction = 'post-ante'
        player.lastActionAmount = actual
        break
      }

      case 'post-sb': {
        if (!player || action.amount === undefined) break
        const actual = Math.min(action.amount, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet = actual
        player.isSmallBlind = true
        streetBets[player.name] = actual
        player.lastAction = 'post-sb'
        player.lastActionAmount = actual
        break
      }

      case 'post-bb': {
        if (!player || action.amount === undefined) break
        const actual = Math.min(action.amount, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet = actual
        player.isBigBlind = true
        streetBets[player.name] = actual
        player.lastAction = 'post-bb'
        player.lastActionAmount = actual
        break
      }

      case 'fold': {
        if (!player) break
        player.isFolded = true
        player.isActive = false
        player.lastAction = 'fold'
        player.lastActionAmount = undefined
        break
      }

      case 'check': {
        if (!player) break
        player.lastAction = 'check'
        player.lastActionAmount = undefined
        break
      }

      case 'call': {
        if (!player || action.amount === undefined) break
        const actual = Math.min(action.amount, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet += actual
        streetBets[player.name] = (streetBets[player.name] || 0) + actual
        if (action.isAllIn) player.isAllIn = true
        player.lastAction = 'call'
        player.lastActionAmount = actual
        break
      }

      case 'bet': {
        if (!player || action.amount === undefined) break
        const actual = Math.min(action.amount, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet += actual
        streetBets[player.name] = (streetBets[player.name] || 0) + actual
        if (action.isAllIn) player.isAllIn = true
        player.lastAction = 'bet'
        player.lastActionAmount = actual
        break
      }

      case 'raise': {
        if (!player || action.totalAmount === undefined) break
        // Raise "to X" — pay the difference from what's already been invested this street
        const alreadyIn = streetBets[player.name] || 0
        const additional = action.totalAmount - alreadyIn
        const actual = Math.min(additional, player.stack)
        player.stack -= actual
        player.totalInvested += actual
        pot += actual
        player.currentBet = action.totalAmount
        streetBets[player.name] = action.totalAmount
        if (action.isAllIn) player.isAllIn = true
        player.lastAction = 'raise'
        player.lastActionAmount = action.totalAmount
        break
      }

      case 'deal-flop': {
        currentStreet = 'flop'
        board = [...board, ...(action.cards || [])]
        resetStreet()
        break
      }

      case 'deal-turn': {
        currentStreet = 'turn'
        board = [...board, ...(action.cards || [])]
        resetStreet()
        break
      }

      case 'deal-river': {
        currentStreet = 'river'
        board = [...board, ...(action.cards || [])]
        resetStreet()
        break
      }

      case 'deal-hole': {
        // Hero's cards are pre-loaded; this triggers the visual "deal" animation
        break
      }

      case 'show': {
        if (!player || !action.cards?.length) break
        player.holeCards = action.cards
        currentStreet = 'showdown'
        player.lastAction = 'show'
        break
      }

      case 'muck': {
        if (!player) break
        player.lastAction = 'muck'
        break
      }

      case 'collect': {
        if (!player || action.amount === undefined) break
        player.stack += action.amount
        player.lastAction = 'collect'
        player.lastActionAmount = action.amount
        isHandOver = true
        break
      }

      case 'return-uncalled': {
        if (!player || action.amount === undefined) break
        player.stack += action.amount
        pot = Math.max(0, pot - action.amount)
        break
      }
    }
  }

  // ── Determine who acts next ───────────────────────────────
  let actionOn: string | undefined
  const nextAction = hand.actions[currentActionIndex + 1]
  if (nextAction?.playerName && playerMap[nextAction.playerName]) {
    actionOn = nextAction.playerName
    playerMap[nextAction.playerName].isActive = true
  }

  const players = Object.values(playerMap).sort((a, b) => a.seat - b.seat)

  return {
    pot,
    board,
    players,
    currentStreet,
    actionOn,
    lastAction,
    isHandOver,
    totalActionsCount: hand.actions.length,
    currentActionIndex,
  }
}

// Pre-compute ALL states for instant scrubbing
export function computeAllStates(hand: ParsedHand): TableState[] {
  return hand.actions.map((_, i) => computeTableState(hand, i))
}

// Find the first action index for a given street
export function firstActionOfStreet(
  actions: HandAction[],
  street: 'flop' | 'turn' | 'river'
): number {
  const dealType = `deal-${street}` as const
  const idx = actions.findIndex(a => a.type === dealType)
  return idx === -1 ? 0 : idx
}

// Format an amount: if > 0.01 show as $X.XX, if chip show as X
export function formatAmount(amount: number, currency: string, bb: number, inBB: boolean): string {
  if (inBB) {
    const bbs = bb > 0 ? amount / bb : amount
    return `${bbs % 1 === 0 ? bbs.toFixed(0) : bbs.toFixed(1)}bb`
  }
  if (currency === 'CHIPS') return amount.toLocaleString()
  return `$${amount.toFixed(2)}`
}
