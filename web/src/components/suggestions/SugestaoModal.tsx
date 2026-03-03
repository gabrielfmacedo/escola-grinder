'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestionStatus } from '@/lib/supabase/types'

interface Suggestion {
  id: string
  title: string
  body: string
  status: SuggestionStatus
  created_at: string
}

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  pending: 'Pendente',
  reviewing: 'Em Análise',
  approved: 'Aprovado',
  implemented: 'Implementado',
  rejected: 'Rejeitado',
}

const STATUS_COLOR: Record<SuggestionStatus, string> = {
  pending: 'var(--text-muted)',
  reviewing: '#60a5fa',
  approved: 'var(--green)',
  implemented: 'var(--cyan)',
  rejected: 'var(--red)',
}

export default function SugestaoModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'new' | 'mine'>('new')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    if (tab === 'mine') {
      setLoadingSuggestions(true)
      fetch('/api/suggestions')
        .then(r => r.json())
        .then(d => setSuggestions(d.suggestions ?? []))
        .catch(() => {})
        .finally(() => setLoadingSuggestions(false))
    }
  }, [tab])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !body.trim()) { setError('Preencha todos os campos'); return }
    setLoading(true)
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao enviar')
      return
    }
    setSuccess(true)
    setTitle('')
    setBody('')
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-[var(--gold)]" />
            <h2 className="font-bold text-white">Sugestões</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {[{ key: 'new', label: 'Nova Sugestão' }, { key: 'mine', label: 'Minhas Sugestões' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key as typeof tab); setSuccess(false) }}
              className={cn(
                'flex-1 py-3 text-xs font-semibold transition-colors',
                tab === t.key
                  ? 'text-white border-b-2 border-[var(--cyan)] -mb-px'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {success && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30">
                <span className="text-[var(--green)] text-sm font-semibold">Sugestão enviada! Obrigado.</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Título <span className="text-[var(--red)]">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Filtro por stake no grind"
                className={inputCls} maxLength={100} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Descrição <span className="text-[var(--red)]">*</span></label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                placeholder="Descreva a sua ideia ou melhoria..."
                rows={4} className={cn(inputCls, 'resize-none')} maxLength={1000} />
              <p className="text-[10px] text-[var(--text-muted)] text-right">{body.length}/1000</p>
            </div>
            {error && <p className="text-[var(--red)] text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {loading ? 'Enviando...' : 'Enviar Sugestão'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5">
            {loadingSuggestions ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb size={24} className="text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Nenhuma sugestão enviada ainda.</p>
                <button onClick={() => setTab('new')} className="text-xs text-[var(--cyan)] hover:underline mt-2 block mx-auto">
                  Enviar primeira sugestão →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map(s => (
                  <div key={s.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ color: STATUS_COLOR[s.status], backgroundColor: STATUS_COLOR[s.status] + '18' }}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2">{s.body}</p>
                    <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
