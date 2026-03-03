'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestionStatus } from '@/lib/supabase/types'

interface Suggestion {
  id: string
  title: string
  body: string
  status: SuggestionStatus
  admin_notes: string | null
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

const STATUS_OPTIONS: { value: SuggestionStatus; label: string }[] = [
  { value: 'pending',     label: 'Pendente' },
  { value: 'reviewing',   label: 'Em Análise' },
  { value: 'approved',    label: 'Aprovado' },
  { value: 'implemented', label: 'Implementado' },
  { value: 'rejected',    label: 'Rejeitado' },
]

const STATUS_COLOR: Record<SuggestionStatus, string> = {
  pending:     '#f59e0b',
  reviewing:   '#60a5fa',
  approved:    'var(--green)',
  implemented: 'var(--cyan)',
  rejected:    'var(--red)',
}

type FilterStatus = 'all' | SuggestionStatus

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',         label: 'Todas' },
  { value: 'pending',     label: 'Pendente' },
  { value: 'reviewing',   label: 'Em Análise' },
  { value: 'approved',    label: 'Aprovado' },
  { value: 'implemented', label: 'Implementado' },
  { value: 'rejected',    label: 'Rejeitado' },
]

export default function AdminSugestoesClient({ initialSuggestions }: { initialSuggestions: Suggestion[] }) {
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.status === filter)

  const counts: Record<FilterStatus, number> = {
    all: suggestions.length,
    pending:     suggestions.filter(s => s.status === 'pending').length,
    reviewing:   suggestions.filter(s => s.status === 'reviewing').length,
    approved:    suggestions.filter(s => s.status === 'approved').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
    rejected:    suggestions.filter(s => s.status === 'rejected').length,
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  function updateLocal(id: string, status: SuggestionStatus, adminNotes: string) {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status, admin_notes: adminNotes } : s))
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              filter === f.value
                ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:border-[var(--border-hi)]'
            )}
          >
            {f.label}
            <span className={cn(
              'inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold',
              filter === f.value ? 'bg-[var(--cyan)] text-black' : 'bg-white/10 text-[var(--text-muted)]'
            )}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Nenhuma sugestão encontrada.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              expanded={expanded === s.id}
              onToggle={() => toggleExpand(s.id)}
              onSave={updateLocal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  expanded,
  onToggle,
  onSave,
}: {
  suggestion: Suggestion
  expanded: boolean
  onToggle: () => void
  onSave: (id: string, status: SuggestionStatus, notes: string) => void
}) {
  const [status, setStatus] = useState<SuggestionStatus>(suggestion.status)
  const [notes, setNotes] = useState(suggestion.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suggestion.id, status, admin_notes: notes }),
    })
    setSaving(false)
    setSaved(true)
    onSave(suggestion.id, status, notes)
    setTimeout(() => setSaved(false), 2000)
  }

  const color = STATUS_COLOR[suggestion.status]
  const author = suggestion.profiles?.full_name ?? suggestion.profiles?.email ?? 'Aluno'

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ color, backgroundColor: color + '18' }}
            >
              {STATUS_OPTIONS.find(o => o.value === suggestion.status)?.label}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">{author}</span>
            <span className="text-[11px] text-[var(--text-dim)]">·</span>
            <span className="text-[11px] text-[var(--text-dim)]">
              {new Date(suggestion.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <p className="text-sm font-semibold text-white truncate">{suggestion.title}</p>
          {!expanded && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{suggestion.body}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
        ) : (
          <ChevronDown size={15} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] pt-3 whitespace-pre-wrap">{suggestion.body}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SuggestionStatus)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--cyan)]/60 transition-colors"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Notas internas</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Opcional..."
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {saved && <span className="text-xs text-[var(--green)]">Salvo!</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
