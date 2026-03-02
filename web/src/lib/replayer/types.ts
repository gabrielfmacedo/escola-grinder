// ============================================================
// POKER REPLAYER — TYPE DEFINITIONS
// ============================================================

export type Card = string // 'Ah' | 'Kd' | 'Tc' | '2s' etc.

export type PokerSite =
  | 'pokerstars'
  | 'ggpoker'
  | '888'
  | 'wpn'
  | 'winamax'
  | 'partypoker'
  | 'unknown'

export type GameType = 'nlh' | 'plo' | 'plo5' | 'unknown'
export type TableType = 'cash' | 'mtt' | 'sng' | 'spin' | 'unknown'
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type ActionType =
  | 'post-ante'
  | 'post-sb'
  | 'post-bb'
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'deal-hole'
  | 'deal-flop'
  | 'deal-turn'
  | 'deal-river'
  | 'show'
  | 'muck'
  | 'collect'
  | 'return-uncalled'

// ─── Player at the table ─────────────────────────────────────
export interface PlayerInfo {
  seat: number
  name: string
  stack: number      // starting stack this hand (decimal, e.g. 10.50 = $10.50)
  isHero: boolean
  holeCards: Card[]  // hero always; others only if shown at showdown
  finalStack?: number
}

// ─── Single action in the hand timeline ──────────────────────
export interface HandAction {
  index: number
  street: Street
  playerName?: string   // undefined for deal actions
  type: ActionType
  amount?: number       // size of this specific action (call amount, bet size)
  totalAmount?: number  // for raises: the "raise to" total
  cards?: Card[]        // for deal actions
  isAllIn?: boolean
}

// ─── Fully parsed hand ───────────────────────────────────────
export interface ParsedHand {
  site: PokerSite
  handId: string
  gameType: GameType
  tableType: TableType
  tableName: string
  maxSeats: number
  buttonSeat: number
  stakes: { sb: number; bb: number; ante?: number }
  currency: string       // 'USD' | 'EUR' | 'GBP' | 'BRL' | 'CHIPS'
  date: string           // ISO date string
  players: PlayerInfo[]
  actions: HandAction[]
  board: Card[]          // all community cards (full hand summary)
  pot: { total: number; rake?: number }
  winners: { playerName: string; amount: number; description?: string }[]
  heroName?: string
  rawText: string
}

// ─── Engine: visual snapshot at a given action index ─────────
export interface PlayerState {
  seat: number
  name: string
  stack: number
  currentBet: number    // chips in front of player (current street)
  totalInvested: number // total chips committed to pot this hand
  isFolded: boolean
  isAllIn: boolean
  isActive: boolean     // currently their turn to act
  holeCards: Card[]
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  lastAction?: ActionType
  lastActionAmount?: number
}

export interface TableState {
  pot: number
  board: Card[]
  players: PlayerState[]
  currentStreet: Street
  actionOn?: string     // player name whose turn it is
  lastAction?: HandAction
  isHandOver: boolean
  totalActionsCount: number
  currentActionIndex: number
}
