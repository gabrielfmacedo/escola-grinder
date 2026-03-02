'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'individual' | 'bulk'

export default function AddStudentButton() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('individual')

  // Individual form
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bulk import
  const [bulkEmails, setBulkEmails] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ sent: number; errors: string[]; total: number } | null>(null)

  const router = useRouter()

  function handleClose() {
    setOpen(false)
    setForm({ full_name: '', email: '', password: '' })
    setError(null)
    setBulkEmails('')
    setBulkResult(null)
    setTab('individual')
  }

  async function handleIndividual(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    handleClose()
    router.refresh()
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault()
    const emails = bulkEmails.split('\n').map(l => l.trim()).filter(Boolean)
    if (!emails.length) return
    setBulkLoading(true); setBulkResult(null)
    const res = await fetch('/api/admin/import-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    })
    const data = await res.json()
    setBulkLoading(false)
    setBulkResult(data)
    if (data.sent > 0) router.refresh()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors">
        <Plus size={14} /> Adicionar aluno
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[var(--foreground)]">Adicionar Aluno</h2>
              <button onClick={handleClose} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-1 gap-0.5 mb-4">
              {([['individual', 'Individual'], ['bulk', 'Em Massa']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    tab === key ? 'bg-[var(--gold)] text-black' : 'text-[var(--text-muted)] hover:text-white'
                  )}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'individual' ? (
              <form onSubmit={handleIndividual} className="space-y-3">
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nome completo" required className={inputCls} />
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="E-mail" required className={inputCls} />
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Senha inicial" required minLength={6} className={inputCls} />
                {error && <p className="text-[var(--red)] text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)] text-black font-bold text-sm disabled:opacity-50">
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? 'Criando...' : 'Criar aluno'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleBulk} className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">
                    E-mails (um por linha)
                  </label>
                  <textarea
                    value={bulkEmails}
                    onChange={e => setBulkEmails(e.target.value)}
                    rows={6}
                    placeholder={'aluno1@email.com\naluno2@email.com'}
                    className={cn(inputCls, 'resize-none font-mono text-xs')}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Cada aluno receberá convite por e-mail para definir sua senha.
                </p>

                {bulkResult && (
                  <div className="space-y-1.5">
                    <div className={cn('flex items-center gap-2 text-sm font-semibold', bulkResult.sent > 0 ? 'text-[var(--green)]' : 'text-[var(--text-muted)]')}>
                      <CheckCircle size={13} />
                      {bulkResult.sent} convite{bulkResult.sent !== 1 ? 's' : ''} enviado{bulkResult.sent !== 1 ? 's' : ''}
                    </div>
                    {bulkResult.errors.length > 0 && (
                      <div className="space-y-0.5">
                        {bulkResult.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-[var(--red)]">
                            <AlertCircle size={11} className="mt-0.5 shrink-0" />
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={bulkLoading || !bulkEmails.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)] text-black font-bold text-sm disabled:opacity-50">
                  {bulkLoading && <Loader2 size={13} className="animate-spin" />}
                  {bulkLoading ? 'Enviando...' : 'Enviar Convites'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
