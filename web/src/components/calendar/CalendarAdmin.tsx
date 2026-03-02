'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const EVENT_TYPES = [
  { value: 'live_class',      label: 'Aula ao Vivo' },
  { value: 'content_release', label: 'Novo Conteúdo' },
  { value: 'tournament',      label: 'Torneio' },
  { value: 'other',           label: 'Outro' },
]

export default function CalendarAdmin() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    type: 'live_class',
    url: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at || null,
        type: form.type,
        url: form.url || null,
      }),
    })

    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }

    setOpen(false)
    setForm({ title: '', description: '', starts_at: '', ends_at: '', type: 'live_class', url: '' })
    window.location.reload()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors',
    '[&_option]:bg-[var(--surface-2)]'
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white text-sm font-bold transition-colors"
      >
        <Plus size={14} /> Novo Evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-white">Novo Evento</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Título *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Ex: Aula de MTT" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-muted)] font-medium">Início *</label>
                  <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--text-muted)] font-medium">Fim</label>
                  <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Tipo</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Link (opcional)</label>
                <input type="url" value={form.url} onChange={e => set('url', e.target.value)} className={inputCls} placeholder="https://..." />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Descrição</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Detalhes do evento..." />
              </div>

              {error && <p className="text-sm text-[var(--red)]">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Criando...' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
