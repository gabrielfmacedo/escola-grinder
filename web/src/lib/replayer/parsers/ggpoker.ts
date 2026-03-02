import type { ParsedHand, PlayerInfo, HandAction, GameType, TableType, Street, Card } from '../types'

// ─── Helpers ─────────────────────────────────────────────────

function parseCards(str: string): Card[] {
  return str.trim().split(/\s+/).filter(c => /^[2-9TJQKA][hdcs]$/i.test(c))
}

// ─── Main parser ─────────────────────────────────────────────

export function parseGGPoker(rawText: string): ParsedHand | null {
  const lines = rawText.split('\n').map(l => l.trim())
  if (!lines[0]) return null

  const firstLine = lines[0]
  // GGPoker hands start with "Poker Hand #HD..." or "Poker Hand #RC..." etc.
  // NOT "PokerStars Hand"
  if (!firstLine.startsWith('Poker Hand #') || firstLine.startsWith('PokerStars')) return null

  // ── Header ──────────────────────────────────────────────────
  // Poker Hand #HD1234567890: Hold'em No Limit (0.10/0.25) - 2024/06/15 14:22:45
  const headerMatch = firstLine.match(
    /Poker Hand #([\w]+):\s+(.+?)\s+\(([\d.]+)\/([\d.]+)(?:\/([\d.]+))?\)\s+-\s+(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/
  )
  if (!headerMatch) return null

  const [, handId, gameDesc, sbStr, bbStr, anteStr, dateRaw] = headerMatch
  const date = new Date(dateRaw.replace(/\//g, '-').replace(' ', 'T') + 'Z').toISOString()

  const gameType: GameType = gameDesc.includes("Hold'em")
    ? 'nlh'
    : gameDesc.includes('Omaha')
    ? 'plo'
    : 'unknown'

  // RC = Ring/Cash tournament format, T = tournament
  const tableType: TableType =
    handId.startsWith('RC') || handId.startsWith('T') ? 'mtt' : 'cash'

  const stakes = {
    sb: parseFloat(sbStr) || 0,
    bb: parseFloat(bbStr) || 0,
    ante: anteStr ? parseFloat(anteStr) : undefined,
  }

  // ── Table line ──────────────────────────────────────────────
  // Table 'NLH 0.10/0.25 #123456' 6-Max (Real Money)
  let tableName = ''
  let maxSeats = 6
  let buttonSeat = 0

  const tableLine = lines.find(l => l.startsWith('Table '))
  if (tableLine) {
    const m = tableLine.match(/Table '(.+?)'\s+(\d+)-Max/i)
    if (m) { tableName = m[1]; maxSeats = parseInt(m[2]) }
  }

  // ── Seats ───────────────────────────────────────────────────
  // Seat 1: PlayerName (10.50)
  const players: PlayerInfo[] = []
  const seatToName: Record<number, string> = {}

  for (const line of lines) {
    if (!line.startsWith('Seat ')) continue
    // Must be a seat declaration (not an action line)
    const m = line.match(/^Seat (\d+): (.+?) \(([\d.]+)\)$/)
    if (m) {
      const seat = parseInt(m[1])
      const name = m[2].trim()
      const stack = parseFloat(m[3])
      players.push({ seat, name, stack, isHero: false, holeCards: [] })
      seatToName[seat] = name
    }
  }

  if (!players.length) return null

  // Resolve "Seat X" references (used in ANTE/BLINDS section) to player names
  const resolveName = (raw: string): string => {
    const m = raw.match(/^Seat (\d+)$/)
    if (m) return seatToName[parseInt(m[1])] || raw
    return raw.trim()
  }

  // ── Action parsing ───────────────────────────────────────────
  const actions: HandAction[] = []
  let actionIndex = 0
  let currentStreet: Street = 'preflop'
  const board: Card[] = []
  let heroName: string | undefined
  const pot = { total: 0, rake: undefined as number | undefined }
  const winners: ParsedHand['winners'] = []
  let inSummary = false

  const add = (action: Omit<HandAction, 'index'>) => {
    actions.push({ ...action, index: actionIndex++ })
  }

  for (const line of lines) {
    if (line === '*** SUMMARY ***') { inSummary = true; continue }

    if (inSummary) {
      // Total pot 1.88 | Rake 0.07
      const potMatch = line.match(/Total pot ([\d.]+)(?:\s*\|\s*Rake ([\d.]+))?/)
      if (potMatch) {
        pot.total = parseFloat(potMatch[1])
        pot.rake = potMatch[2] ? parseFloat(potMatch[2]) : undefined
      }
      // Seat 3: Hero (button) collected (1.81)
      const seatSumMatch = line.match(/^Seat (\d+): (.+?)\s+(\(.+?\))/)
      if (seatSumMatch) {
        const seat = parseInt(seatSumMatch[1])
        const role = seatSumMatch[3]
        if (role.includes('button')) buttonSeat = seat
        const winMatch = line.match(/collected \(([\d.]+)\)/)
        if (winMatch) {
          const name = seatToName[seat] || seatSumMatch[2].trim()
          if (!winners.find(w => w.playerName === name)) {
            winners.push({ playerName: name, amount: parseFloat(winMatch[1]) })
          }
        }
      }
      continue
    }

    // ─ Section markers ─
    if (line === '*** ANTE/BLINDS ***') { currentStreet = 'preflop'; continue }
    if (line === '*** PRE-FLOP ***') { currentStreet = 'preflop'; continue }
    if (line === '*** HOLE CARDS ***') { currentStreet = 'preflop'; continue }
    if (line === '*** SHOWDOWN ***' || line === '*** SHOW DOWN ***') {
      currentStreet = 'showdown'
      continue
    }

    // ─ Flop ─ [3 new cards]
    const flopMatch = line.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/)
    if (flopMatch) {
      currentStreet = 'flop'
      const cards = parseCards(flopMatch[1])
      board.push(...cards)
      add({ street: 'flop', type: 'deal-flop', cards })
      continue
    }

    // ─ Turn ─ GGPoker shows only the new card: *** TURN *** [3h]
    // But sometimes shows full board: *** TURN *** [2h 7d Jc] [Qs]
    const turnNewMatch = line.match(/^\*\*\* TURN \*\*\* \[.+?\] \[(.+?)\]/)
    const turnSingleMatch = !turnNewMatch && line.match(/^\*\*\* TURN \*\*\* \[([2-9TJQKA][hdcs])\]$/)
    const turnCards = turnNewMatch
      ? parseCards(turnNewMatch[1])
      : turnSingleMatch
      ? parseCards(turnSingleMatch[1])
      : null
    if (turnCards) {
      currentStreet = 'turn'
      board.push(...turnCards)
      add({ street: 'turn', type: 'deal-turn', cards: turnCards })
      continue
    }

    // ─ River ─ same logic as turn
    const riverNewMatch = line.match(/^\*\*\* RIVER \*\*\* \[.+?\] \[(.+?)\]/)
    const riverSingleMatch = !riverNewMatch && line.match(/^\*\*\* RIVER \*\*\* \[([2-9TJQKA][hdcs])\]$/)
    const riverCards = riverNewMatch
      ? parseCards(riverNewMatch[1])
      : riverSingleMatch
      ? parseCards(riverSingleMatch[1])
      : null
    if (riverCards) {
      currentStreet = 'river'
      board.push(...riverCards)
      add({ street: 'river', type: 'deal-river', cards: riverCards })
      continue
    }

    // ─ Dealt to hero ─
    const dealtMatch = line.match(/^Dealt to (.+?) \[(.+?)\]/)
    if (dealtMatch) {
      heroName = resolveName(dealtMatch[1])
      const cards = parseCards(dealtMatch[2])
      const hero = players.find(p => p.name === heroName)
      if (hero) { hero.isHero = true; hero.holeCards = cards }
      add({ street: currentStreet, type: 'deal-hole', playerName: heroName, cards })
      continue
    }

    // ─ Ante ─
    const anteMatch = line.match(/^(Seat \d+|.+?): posts ante ([\d.]+)$/)
    if (anteMatch) {
      const playerName = resolveName(anteMatch[1])
      const amount = parseFloat(anteMatch[2])
      if (stakes.ante === undefined) stakes.ante = amount
      add({ street: 'preflop', type: 'post-ante', playerName, amount })
      continue
    }

    // ─ Small blind ─
    const sbMatch = line.match(/^(Seat \d+|.+?): posts small blind ([\d.]+)$/)
    if (sbMatch) {
      add({ street: 'preflop', type: 'post-sb', playerName: resolveName(sbMatch[1]), amount: parseFloat(sbMatch[2]) })
      continue
    }

    // ─ Big blind ─
    const bbMatch = line.match(/^(Seat \d+|.+?): posts big blind ([\d.]+)$/)
    if (bbMatch) {
      add({ street: 'preflop', type: 'post-bb', playerName: resolveName(bbMatch[1]), amount: parseFloat(bbMatch[2]) })
      continue
    }

    // ─ Fold ─
    const foldMatch = line.match(/^(Seat \d+|.+?): folds$/)
    if (foldMatch && !line.startsWith('***')) {
      add({ street: currentStreet, type: 'fold', playerName: resolveName(foldMatch[1]) })
      continue
    }

    // ─ Check ─
    const checkMatch = line.match(/^(Seat \d+|.+?): checks$/)
    if (checkMatch) {
      add({ street: currentStreet, type: 'check', playerName: resolveName(checkMatch[1]) })
      continue
    }

    // ─ Call ─
    const callMatch = line.match(/^(Seat \d+|.+?): calls ([\d.]+)/)
    if (callMatch) {
      add({
        street: currentStreet,
        type: 'call',
        playerName: resolveName(callMatch[1]),
        amount: parseFloat(callMatch[2]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Bet ─
    const betMatch = line.match(/^(Seat \d+|.+?): bets ([\d.]+)/)
    if (betMatch) {
      add({
        street: currentStreet,
        type: 'bet',
        playerName: resolveName(betMatch[1]),
        amount: parseFloat(betMatch[2]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Raise ─
    const raiseMatch = line.match(/^(Seat \d+|.+?): raises ([\d.]+) to ([\d.]+)/)
    if (raiseMatch) {
      add({
        street: currentStreet,
        type: 'raise',
        playerName: resolveName(raiseMatch[1]),
        amount: parseFloat(raiseMatch[2]),
        totalAmount: parseFloat(raiseMatch[3]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Show ─
    const showMatch = line.match(/^(Seat \d+|.+?): shows \[(.+?)\]/)
    if (showMatch) {
      const name = resolveName(showMatch[1])
      const cards = parseCards(showMatch[2])
      const p = players.find(pl => pl.name === name)
      if (p) p.holeCards = cards
      add({ street: 'showdown', type: 'show', playerName: name, cards })
      continue
    }

    // ─ Muck ─
    const muckMatch = line.match(/^(Seat \d+|.+?): mucks/)
    if (muckMatch) {
      add({ street: 'showdown', type: 'muck', playerName: resolveName(muckMatch[1]) })
      continue
    }

    // ─ Collect ─
    const collectMatch = line.match(/^(Seat \d+|.+?) collected ([\d.]+) from (?:main |side |)?pot/)
    if (collectMatch) {
      const name = resolveName(collectMatch[1])
      const amount = parseFloat(collectMatch[2])
      if (!winners.find(w => w.playerName === name)) {
        winners.push({ playerName: name, amount })
      }
      add({ street: currentStreet, type: 'collect', playerName: name, amount })
      continue
    }
  }

  return {
    site: 'ggpoker',
    handId,
    gameType,
    tableType,
    tableName,
    maxSeats,
    buttonSeat,
    stakes,
    currency: tableType === 'cash' ? 'USD' : 'CHIPS',
    date,
    players,
    actions,
    board,
    pot,
    winners,
    heroName,
    rawText,
  }
}
