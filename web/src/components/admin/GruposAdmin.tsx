'use client'

import { useState } from 'react'
import { Plus, X, Users, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile { id: string; full_name: string; email: string }
interface Group {
  id: string
  name: string
  color: string
  description: string | null
  player_group_members: { user_id: string }[]
}

const PALETTE = ['#e63030', '#f0c040', '#3b9ef5', '#22c55e', '#a855f7', '#f97316']

export default function GruposAdmin({
  initialGroups,
  students,
}: {
  initialGroups: Group[]
  students: Profile[]
}) {
  const [groups, setGroups] = useState(initialGroups)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', color: PALETTE[0], description: '' })
  const [addEmail, setAddEmail] = useState<Record<string, string>>({})

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, color: form.color, description: form.description || null }),
    })
    if (res.ok) {
      const { id } = await res.json()
      setGroups(prev => [...prev, { id, name: form.name, color: form.color, description: form.description || null, player_group_members: [] }])
      setForm({ name: '', color: PALETTE[0], description: '' })
      setShowCreate(false)
    }
    setCreating(false)
  }

  async function deleteGroup(id: string) {
    if (!confirm('Excluir este grupo?')) return
    setDeleting(id)
    await fetch('/api/admin/groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setGroups(prev => prev.filter(g => g.id !== id))
    setDeleting(null)
  }

  async function addMember(groupId: string) {
    const email = addEmail[groupId]?.trim()
    if (!email) return
    const student = students.find(s => s.email.toLowerCase() === email.toLowerCase())
    if (!student) { alert('Aluno não encontrado com esse email.'); return }

    setAddingMember(groupId)
    const res = await fetch('/api/admin/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: student.id }),
    })
    if (res.ok) {
      setGroups(prev => prev.map(g =>
        g.id === groupId
          ? { ...g, player_group_members: [...g.player_group_members, { user_id: student.id }] }
          : g
      ))
      setAddEmail(prev => ({ ...prev, [groupId]: '' }))
    }
    setAddingMember(null)
  }

  async function removeMember(groupId: string, userId: string) {
    setRemovingMember(userId)
    await fetch('/api/admin/groups/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: userId }),
    })
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, player_group_members: g.player_group_members.filter(m => m.user_id !== userId) }
        : g
    ))
    setRemovingMember(null)
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
    <div className="space-y-4">
      {/* Create button */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--gold)]/50 hover:text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> Novo Grupo
        </button>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">Criar Grupo</h2>
            <button onClick={() => setShowCreate(false)} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={createGroup} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputCls} placeholder="Ex: Turma A, Iniciantes..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Cor</label>
              <div className="flex gap-2">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('w-7 h-7 rounded-full border-2 transition-all', form.color === c ? 'border-white scale-110' : 'border-transparent')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Descrição</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Opcional" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold text-sm transition-colors disabled:opacity-50">
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? 'Criando...' : 'Criar Grupo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      {!groups.length && (
        <div className="text-center py-12 text-sm text-[var(--text-muted)]">
          Nenhum grupo criado ainda.
        </div>
      )}

      <div className="space-y-3">
        {groups.map(g => {
          const memberIds = new Set(g.player_group_members.map(m => m.user_id))
          const members = students.filter(s => memberIds.has(s.id))
          const isExpanded = expandedId === g.id

          return (
            <div key={g.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{g.name}</p>
                  {g.description && <p className="text-xs text-[var(--text-muted)] truncate">{g.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Users size={12} />
                  {members.length}
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : g.id)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                <button onClick={() => deleteGroup(g.id)} disabled={deleting === g.id}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors">
                  {deleting === g.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>

              {/* Expanded members */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] p-5 space-y-3">
                  {/* Add member */}
                  <div className="flex gap-2">
                    <input
                      value={addEmail[g.id] ?? ''}
                      onChange={e => setAddEmail(prev => ({ ...prev, [g.id]: e.target.value }))}
                      placeholder="Email do aluno"
                      className={cn(inputCls, 'flex-1')}
                      list={`members-${g.id}`}
                    />
                    <datalist id={`members-${g.id}`}>
                      {students.filter(s => !memberIds.has(s.id)).map(s => (
                        <option key={s.id} value={s.email}>{s.full_name}</option>
                      ))}
                    </datalist>
                    <button onClick={() => addMember(g.id)} disabled={addingMember === g.id}
                      className="px-4 py-2 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white text-sm font-bold transition-colors disabled:opacity-50 shrink-0">
                      {addingMember === g.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </div>

                  {/* Members list */}
                  {members.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-2">Nenhum membro ainda.</p>
                  )}
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--surface-2)]">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{m.full_name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">{m.email}</p>
                        </div>
                        <button onClick={() => removeMember(g.id, m.id)} disabled={removingMember === m.id}
                          className="ml-2 p-1 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors shrink-0">
                          {removingMember === m.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
