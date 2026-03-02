'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { parseHandFile } from '@/lib/replayer/parsers'
import { useReplayerStore } from '@/stores/replayer'
import type { ParsedHand } from '@/lib/replayer/types'
import { useRouter } from 'next/navigation'

const SITE_LABELS: Record<string, string> = {
  pokerstars: 'PokerStars',
  ggpoker: 'GGPoker',
  '888': '888poker',
  wpn: 'WPN',
  winamax: 'Winamax',
  partypoker: 'PartyPoker',
  unknown: 'Desconhecido',
}

const TABLE_TYPE_LABELS: Record<string, string> = {
  cash: 'Cash Game',
  mtt: 'MTT',
  sng: 'SNG',
  spin: 'Spin & Go',
  unknown: '',
}

export function HandUploader() {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedHands, setParsedHands] = useState<ParsedHand[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadHand = useReplayerStore(s => s.loadHand)
  const router = useRouter()

  const parseText = useCallback((raw: string) => {
    if (!raw.trim()) return
    setIsParsing(true)
    setError(null)

    // Run in next tick to allow loading state to render
    setTimeout(() => {
      try {
        const hands = parseHandFile(raw)
        if (hands.length === 0) {
          setError('Não consegui interpretar esse histórico. Verifique se é PokerStars ou GGPoker.')
          setIsParsing(false)
          return
        }
        if (hands.length === 1) {
          // Load directly and go to replayer
          loadHand(hands[0])
          router.push('/replayer/view')
        } else {
          setParsedHands(hands)
        }
      } catch {
        setError('Erro ao processar o histórico. Tente novamente.')
      }
      setIsParsing(false)
    }, 50)
  }, [loadHand, router])

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      setText(content)
      parseText(content)
    }
    reader.readAsText(file, 'utf-8')
  }, [parseText])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const selectHand = (hand: ParsedHand) => {
    loadHand(hand)
    router.push('/replayer/view')
  }

  const formatStakes = (hand: ParsedHand) => {
    const { sb, bb } = hand.stakes
    if (hand.currency === 'CHIPS') return `${sb}/${bb}`
    return `$${sb}/$${bb}`
  }

  // ── Hand list (multi-hand file) ─────────────────────────
  if (parsedHands.length > 0) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {parsedHands.length} mãos encontradas
          </h2>
          <button
            onClick={() => { setParsedHands([]); setText('') }}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← Novo upload
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {parsedHands.map((hand, i) => (
            <motion.button
              key={hand.handId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => selectHand(hand)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{hand.gameType === 'nlh' ? '♠' : '◆'}</span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {SITE_LABELS[hand.site]} · {formatStakes(hand)} · {TABLE_TYPE_LABELS[hand.tableType]}
                  </div>
                  <div className="text-xs text-white/40 font-mono">
                    #{hand.handId.slice(-8)} · {hand.players.length} jogadores
                    {hand.heroName && ` · Hero: ${hand.heroName}`}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // ── Upload area ─────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* Drop zone */}
      <motion.div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        animate={{ borderColor: isDragging ? '#10b981' : 'rgba(255,255,255,0.08)' }}
        className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors"
        style={{ borderColor: isDragging ? '#10b981' : 'rgba(255,255,255,0.08)' }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.log,.hh"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        <motion.div
          animate={{ scale: isDragging ? 1.05 : 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Upload size={24} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium">Arraste seu arquivo de histórico</p>
            <p className="text-white/40 text-sm mt-1">
              PokerStars · GGPoker · .txt / .log / .hh
            </p>
          </div>
          <span className="text-xs text-white/25 border border-white/10 px-3 py-1 rounded-full">
            ou clique para selecionar
          </span>
        </motion.div>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-xs text-white/25">ou cole o histórico abaixo</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Textarea paste */}
      <div className="relative">
        <FileText size={14} className="absolute top-3 left-3 text-white/20 pointer-events-none" />
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError(null) }}
          placeholder={`Cole o histórico de mão aqui...

Exemplo PokerStars:
PokerStars Hand #123: Hold'em No Limit ($0.05/$0.10 USD)...

Exemplo GGPoker:
Poker Hand #HD123: Hold'em No Limit (0.05/0.10)...`}
          className="w-full h-44 bg-white/5 border border-white/8 rounded-xl px-4 py-3 pl-8 text-sm text-white placeholder-white/20 font-mono resize-none focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
          spellCheck={false}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle size={15} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={() => parseText(text)}
        disabled={!text.trim() || isParsing}
        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isParsing ? (
          <><Loader2 size={17} className="animate-spin" /> Processando...</>
        ) : (
          <><ChevronRight size={17} /> Reproduzir mão</>
        )}
      </button>
    </div>
  )
}
