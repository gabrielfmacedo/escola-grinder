'use client'

import { useState } from 'react'
import { Plus, X, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  message: string | null
  is_active: boolean
  expires_at: string | null
  action_url: string | null
  action_label: string | null
  created_at: string
}

export default function AnunciosAdmin({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[]
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ title: '', message: '', expires_at: '', action_url: '', action_label: '' })
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        message: form.message || null,
        expires_at: form.expires_at || null,
        action_url: form.action_url || null,
        action_label: form.action_label || null,
      }),
    })

    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }
    const newAnn = await res.json()
    setAnnouncements(prev => [{ ...newAnn, title: form.title, message: form.message || null, is_active: true, expires_at: form.expires_at || null, action_url: form.action_url || null, action_label: form.action_label || null, created_at: new Date().toISOString() }, ...prev])
    setForm({ title: '', message: '', expires_at: '', action_url: '', action_label: '' })
    setShowForm(false)
  }

  async function toggleActive(id: string, is_active: boolean) {
    setToggling(id)
    await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !is_active }),
    })
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !is_active } : a))
    setToggling(null)
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
    <div className="space-y-4">
      {/* Novo anúncio */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--gold)]/50 hover:text-white text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Novo Anúncio
        </button>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">Novo Anúncio</h2>
            <button onClick={() => setShowForm(false)} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Título *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Ex: Nova aula disponível!" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Mensagem</label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Detalhes do anúncio..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Expira em (opcional)</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Link do botão (opcional)</label>
              <input type="url" value={form.action_url} onChange={e => set('action_url', e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
            {form.action_url && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Texto do botão</label>
                <input value={form.action_label} onChange={e => set('action_label', e.target.value)} className={inputCls} placeholder="Ver mais" />
              </div>
            )}
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold text-sm transition-colors disabled:opacity-50">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Criando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de anúncios */}
      {!announcements.length && (
        <div className="text-center py-12 text-sm text-[var(--text-muted)]">
          Nenhum anúncio criado ainda.
        </div>
      )}

      <div className="space-y-2">
        {announcements.map(a => (
          <div key={a.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border transition-colors',
              a.is_active
                ? 'bg-[var(--surface-1)] border-[var(--border)]'
                : 'bg-[var(--surface-1)]/60 border-[var(--border)] opacity-50'
            )}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">{a.title}</p>
                {a.is_active && (
                  <span className="shrink-0 text-[10px] font-bold text-[var(--green)] bg-[var(--green)]/10 px-1.5 py-0.5 rounded-full">ATIVO</span>
                )}
              </div>
              {a.message && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{a.message}</p>}
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                {a.expires_at && ` · expira ${new Date(a.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </p>
            </div>
            <button
              onClick={() => toggleActive(a.id, a.is_active)}
              disabled={toggling === a.id}
              title={a.is_active ? 'Desativar' : 'Ativar'}
              className={cn(
                'shrink-0 p-2 rounded-lg transition-colors',
                a.is_active
                  ? 'text-[var(--red)] hover:bg-[var(--red)]/10'
                  : 'text-[var(--green)] hover:bg-[var(--green)]/10'
              )}
            >
              {toggling === a.id ? <Loader2 size={14} className="animate-spin" /> : (a.is_active ? <X size={14} /> : <Check size={14} />)}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
