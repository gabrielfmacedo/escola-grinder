'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Group { id: string; name: string; color: string | null }

interface EditStudentModalProps {
  student: { id: string; full_name: string; role: string }
  groups: Group[]
  memberGroupIds: string[]
  onClose: () => void
}

const ROLES = [
  { value: 'student', label: 'Aluno' },
  { value: 'instructor', label: 'Instrutor' },
  { value: 'admin', label: 'Admin' },
]

export default function EditStudentModal({ student, groups, memberGroupIds, onClose }: EditStudentModalProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(student.full_name)
  const [role, setRole] = useState(student.role)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(memberGroupIds))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/admin/update-student', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: student.id,
        full_name: fullName,
        role,
        group_ids: [...selectedGroups],
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao salvar')
      return
    }

    onClose()
    router.refresh()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white">Editar Aluno</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Nome completo</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-medium">Perfil</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {groups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Grupos</label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors',
                      selectedGroups.has(g.id)
                        ? 'text-white border-transparent'
                        : 'text-[var(--text-dim)] border-[var(--border)] hover:border-[var(--border-hi)]'
                    )}
                    style={selectedGroups.has(g.id) ? { background: (g.color ?? '#3b9ef5') + '30', border: `1px solid ${g.color ?? '#3b9ef5'}50`, color: g.color ?? '#3b9ef5' } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ background: g.color ?? '#3b9ef5' }} />
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-[var(--red)]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
