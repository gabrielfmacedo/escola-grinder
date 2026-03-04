'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatConfig {
  id: string
  name: string
  unit: string
  ideal_min: number | null
  ideal_max: number | null
  description: string | null
}

interface PlayerStat {
  id: string
  stat_config_id: string
  value: number
  recorded_at: string
}

interface Override {
  stat_config_id: string
  ideal_min: number | null
  ideal_max: number | null
}

interface Note {
  id: string
  note_date: string
  content: string
  created_at: string
  admin?: { full_name: string } | null
}

function statStatus(value: number, minEffective: number | null, maxEffective: number | null) {
  if (minEffective === null && maxEffective === null) return 'neutral'
  if (minEffective !== null && value < minEffective) return 'low'
  if (maxEffective !== null && value > maxEffective) return 'high'
  return 'ideal'
}

const STATUS_CFG = {
  low:     { label: 'Baixo',  color: 'text-[var(--red)]',   bg: 'bg-[var(--red)]/10',   dot: '🔴' },
  ideal:   { label: 'Ideal',  color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10', dot: '🟢' },
  high:    { label: 'Alto',   color: 'text-[var(--gold)]',  bg: 'bg-[var(--gold)]/10',  dot: '🟡' },
  neutral: { label: '—',      color: 'text-[var(--text-muted)]', bg: '', dot: '⚪' },
}

export default function MentoriaAdminTab({ userId }: { userId: string }) {
  const [configs, setConfigs]     = useState<StatConfig[]>([])
  const [stats, setStats]         = useState<PlayerStat[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [notes, setNotes]         = useState<Note[]>([])
  const [loading, setLoading]     = useState(true)

  // Stats UI state
  const [expandedStat, setExpandedStat] = useState<string | null>(null)
  const [addingStatId, setAddingStatId] = useState<string | null>(null)
  const [newValue, setNewValue]         = useState('')
  const [newDate, setNewDate]           = useState(new Date().toISOString().slice(0, 10))
  const [editOverride, setEditOverride] = useState<string | null>(null)
  const [overrideMin, setOverrideMin]   = useState('')
  const [overrideMax, setOverrideMax]   = useState('')

  // Notes UI state
  const [editNoteId, setEditNoteId]   = useState<string | null>(null)  // null = new note
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteDate, setNoteDate]         = useState(new Date().toISOString().slice(0, 10))
  const [noteContent, setNoteContent]   = useState('')
  const [saving, setSaving]             = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [statsRes, notesRes] = await Promise.all([
      fetch(`/api/admin/player-stats?user_id=${userId}`),
      fetch(`/api/admin/mentoring-notes?user_id=${userId}`),
    ])
    const statsData = await statsRes.json()
    const notesData = await notesRes.json()
    setConfigs(statsData.configs ?? [])
    setStats(statsData.stats ?? [])
    setOverrides(statsData.overrides ?? [])
    setNotes(notesData ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  // ─── STATS ───────────────────────────────────────────

  function latestStat(configId: string) {
    return stats.find(s => s.stat_config_id === configId)
  }

  function historyFor(configId: string) {
    return stats.filter(s => s.stat_config_id === configId)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  }

  function effectiveRange(config: StatConfig): [number | null, number | null] {
    const ov = overrides.find(o => o.stat_config_id === config.id)
    return [ov?.ideal_min ?? config.ideal_min, ov?.ideal_max ?? config.ideal_max]
  }

  async function addSnapshot(configId: string) {
    const v = parseFloat(newValue)
    if (isNaN(v)) return
    await fetch('/api/admin/player-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, stat_config_id: configId, value: v, recorded_at: newDate }),
    })
    setNewValue('')
    setAddingStatId(null)
    load()
  }

  async function deleteSnapshot(id: string) {
    await fetch('/api/admin/player-stats', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  function startOverride(config: StatConfig) {
    const [min, max] = effectiveRange(config)
    setOverrideMin(min !== null ? String(min) : '')
    setOverrideMax(max !== null ? String(max) : '')
    setEditOverride(config.id)
  }

  async function saveOverride(configId: string) {
    await fetch('/api/admin/player-stats', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        stat_config_id: configId,
        ideal_min: overrideMin !== '' ? parseFloat(overrideMin) : null,
        ideal_max: overrideMax !== '' ? parseFloat(overrideMax) : null,
      }),
    })
    setEditOverride(null)
    load()
  }

  // ─── NOTES ───────────────────────────────────────────

  function openNewNote() {
    setEditNoteId(null)
    setNoteDate(new Date().toISOString().slice(0, 10))
    setNoteContent('')
    setShowNoteForm(true)
  }

  function openEditNote(note: Note) {
    setEditNoteId(note.id)
    setNoteDate(note.note_date)
    setNoteContent(note.content)
    setShowNoteForm(true)
  }

  async function saveNote() {
    if (!noteContent.trim()) return
    setSaving(true)
    if (editNoteId) {
      await fetch(`/api/admin/mentoring-notes/${editNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_date: noteDate, content: noteContent }),
      })
    } else {
      await fetch('/api/admin/mentoring-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, note_date: noteDate, content: noteContent }),
      })
    }
    setSaving(false)
    setShowNoteForm(false)
    load()
  }

  async function deleteNote(id: string) {
    await fetch(`/api/admin/mentoring-notes/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-[var(--text-muted)] animate-pulse">Carregando...</div>
  }

  return (
    <div className="space-y-6">

      {/* ── ESTATÍSTICAS ─────────────────────────────── */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Estatísticas Ideal vs Real</h2>
          {configs.length === 0 && (
            <span className="text-xs text-[var(--text-muted)]">Crie configs em Admin → Mentoria</span>
          )}
        </div>

        {configs.length === 0 ? (
          <p className="text-center py-8 text-xs text-[var(--text-muted)]">Nenhuma estatística configurada ainda.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {configs.map(cfg => {
              const latest = latestStat(cfg.id)
              const [eMin, eMax] = effectiveRange(cfg)
              const status = latest ? statStatus(latest.value, eMin, eMax) : 'neutral'
              const st = STATUS_CFG[status]
              const history = historyFor(cfg.id)
              const isExpanded = expandedStat === cfg.id

              return (
                <div key={cfg.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-base">{st.dot}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{cfg.name}</p>
                        {overrides.find(o => o.stat_config_id === cfg.id) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)] font-semibold uppercase tracking-wide">override</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Ideal: {eMin ?? '—'} – {eMax ?? '—'} {cfg.unit}
                      </p>
                    </div>

                    {latest && (
                      <span className={cn('text-sm font-black tabular-nums', st.color)}>
                        {latest.value}{cfg.unit}
                      </span>
                    )}
                    {!latest && (
                      <span className="text-sm text-[var(--text-muted)]">—</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setAddingStatId(addingStatId === cfg.id ? null : cfg.id); setNewValue(''); setNewDate(new Date().toISOString().slice(0,10)) }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                        title="Adicionar leitura"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => startOverride(cfg)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                        title="Override de metas"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedStat(isExpanded ? null : cfg.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                        title="Ver histórico"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <History size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Add snapshot form */}
                  {addingStatId === cfg.id && (
                    <div className="px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`Valor (${cfg.unit})`}
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        className="input-field flex-1 py-1.5 text-sm"
                      />
                      <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="input-field py-1.5 text-sm"
                      />
                      <button onClick={() => addSnapshot(cfg.id)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--green)] text-black text-xs font-bold">
                        Salvar
                      </button>
                      <button onClick={() => setAddingStatId(null)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)]">
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Override form */}
                  {editOverride === cfg.id && (
                    <div className="px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] space-y-2">
                      <p className="text-xs text-[var(--gold)] font-semibold">Override de metas para este jogador</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Mín" value={overrideMin} onChange={e => setOverrideMin(e.target.value)}
                          className="input-field flex-1 py-1.5 text-sm" />
                        <span className="text-[var(--text-muted)]">–</span>
                        <input type="number" placeholder="Máx" value={overrideMax} onChange={e => setOverrideMax(e.target.value)}
                          className="input-field flex-1 py-1.5 text-sm" />
                        <button onClick={() => saveOverride(cfg.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--gold)] text-black text-xs font-bold">Salvar</button>
                        <button onClick={() => setEditOverride(null)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)]">X</button>
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {isExpanded && (
                    <div className="px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)]">
                      {history.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">Sem leituras registradas.</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {history.map(h => {
                            const s = statStatus(h.value, eMin, eMax)
                            const sc = STATUS_CFG[s]
                            return (
                              <div key={h.id} className="flex items-center justify-between text-xs">
                                <span className="text-[var(--text-muted)]">{new Date(h.recorded_at + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                <span className={cn('font-bold tabular-nums', sc.color)}>{h.value}{cfg.unit}</span>
                                <button onClick={() => deleteSnapshot(h.id)}
                                  className="text-[var(--text-muted)] hover:text-[var(--red)] transition-colors ml-2">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── NOTAS X1 ─────────────────────────────────── */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Notas de X1</h2>
          <button
            onClick={openNewNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cyan)] text-black text-xs font-bold"
          >
            <Plus size={12} /> Nova Nota
          </button>
        </div>

        {/* Note form */}
        {showNoteForm && (
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)] space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-muted)] shrink-0">Data:</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="input-field py-1.5 text-sm" />
            </div>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              rows={5}
              placeholder="Registre os pontos discutidos, mãos revisadas, metas para próxima sessão..."
              className="input-field w-full resize-none text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNoteForm(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-dim)] hover:text-white">
                Cancelar
              </button>
              <button onClick={saveNote} disabled={saving || !noteContent.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--cyan)] text-black text-xs font-bold disabled:opacity-50">
                <Save size={12} />{saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 && !showNoteForm ? (
          <p className="text-center py-8 text-xs text-[var(--text-muted)]">Nenhuma nota registrada ainda.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notes.map(note => (
              <div key={note.id} className="px-5 py-4 group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-dim)]">
                      {new Date(note.note_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    {note.admin?.full_name && (
                      <span className="text-[11px] text-[var(--text-muted)] ml-2">· por {note.admin.full_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditNote(note)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteNote(note.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--red)] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-dim)] whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
