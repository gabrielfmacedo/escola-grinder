'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, Plus, Trophy, CalendarCheck } from 'lucide-react'
import type { Database, BankrollEntryType } from '@/lib/supabase/types'
import BancaEntryModal from './BancaEntryModal'
import DayCloseModal from './DayCloseModal'

type Entry = Database['public']['Tables']['bankroll_entries']['Row']
type Session = Database['public']['Views']['poker_session_results']['Row']
type Platform = { id: string; name: string }

function fmt(cents: number, sign = false): string {
  const val = cents / 100
  const s = sign && val > 0 ? '+' : ''
  return s + '$' + Math.abs(val).toFixed(2)
}

const TYPE_LABELS: Record<BankrollEntryType, string> = {
  initial: 'Banca Inicial',
  deposit: 'Reload',
  withdrawal: 'Sangria',
  rakeback: 'Rakeback',
  adjustment: 'Ajuste',
  transfer: 'Transferência',
}

const TYPE_COLOR: Record<BankrollEntryType, string> = {
  initial: 'var(--cyan)',
  deposit: 'var(--green)',
  withdrawal: 'var(--red)',
  rakeback: 'var(--gold)',
  adjustment: 'var(--text-muted)',
  transfer: '#a78bfa',
}

export default function BancaClient({
  entries,
  sessions,
  platforms,
}: {
  entries: Entry[]
  sessions: Session[]
  platforms: Platform[]
}) {
  const router = useRouter()
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [defaultType, setDefaultType] = useState<BankrollEntryType>('deposit')
  const [showDayClose, setShowDayClose] = useState(false)
  const [platformExpanded, setPlatformExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Global summary
  const bancaTotal = useMemo(() => entries
    .filter(e => (e.type === 'initial' || e.type === 'deposit') && e.amount_cents > 0)
    .reduce((a, e) => a + e.amount_cents, 0), [entries])

  const saques = useMemo(() => entries
    .filter(e => e.type === 'withdrawal')
    .reduce((a, e) => a + Math.abs(e.amount_cents), 0), [entries])

  const sessionProfit = useMemo(() => sessions.reduce((a, s) => a + s.profit_cents, 0), [sessions])

  const rakebackFromEntries = useMemo(() => entries
    .filter(e => e.type === 'rakeback')
    .reduce((a, e) => a + e.amount_cents, 0), [entries])

  const adjustments = useMemo(() => entries
    .filter(e => e.type === 'adjustment')
    .reduce((a, e) => a + e.amount_cents, 0), [entries])

  const bancaAtual = bancaTotal - saques + sessionProfit + rakebackFromEntries + adjustments
  const totalInvested = sessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const roi = totalInvested > 0 ? (sessionProfit / totalInvested) * 100 : 0
  const itmCount = sessions.filter(s => s.itm).length
  const itmPct = sessions.length > 0 ? (itmCount / sessions.length) * 100 : 0

  // By platform
  const byPlatform = useMemo(() => {
    const map = new Map<string, { name: string; bancaTotal: number; saques: number; sessionProfit: number; rakeback: number }>()
    for (const s of sessions) {
      const cur = map.get(s.platform_id) ?? { name: s.platform_name, bancaTotal: 0, saques: 0, sessionProfit: 0, rakeback: 0 }
      cur.sessionProfit += s.profit_cents
      cur.rakeback += s.rakeback_cents ?? 0
      map.set(s.platform_id, cur)
    }
    for (const e of entries) {
      if (!e.platform_id) continue
      const cur = map.get(e.platform_id)
      if (!cur) continue
      if (e.type === 'initial' || e.type === 'deposit') cur.bancaTotal += e.amount_cents
      if (e.type === 'withdrawal') cur.saques += Math.abs(e.amount_cents)
    }
    return [...map.entries()].map(([id, v]) => ({
      platform_id: id,
      platform_name: v.name,
      banca_total_cents: v.bancaTotal,
      saques_cents: v.saques,
      session_profit_cents: v.sessionProfit,
      banca_atual_cents: v.bancaTotal - v.saques + v.sessionProfit + v.rakeback,
    })).sort((a, b) => b.banca_atual_cents - a.banca_atual_cents)
  }, [entries, sessions])

  // Today's sessions (for day close)
  const todaySessions = useMemo(() => sessions.filter(s => s.played_at === today), [sessions, today])

  function openEntry(type: BankrollEntryType) {
    setDefaultType(type)
    setShowEntryModal(true)
  }

  function handleSuccess() {
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Bankroll</h1>
        <div className="flex gap-2">
          {todaySessions.length > 0 && (
            <button
              onClick={() => setShowDayClose(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/40 text-[var(--gold)] text-sm font-semibold hover:bg-[var(--gold)]/20 transition-colors"
            >
              <CalendarCheck size={14} /> Fechar Caixa
            </button>
          )}
          <button
            onClick={() => openEntry('transfer')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-400 text-sm font-semibold hover:bg-purple-500/20 transition-colors"
          >
            <ArrowDownLeft size={14} /> Transferir
          </button>
          <button
            onClick={() => openEntry('deposit')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/40 text-[var(--green)] text-sm font-semibold hover:bg-[var(--green)]/20 transition-colors"
          >
            <ArrowDownLeft size={14} /> Reload
          </button>
          <button
            onClick={() => openEntry('withdrawal')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--red)]/10 border border-[var(--red)]/40 text-[var(--red)] text-sm font-semibold hover:bg-[var(--red)]/20 transition-colors"
          >
            <ArrowUpRight size={14} /> Sangria
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Banca Total"
          value={fmt(bancaTotal)}
          icon={<Wallet size={16} />}
          color="var(--cyan)"
          sub="depósitos históricos"
        />
        <MetricCard
          label="Banca Atual"
          value={fmt(bancaAtual)}
          icon={bancaAtual >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          color={bancaAtual >= 0 ? 'var(--green)' : 'var(--red)'}
          sub="valor líquido"
          highlight
        />
        <MetricCard
          label="Saques"
          value={fmt(saques)}
          icon={<ArrowUpRight size={16} />}
          color="var(--text-muted)"
          sub="total sacado"
        />
        <MetricCard
          label="ROI"
          value={(roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'}
          icon={<TrendingUp size={16} />}
          color={roi >= 0 ? 'var(--green)' : 'var(--red)'}
          sub={`${sessions.length} torneios`}
        />
        <MetricCard
          label="% ITM"
          value={itmPct.toFixed(1) + '%'}
          icon={<Trophy size={16} />}
          color="var(--gold)"
          sub={`${itmCount} de ${sessions.length}`}
        />
      </div>

      {/* Profit card */}
      <div className={cn(
        'px-5 py-4 rounded-2xl border flex items-center justify-between',
        sessionProfit >= 0
          ? 'bg-[var(--green)]/5 border-[var(--green)]/20'
          : 'bg-[var(--red)]/5 border-[var(--red)]/20'
      )}>
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Lucro em Sessões</p>
          <p className={cn('text-2xl font-bold', sessionProfit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
            {fmt(sessionProfit, true)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Total Investido</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{fmt(totalInvested)}</p>
        </div>
      </div>

      {/* By platform */}
      {byPlatform.length > 0 && (
        <div className="content-card">
          <button
            onClick={() => setPlatformExpanded(!platformExpanded)}
            className="w-full flex items-center justify-between text-sm font-semibold text-[var(--foreground)] mb-3"
          >
            <span>Por Plataforma</span>
            {platformExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {platformExpanded && (
            <div className="space-y-2">
              {byPlatform.map(p => (
                <div key={p.platform_id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{p.platform_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">Depósitos: {fmt(p.banca_total_cents)} · Saques: {fmt(p.saques_cents)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-bold', p.banca_atual_cents >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                      {fmt(p.banca_atual_cents, true)}
                    </p>
                    <p className={cn('text-xs', p.session_profit_cents >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                      sessões: {fmt(p.session_profit_cents, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction history */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Histórico de Transações</h2>
          <button
            onClick={() => openEntry('initial')}
            className="flex items-center gap-1 text-xs text-[var(--cyan)] hover:underline"
          >
            <Plus size={12} /> Definir Banca Inicial
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)] text-sm">
            <p className="mb-3">Nenhuma transação registrada.</p>
            <button
              onClick={() => openEntry('initial')}
              className="px-4 py-2 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/40 text-[var(--cyan)] text-sm font-semibold hover:bg-[var(--cyan)]/20 transition-colors"
            >
              Definir Banca Inicial
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map(e => (
              <EntryRow key={e.id} entry={e} platforms={platforms} onDelete={handleSuccess} />
            ))}
          </div>
        )}
      </div>

      {showEntryModal && (
        <BancaEntryModal
          platforms={platforms}
          defaultType={defaultType}
          onClose={() => setShowEntryModal(false)}
          onSuccess={() => { setShowEntryModal(false); handleSuccess() }}
        />
      )}

      {showDayClose && (
        <DayCloseModal
          todaySessions={todaySessions}
          currentBancaAtual={bancaAtual}
          onClose={() => setShowDayClose(false)}
          onSuccess={() => { setShowDayClose(false); handleSuccess() }}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, icon, color, sub, highlight }: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-2xl p-4 border backdrop-blur-sm',
      'bg-white/[0.04] border-white/[0.08]',
      highlight && 'ring-1 ring-[var(--cyan)]/30 bg-white/[0.07]'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-dim)]">{sub}</p>
    </div>
  )
}

function EntryRow({ entry, platforms, onDelete }: { entry: Entry; platforms: Platform[]; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const platform = platforms.find(p => p.id === entry.platform_id)
  const toPlatform = platforms.find(p => p.id === (entry as Entry & { to_platform_id?: string | null }).to_platform_id)
  const color = TYPE_COLOR[entry.type]
  const label = TYPE_LABELS[entry.type]
  const isOut = entry.type === 'withdrawal' || (entry.type === 'adjustment' && entry.amount_cents < 0)

  async function handleDelete() {
    if (!confirm('Remover esta entrada?')) return
    setDeleting(true)
    await fetch('/api/bankroll', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id }),
    })
    setDeleting(false)
    onDelete()
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0 group">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color, backgroundColor: color + '18' }}>
          {label}
        </span>
        <div>
          <p className="text-sm text-[var(--foreground)]">
            {entry.type === 'transfer'
              ? `${platform?.name ?? 'Global'} → ${toPlatform?.name ?? '?'}`
              : (platform ? platform.name : 'Global')}
            {entry.notes && <span className="text-[var(--text-dim)] ml-1.5 text-xs">{entry.notes}</span>}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{entry.date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn('text-sm font-bold', isOut ? 'text-[var(--red)]' : 'text-[var(--green)]')}>
          {isOut ? '-' : '+'}{fmt(Math.abs(entry.amount_cents))}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--red)] text-xs transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  )
}
