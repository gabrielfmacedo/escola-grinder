'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ArrowDownLeft, ArrowUpRight, CalendarCheck, Plus,
  ArrowLeftRight, Wallet, TrendingUp, TrendingDown, Repeat2, Trash2, Pencil, X,
} from 'lucide-react'
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
  initial:    'Banca Inicial',
  deposit:    'Reload',
  withdrawal: 'Sangria',
  rakeback:   'Rakeback',
  adjustment: 'Ajuste',
  transfer:   'Transferência',
}

const TYPE_COLOR: Record<BankrollEntryType, string> = {
  initial:    'var(--cyan)',
  deposit:    'var(--green)',
  withdrawal: 'var(--red)',
  rakeback:   'var(--gold)',
  adjustment: 'var(--text-muted)',
  transfer:   '#a78bfa',
}

// ── Breakdown Modal ─────────────────────────────────────────────────────────
function BreakdownModal({ title, rows, onClose }: {
  title: string
  rows: { label: string; value: string; color?: string }[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 min-w-[240px] max-w-sm mx-4 max-h-80 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white"><X size={15} /></button>
        </div>
        {rows.length === 0
          ? <p className="text-xs text-[var(--text-muted)]">Sem dados para exibir.</p>
          : rows.map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/40 last:border-0">
              <span className="text-xs text-[var(--text-muted)]">{r.label}</span>
              <span className="text-xs font-bold" style={{ color: r.color ?? 'var(--foreground)' }}>{r.value}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, positive, highlighted, onClick }: {
  label: string
  value: string
  sub?: string
  positive?: boolean
  highlighted?: boolean
  onClick?: () => void
}) {
  const valueColor = positive === true
    ? 'var(--green)'
    : positive === false
    ? 'var(--red)'
    : 'var(--foreground)'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group rounded-xl p-4 transition-all',
        highlighted && positive === true
          ? 'bg-[var(--green)]/8 border border-[var(--green)]/40'
          : highlighted && positive === false
          ? 'bg-[var(--red)]/8 border border-[var(--red)]/40'
          : 'bg-[var(--surface-1)] border border-[var(--border)]',
        onClick && 'cursor-pointer hover:border-[var(--border-hi)]',
      )}
    >
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-medium mb-2">{label}</p>
      <p className="text-xl font-black" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-1">{sub}</p>}
      {onClick && (
        <p className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          ver por sala →
        </p>
      )}
    </div>
  )
}

function SmallStatCard({ label, value, color, sub }: {
  label: string; value: string; color?: string; sub?: string
}) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-base font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function BancaClient({
  entries, sessions, platforms,
}: {
  entries: Entry[]
  sessions: Session[]
  platforms: Platform[]
}) {
  const router = useRouter()
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [defaultType, setDefaultType] = useState<BankrollEntryType>('deposit')
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [showDayClose, setShowDayClose] = useState(false)
  const [modal, setModal] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // ── Aggregates ──────────────────────────────────────────────────────────
  const bancaInicial = useMemo(() =>
    entries.filter(e => e.type === 'initial').reduce((a, e) => a + e.amount_cents, 0),
  [entries])

  const reloads = useMemo(() =>
    entries.filter(e => e.type === 'deposit').reduce((a, e) => a + e.amount_cents, 0),
  [entries])

  const saques = useMemo(() =>
    entries.filter(e => e.type === 'withdrawal').reduce((a, e) => a + Math.abs(e.amount_cents), 0),
  [entries])

  const rakeback = useMemo(() =>
    entries.filter(e => e.type === 'rakeback').reduce((a, e) => a + e.amount_cents, 0),
  [entries])

  const adjustments = useMemo(() =>
    entries.filter(e => e.type === 'adjustment').reduce((a, e) => a + e.amount_cents, 0),
  [entries])

  const transferencias = useMemo(() =>
    entries.filter(e => e.type === 'transfer'),
  [entries])

  const totalTransferido = transferencias.reduce((a, e) => a + Math.abs(e.amount_cents), 0)

  const sessionProfit = useMemo(() =>
    sessions.reduce((a, s) => a + s.profit_cents, 0),
  [sessions])

  const bancaAtual = bancaInicial + reloads + rakeback + adjustments + sessionProfit - saques

  // GANHOS TOTAIS: tudo que ganhou jogando + rakeback + ajustes (sem contar depósitos/sangrias)
  const ganhosTotais = sessionProfit + rakeback + adjustments

  const totalInvested = sessions.reduce((a, s) => a + s.buy_in_cents, 0)
  const roi = totalInvested > 0 ? (sessionProfit / totalInvested) * 100 : 0

  // ── Por plataforma (para modais) ────────────────────────────────────────
  const byPlatform = useMemo(() => {
    const map = new Map<string, {
      name: string; inicial: number; reloads: number; saques: number
      rakeback: number; adjustments: number; profit: number; transfers: number
    }>()

    for (const s of sessions) {
      const cur = map.get(s.platform_id) ?? { name: s.platform_name, inicial: 0, reloads: 0, saques: 0, rakeback: 0, adjustments: 0, profit: 0, transfers: 0 }
      cur.profit += s.profit_cents
      map.set(s.platform_id, cur)
    }

    for (const e of entries) {
      if (!e.platform_id || e.type === 'transfer') continue
      let cur = map.get(e.platform_id)
      if (!cur) {
        const pl = platforms.find(p => p.id === e.platform_id)
        if (!pl) continue
        cur = { name: pl.name, inicial: 0, reloads: 0, saques: 0, rakeback: 0, adjustments: 0, profit: 0, transfers: 0 }
      }
      if (e.type === 'initial')    cur.inicial     += e.amount_cents
      if (e.type === 'deposit')    cur.reloads     += e.amount_cents
      if (e.type === 'withdrawal') cur.saques      += Math.abs(e.amount_cents)
      if (e.type === 'rakeback')   cur.rakeback    += e.amount_cents
      if (e.type === 'adjustment') cur.adjustments += e.amount_cents
      map.set(e.platform_id, cur)
    }

    return [...map.entries()].map(([id, v]) => ({
      id, name: v.name,
      inicial: v.inicial, reloads: v.reloads, saques: v.saques, profit: v.profit,
      ganhos: v.profit + v.rakeback + v.adjustments,
      atual: v.inicial + v.reloads + v.rakeback + v.adjustments + v.profit - v.saques,
    })).sort((a, b) => b.atual - a.atual)
  }, [entries, sessions, platforms])

  function buildModalRows(key: string): { label: string; value: string; color?: string }[] {
    switch (key) {
      case 'bancaInicial':
        return byPlatform.map(p => ({ label: p.name, value: fmt(p.inicial) }))
      case 'bancaAtual':
        return byPlatform.map(p => ({ label: p.name, value: fmt(p.atual, true), color: p.atual >= 0 ? 'var(--green)' : 'var(--red)' }))
      case 'saques':
        return byPlatform.map(p => ({ label: p.name, value: p.saques > 0 ? fmt(p.saques) : '—' }))
      case 'transferencias':
        return transferencias.length === 0
          ? []
          : transferencias.map(e => {
              const from = platforms.find(p => p.id === e.platform_id)
              return { label: from?.name ?? 'Global', value: fmt(Math.abs(e.amount_cents)), color: 'var(--text-dim)' }
            })
      case 'ganhos':
        return byPlatform.map(p => ({ label: p.name, value: fmt(p.ganhos, true), color: p.ganhos >= 0 ? 'var(--green)' : 'var(--red)' }))
      case 'reloads':
        return byPlatform.map(p => ({ label: p.name, value: p.reloads > 0 ? fmt(p.reloads) : '—' }))
      default:
        return []
    }
  }

  const modalTitles: Record<string, string> = {
    bancaInicial: 'Banca Inicial por Sala', bancaAtual: 'Banca Atual por Sala',
    saques: 'Saques por Sala', transferencias: 'Histórico de Transferências',
    ganhos: 'Ganhos Totais por Sala', reloads: 'Reloads por Sala',
  }

  const todaySessions = useMemo(() =>
    sessions.filter(s => s.played_at === today),
  [sessions, today])

  function openEntry(type: BankrollEntryType) {
    setDefaultType(type)
    setShowEntryModal(true)
  }

  function handleSuccess() { router.refresh() }

  const hasInitial = bancaInicial > 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {modal && (
        <BreakdownModal
          title={modalTitles[modal] ?? modal}
          rows={buildModalRows(modal)}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Banca</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {todaySessions.length > 0 && (
            <button onClick={() => setShowDayClose(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-xs font-semibold hover:bg-[var(--gold)]/18 transition-colors">
              <CalendarCheck size={13} /> Fechar Caixa
            </button>
          )}
          <button onClick={() => openEntry('transfer')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/18 transition-colors">
            <ArrowLeftRight size={13} /> Transferir
          </button>
          <button onClick={() => openEntry('deposit')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-xs font-semibold hover:bg-[var(--green)]/18 transition-colors">
            <ArrowDownLeft size={13} /> Reload
          </button>
          <button onClick={() => openEntry('withdrawal')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] text-xs font-semibold hover:bg-[var(--red)]/18 transition-colors">
            <ArrowUpRight size={13} /> Sangria
          </button>
        </div>
      </div>

      {/* ── Linha 1: 4 cards principais ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Banca Inicial"
          value={fmt(bancaInicial)}
          sub={hasInitial ? `${entries.filter(e => e.type === 'initial').length} lançamento(s)` : 'não definida'}
          onClick={() => setModal('bancaInicial')}
        />
        <MetricCard
          label="Banca Atual"
          value={fmt(bancaAtual)}
          sub={bancaAtual >= 0 ? 'saldo líquido' : 'saldo negativo'}
          positive={bancaAtual >= 0 ? true : false}
          highlighted
          onClick={() => setModal('bancaAtual')}
        />
        <MetricCard
          label="Saques"
          value={fmt(saques)}
          sub={`${entries.filter(e => e.type === 'withdrawal').length} retirada(s)`}
          onClick={() => setModal('saques')}
        />
        <MetricCard
          label="Transferências"
          value={transferencias.length > 0 ? fmt(totalTransferido) : '—'}
          sub={`${transferencias.length} movimentação(ões)`}
          onClick={() => setModal('transferencias')}
        />
      </div>

      {/* ── Linha 2: stats menores ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SmallStatCard
          label="Ganhos Totais"
          value={fmt(ganhosTotais, true)}
          color={ganhosTotais >= 0 ? 'var(--green)' : 'var(--red)'}
          sub={`${sessions.length} torneios`}
        />
        <SmallStatCard
          label="Reloads"
          value={reloads > 0 ? fmt(reloads) : '—'}
          sub={`${entries.filter(e => e.type === 'deposit').length} depósito(s)`}
        />
        <SmallStatCard
          label="Rakeback"
          value={rakeback > 0 ? fmt(rakeback) : '—'}
          color={rakeback > 0 ? 'var(--gold)' : undefined}
          sub={`${entries.filter(e => e.type === 'rakeback').length} entrada(s)`}
        />
        <SmallStatCard
          label="ROI"
          value={sessions.length > 0 ? (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%' : '—'}
          color={roi >= 0 ? 'var(--green)' : 'var(--red)'}
          sub={totalInvested > 0 ? `buy-in: ${fmt(totalInvested)}` : undefined}
        />
      </div>

      {/* ── Por Plataforma ────────────────────────────────────── */}
      {byPlatform.length > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-medium">Por Sala</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Sala', 'Inicial', 'Reloads', 'Saques', 'Profit', 'Atual'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byPlatform.map(p => (
                  <tr key={p.id} className="border-b border-[var(--border)]/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)] text-sm">{p.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-sm">{fmt(p.inicial)}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-sm">{p.reloads > 0 ? fmt(p.reloads) : '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.saques > 0 ? <span className="text-[var(--red)]">-{fmt(p.saques)}</span> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={p.profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{fmt(p.profit, true)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      <span className={p.atual >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{fmt(p.atual, true)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Histórico de Transações ───────────────────────────── */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-medium">
            Histórico de Transações
          </p>
          {!hasInitial && (
            <button onClick={() => openEntry('initial')}
              className="flex items-center gap-1 text-xs text-[var(--cyan)] hover:underline">
              <Plus size={11} /> Definir banca inicial
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Wallet size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Nenhuma transação registrada.</p>
            <button onClick={() => openEntry('initial')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/40 text-[var(--cyan)] text-xs font-semibold hover:bg-[var(--cyan)]/18 transition-colors">
              <Plus size={13} /> Definir Banca Inicial
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {entries.map(e => (
              <EntryRow key={e.id} entry={e} platforms={platforms} onDelete={handleSuccess} onEdit={setEditEntry} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ───────────────────────────────────────────── */}
      {showEntryModal && (
        <BancaEntryModal
          platforms={platforms}
          defaultType={defaultType}
          onClose={() => setShowEntryModal(false)}
          onSuccess={() => { setShowEntryModal(false); handleSuccess() }}
        />
      )}

      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          platforms={platforms}
          onClose={() => setEditEntry(null)}
          onSuccess={() => { setEditEntry(null); handleSuccess() }}
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

// ── Entry Row ───────────────────────────────────────────────────────────────
function EntryRow({ entry, platforms, onDelete, onEdit }: {
  entry: Entry
  platforms: Platform[]
  onDelete: () => void
  onEdit: (e: Entry) => void
}) {
  const [deleting, setDeleting] = useState(false)
  type EX = Entry & { to_platform_id?: string | null }
  const e = entry as EX

  const platform   = platforms.find(p => p.id === e.platform_id)
  const toPlatform = platforms.find(p => p.id === e.to_platform_id)
  const color = TYPE_COLOR[e.type]
  const label = TYPE_LABELS[e.type]
  const isOut = e.type === 'withdrawal' || (e.type === 'adjustment' && e.amount_cents < 0)

  async function handleDelete() {
    if (!confirm('Remover esta entrada?')) return
    setDeleting(true)
    await fetch('/api/bankroll', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id }),
    })
    setDeleting(false)
    onDelete()
  }

  const Icon = e.type === 'withdrawal' ? ArrowUpRight
    : e.type === 'deposit'            ? ArrowDownLeft
    : e.type === 'transfer'           ? Repeat2
    : e.type === 'rakeback'           ? TrendingUp
    : e.type === 'initial'            ? Wallet
    : TrendingDown

  return (
    <div className="flex items-center justify-between px-4 py-3 group hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon size={13} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {e.type === 'transfer'
                ? `${platform?.name ?? 'Global'} → ${toPlatform?.name ?? '?'}`
                : platform ? platform.name : 'Global'}
            </span>
            {e.notes && <span className="text-[10px] text-[var(--text-dim)] truncate">{e.notes}</span>}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{e.date}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-sm font-bold tabular-nums" style={{ color: isOut ? 'var(--red)' : 'var(--green)' }}>
          {isOut ? '-' : '+'}{fmt(Math.abs(e.amount_cents))}
        </span>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(entry)} title="Editar"
            className="text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={handleDelete} disabled={deleting} title="Remover"
            className="text-[var(--text-dim)] hover:text-[var(--red)] transition-colors disabled:opacity-30">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Entry Modal ────────────────────────────────────────────────────────
function EditEntryModal({ entry, platforms, onClose, onSuccess }: {
  entry: Entry
  platforms: Platform[]
  onClose: () => void
  onSuccess: () => void
}) {
  type EX = Entry & { to_platform_id?: string | null }
  const e = entry as EX

  const [amount, setAmount] = useState((Math.abs(e.amount_cents) / 100).toFixed(2))
  const [platformId, setPlatformId] = useState(e.platform_id ?? '')
  const [date, setDate] = useState(e.date)
  const [notes, setNotes] = useState(e.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents === 0) { setError('Valor inválido'); return }

    const finalCents = e.type === 'withdrawal' ? Math.abs(amountCents) : amountCents

    setLoading(true)
    const res = await fetch('/api/bankroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: e.id,
        amount_cents: finalCents,
        platform_id: platformId || null,
        date,
        notes: notes || null,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? `Erro ${res.status}`); return
    }
    onSuccess()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-[var(--foreground)]">Editar {TYPE_LABELS[e.type]}</h2>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Valor ($) <span className="text-[var(--red)]">*</span></label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} required className={inputCls} />
          </div>

          {platforms.length > 0 && e.type !== 'transfer' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Plataforma</label>
              <select value={platformId} onChange={ev => setPlatformId(ev.target.value)} className={inputCls}>
                <option value="">— Global —</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Data</label>
            <input type="date" value={date} onChange={ev => setDate(ev.target.value)} required className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Notas</label>
            <input type="text" value={notes} onChange={ev => setNotes(ev.target.value)}
              placeholder="Observação opcional..." className={inputCls} />
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:opacity-90 text-white font-bold text-sm transition-opacity disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
