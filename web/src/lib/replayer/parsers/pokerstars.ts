import type { ParsedHand, PlayerInfo, HandAction, GameType, TableType, Street, Card } from '../types'

// ─── Helpers ─────────────────────────────────────────────────

function parseCards(str: string): Card[] {
  return str.trim().split(/\s+/).filter(c => /^[2-9TJQKA][hdcs]$/i.test(c))
}

function parseAmount(str: string): number {
  return parseFloat(str.replace(/[$,€£]/g, '')) || 0
}

// ─── Main parser ─────────────────────────────────────────────

export function parsePokerStars(rawText: string): ParsedHand | null {
  const lines = rawText.split('\n').map(l => l.trim())
  if (!lines[0]) return null

  const firstLine = lines[0]
  if (!firstLine.startsWith('PokerStars')) return null

  // ── Header ──────────────────────────────────────────────────
  // PokerStars Hand #123: Hold'em No Limit ($0.05/$0.10 USD) - 2024/01/15 20:30:00 ET
  // PokerStars Hand #123: Tournament #456, $10+$1 USD Hold'em No Limit - Level V (75/150) - ...
  const headerMatch = firstLine.match(
    /PokerStars (?:Hand|Game) #(\d+):\s+(.*?)\s+-\s+(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/
  )
  if (!headerMatch) return null

  const [, handId, gameDesc, dateRaw] = headerMatch
  const date = new Date(dateRaw.replace(/\//g, '-').replace(' ', 'T') + 'Z').toISOString()

  const gameType: GameType = gameDesc.includes("Hold'em")
    ? 'nlh'
    : gameDesc.includes('Omaha')
    ? 'plo'
    : 'unknown'

  const tableType: TableType = gameDesc.includes('Tournament')
    ? 'mtt'
    : gameDesc.includes('Spin')
    ? 'spin'
    : gameDesc.includes('Sit & Go') || gameDesc.includes('SNG')
    ? 'sng'
    : 'cash'

  // Stakes: ($0.05/$0.10 USD) or (75/150) for MTT levels
  const stakesMatch = gameDesc.match(
    /\((\$?[\d,]+\.?\d*)\/(\$?[\d,]+\.?\d*)(?:\/(\$?[\d,]+\.?\d*))?\s*(?:USD|EUR|GBP)?\)/
  )
  const stakes = {
    sb: stakesMatch ? parseAmount(stakesMatch[1]) : 0,
    bb: stakesMatch ? parseAmount(stakesMatch[2]) : 0,
    ante: stakesMatch?.[3] ? parseAmount(stakesMatch[3]) : undefined,
  }

  const currency =
    gameDesc.includes('USD') || tableType === 'cash'
      ? 'USD'
      : gameDesc.includes('EUR')
      ? 'EUR'
      : gameDesc.includes('GBP')
      ? 'GBP'
      : 'CHIPS'

  // ── Table line ──────────────────────────────────────────────
  // Table 'TableName' 9-max Seat #3 is the button
  let tableName = ''
  let maxSeats = 9
  let buttonSeat = 0

  const tableLine = lines.find(l => l.startsWith("Table '"))
  if (tableLine) {
    const m = tableLine.match(/Table '(.+?)'\s+(\d+)-max\s+Seat #(\d+) is the button/)
    if (m) {
      tableName = m[1]
      maxSeats = parseInt(m[2])
      buttonSeat = parseInt(m[3])
    } else {
      const m2 = tableLine.match(/Table '(.+?)'\s+(\d+)-max/)
      if (m2) { tableName = m2[1]; maxSeats = parseInt(m2[2]) }
    }
  }

  // ── Seats ───────────────────────────────────────────────────
  // Seat 1: PlayerName ($12.34 in chips)
  const players: PlayerInfo[] = []
  for (const line of lines) {
    if (!line.startsWith('Seat ') || !line.includes('in chips')) continue
    const m = line.match(/^Seat (\d+): (.+?)\s+\((\$?[\d,]+\.?\d+)\s+in chips\)/)
    if (m) {
      players.push({
        seat: parseInt(m[1]),
        name: m[2].trim(),
        stack: parseAmount(m[3]),
        isHero: false,
        holeCards: [],
      })
    }
  }

  if (!players.length) return null

  // ── Action parsing (state machine) ──────────────────────────
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
    // ─ Section markers ─
    if (line === '*** HOLE CARDS ***') continue
    if (line === '*** SHOW DOWN ***' || line === '*** SHOWDOWN ***') {
      currentStreet = 'showdown'
      continue
    }
    if (line === '*** SUMMARY ***') { inSummary = true; continue }

    // ─ Flop ─
    const flopMatch = line.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/)
    if (flopMatch) {
      currentStreet = 'flop'
      const cards = parseCards(flopMatch[1])
      board.push(...cards)
      add({ street: 'flop', type: 'deal-flop', cards })
      continue
    }

    // ─ Turn ─
    const turnMatch = line.match(/^\*\*\* TURN \*\*\* \[.+?\] \[(.+?)\]/)
    if (turnMatch) {
      currentStreet = 'turn'
      const cards = parseCards(turnMatch[1])
      board.push(...cards)
      add({ street: 'turn', type: 'deal-turn', cards })
      continue
    }

    // ─ River ─
    const riverMatch = line.match(/^\*\*\* RIVER \*\*\* \[.+?\] \[(.+?)\]/)
    if (riverMatch) {
      currentStreet = 'river'
      const cards = parseCards(riverMatch[1])
      board.push(...cards)
      add({ street: 'river', type: 'deal-river', cards })
      continue
    }

    if (inSummary) {
      // Total pot $1.20 | Rake $0.08
      const potMatch = line.match(/Total pot \$?([\d,]+\.?\d*)\s*(?:\|\s*Rake \$?([\d,]+\.?\d*))?/)
      if (potMatch) {
        pot.total = parseAmount(potMatch[1])
        pot.rake = potMatch[2] ? parseAmount(potMatch[2]) : undefined
      }
      // Winner from summary: Seat 3: Hero (big blind) showed [Ah Kd] and won ($5.20)
      const wonMatch = line.match(/won \(\$?([\d,]+\.?\d*)\)/)
      if (wonMatch) {
        const seatMatch = line.match(/^Seat \d+: (.+?)\s+(?:\(.*?\)\s+)?(?:showed|collected)/)
        if (seatMatch) {
          winners.push({ playerName: seatMatch[1].trim(), amount: parseAmount(wonMatch[1]) })
        }
      }
      continue
    }

    // ─ Dealt to hero ─
    const dealtMatch = line.match(/^Dealt to (.+?) \[(.+?)\]/)
    if (dealtMatch) {
      heroName = dealtMatch[1]
      const cards = parseCards(dealtMatch[2])
      const hero = players.find(p => p.name === heroName)
      if (hero) { hero.isHero = true; hero.holeCards = cards }
      add({ street: currentStreet, type: 'deal-hole', playerName: heroName, cards })
      continue
    }

    // ─ Antes ─
    const anteMatch = line.match(/^(.+?): posts the ante \$?([\d,]+\.?\d*)/)
    if (anteMatch) {
      add({ street: 'preflop', type: 'post-ante', playerName: anteMatch[1], amount: parseAmount(anteMatch[2]) })
      continue
    }

    // ─ Small blind ─
    const sbMatch = line.match(/^(.+?): posts small blind \$?([\d,]+\.?\d*)/)
    if (sbMatch) {
      add({ street: 'preflop', type: 'post-sb', playerName: sbMatch[1], amount: parseAmount(sbMatch[2]) })
      continue
    }

    // ─ Big blind ─
    const bbMatch = line.match(/^(.+?): posts big blind \$?([\d,]+\.?\d*)/)
    if (bbMatch) {
      add({ street: 'preflop', type: 'post-bb', playerName: bbMatch[1], amount: parseAmount(bbMatch[2]) })
      continue
    }

    // ─ Fold ─
    const foldMatch = line.match(/^(.+?): folds$/)
    if (foldMatch) {
      add({ street: currentStreet, type: 'fold', playerName: foldMatch[1] })
      continue
    }

    // ─ Check ─
    const checkMatch = line.match(/^(.+?): checks$/)
    if (checkMatch) {
      add({ street: currentStreet, type: 'check', playerName: checkMatch[1] })
      continue
    }

    // ─ Call ─
    const callMatch = line.match(/^(.+?): calls \$?([\d,]+\.?\d*)/)
    if (callMatch) {
      add({
        street: currentStreet,
        type: 'call',
        playerName: callMatch[1],
        amount: parseAmount(callMatch[2]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Bet ─
    const betMatch = line.match(/^(.+?): bets \$?([\d,]+\.?\d*)/)
    if (betMatch) {
      add({
        street: currentStreet,
        type: 'bet',
        playerName: betMatch[1],
        amount: parseAmount(betMatch[2]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Raise ─
    const raiseMatch = line.match(/^(.+?): raises \$?([\d,]+\.?\d*) to \$?([\d,]+\.?\d*)/)
    if (raiseMatch) {
      add({
        street: currentStreet,
        type: 'raise',
        playerName: raiseMatch[1],
        amount: parseAmount(raiseMatch[2]),
        totalAmount: parseAmount(raiseMatch[3]),
        isAllIn: line.includes('and is all-in'),
      })
      continue
    }

    // ─ Show ─
    const showMatch = line.match(/^(.+?): shows \[(.+?)\]/)
    if (showMatch) {
      const cards = parseCards(showMatch[2])
      const p = players.find(pl => pl.name === showMatch[1])
      if (p) p.holeCards = cards
      add({ street: 'showdown', type: 'show', playerName: showMatch[1], cards })
      continue
    }

    // ─ Muck ─
    const muckMatch = line.match(/^(.+?): mucks hand$/)
    if (muckMatch) {
      add({ street: 'showdown', type: 'muck', playerName: muckMatch[1] })
      continue
    }

    // ─ Collect ─
    const collectMatch = line.match(/^(.+?) collected \$?([\d,]+\.?\d*) from (?:main |side |)?pot/)
    if (collectMatch) {
      const amount = parseAmount(collectMatch[2])
      if (!winners.find(w => w.playerName === collectMatch[1])) {
        winners.push({ playerName: collectMatch[1], amount })
      }
      add({ street: currentStreet, type: 'collect', playerName: collectMatch[1], amount })
      continue
    }

    // ─ Return uncalled ─
    const returnMatch = line.match(/^Uncalled bet \(\$?([\d,]+\.?\d*)\) returned to (.+)$/)
    if (returnMatch) {
      add({ street: currentStreet, type: 'return-uncalled', playerName: returnMatch[2], amount: parseAmount(returnMatch[1]) })
      continue
    }
  }

  return {
    site: 'pokerstars',
    handId,
    gameType,
    tableType,
    tableName,
    maxSeats,
    buttonSeat,
    stakes,
    currency,
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
