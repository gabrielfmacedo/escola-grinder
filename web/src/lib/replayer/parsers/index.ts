import type { ParsedHand, PokerSite } from '../types'
import { parsePokerStars } from './pokerstars'
import { parseGGPoker } from './ggpoker'

export { parsePokerStars } from './pokerstars'
export { parseGGPoker } from './ggpoker'

export function detectSite(text: string): PokerSite {
  const first = text.trimStart().split('\n')[0] || ''
  if (first.startsWith('PokerStars')) return 'pokerstars'
  if (first.match(/^Poker Hand #(HD|RC|T|RH)/)) return 'ggpoker'
  if (first.includes('***** 888')) return '888'
  if (first.toLowerCase().includes('partypoker')) return 'partypoker'
  if (first.includes('Full Tilt')) return 'unknown'
  return 'unknown'
}

// Parse a single hand history text
export function parseHandHistory(rawText: string): ParsedHand | null {
  const text = rawText.trim()
  if (!text) return null

  const site = detectSite(text)

  switch (site) {
    case 'pokerstars': return parsePokerStars(text)
    case 'ggpoker':    return parseGGPoker(text)
    default:
      // Try all parsers in order
      return parsePokerStars(text) ?? parseGGPoker(text) ?? null
  }
}

// Split a multi-hand file into individual hand texts
export function splitHandFile(rawText: string): string[] {
  // PokerStars: each hand starts with "PokerStars Hand"
  // GGPoker: each hand starts with "Poker Hand #"
  const hands = rawText
    .split(/(?=PokerStars (?:Hand|Game) #|Poker Hand #)/)
    .map(h => h.trim())
    .filter(h => h.length > 50) // filter out tiny fragments

  return hands
}

// Parse a multi-hand file and return all valid hands
export function parseHandFile(rawText: string): ParsedHand[] {
  const handTexts = splitHandFile(rawText)
  return handTexts
    .map(text => parseHandHistory(text))
    .filter((h): h is ParsedHand => h !== null)
}
