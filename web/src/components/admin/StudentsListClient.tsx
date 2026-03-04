'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, KeyRound, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import EditAuthModal from '@/components/admin/EditAuthModal'

interface Student {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  subscriptions: { status: string; plans: { name: string; type: string } | null }[] | null
}

const ROLE_CONFIG = {
  student:    { label: 'Aluno',     color: 'text-[var(--green)] bg-[var(--green)]/10' },
  instructor: { label: 'Instrutor', color: 'text-[var(--blue)] bg-[var(--blue)]/10'   },
  admin:      { label: 'Admin',     color: 'text-[var(--gold)] bg-[var(--gold)]/10'   },
} as const

function RowMenu({ student, onDelete }: { student: Student; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch('/api/admin/update-student', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id }),
    })
    setDeleting(false)
    if (res.ok) onDelete(student.id)
    setOpen(false)
    setConfirming(false)
  }

  return (
    <>
      {showAuth && (
        <EditAuthModal
          student={student}
          onClose={() => setShowAuth(false)}
        />
      )}

      <div ref={ref} className="relative" onClick={e => e.preventDefault()}>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <MoreHorizontal size={15} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl shadow-xl w-48 py-1 text-sm">
            <button
              onClick={() => { setOpen(false); setShowAuth(true) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-colors"
            >
              <KeyRound size={13} /> Editar Credenciais
            </button>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
              >
                <Trash2 size={13} /> Excluir Usuário
              </button>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <p className="text-[11px] text-[var(--text-muted)]">Tem certeza? Esta ação é irreversível.</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 text-xs py-1 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 text-xs py-1 rounded-lg bg-[var(--red)] text-white font-bold disabled:opacity-50"
                  >
                    {deleting ? '...' : 'Excluir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function StudentsListClient({ students }: { students: Student[] }) {
  const router = useRouter()
  const [list, setList] = useState(students)

  function handleDelete(id: string) {
    setList(prev => prev.filter(s => s.id !== id))
    router.refresh()
  }

  if (!list.length) return null

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Aluno</span>
        <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-24 text-center">Plano</span>
        <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-20 text-center">Perfil</span>
        <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-28 text-right">Cadastro</span>
        <span className="w-8" />
      </div>

      {list.map(s => {
        const roleCfg = ROLE_CONFIG[s.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.student
        const sub = s.subscriptions?.[0]
        const planName = sub?.plans?.name ?? '—'
        const planActive = sub?.status === 'active'

        return (
          <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-white/[0.025] transition-colors group">
            {/* Aluno */}
            <Link href={`/admin/alunos/${s.id}`} className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-black">{s.full_name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.full_name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{s.email}</p>
              </div>
            </Link>

            {/* Plano */}
            <div className="w-24 text-center">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                planActive ? 'text-[var(--cyan)] bg-[var(--cyan)]/10' : 'text-[var(--text-muted)] bg-[var(--surface-3)]'
              )}>
                {planName}
              </span>
            </div>

            {/* Role */}
            <div className="w-20 text-center">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleCfg.color)}>
                {roleCfg.label}
              </span>
            </div>

            {/* Data */}
            <p className="text-xs text-[var(--text-muted)] w-28 text-right">
              {new Date(s.created_at).toLocaleDateString('pt-BR')}
            </p>

            {/* Actions */}
            <div className="w-8 flex justify-end">
              <RowMenu student={s} onDelete={handleDelete} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
