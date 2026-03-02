'use client'

import { useState } from 'react'
import { Send, Bell, Users, User, Check, Loader2, Clock } from 'lucide-react'

type Student = { id: string; full_name: string | null; email: string | null }
type RecentNotif = { id: string; title: string; message: string | null; type: string; created_at: string | null }

const TYPES = [
  { value: 'system',      label: 'Sistema',    color: 'var(--text-dim)' },
  { value: 'new_content', label: 'Novo conteúdo', color: 'var(--cyan)' },
  { value: 'achievement', label: 'Conquista',  color: 'var(--gold)' },
  { value: 'mentorship',  label: 'Mentoria',   color: 'var(--green)' },
]

export default function AdminNotificationSender({
  students, recentNotifications
}: {
  students: Student[]
  recentNotifications: RecentNotif[]
}) {
  const [target, setTarget] = useState<'all' | string>('all')
  const [type, setType] = useState('system')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSent(null)

    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, type, target, action_url: actionUrl || null }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao enviar')
    } else {
      setSent(data.sent)
      setTitle('')
      setMessage('')
      setActionUrl('')
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* ── Formulário ─────────────────────────── */}
      <div className="lg:col-span-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
        <h2 className="font-black text-white text-sm flex items-center gap-2">
          <Bell size={15} className="text-[var(--cyan)]" /> Nova notificação
        </h2>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Destinatário */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-2">Destinatário</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTarget('all')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors
                  ${target === 'all'
                    ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'}`}
              >
                <Users size={13} /> Todos os alunos
              </button>
              <button
                type="button"
                onClick={() => setTarget('')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors
                  ${target !== 'all'
                    ? 'bg-[var(--cyan)]/10 border-[var(--cyan)] text-white'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hi)]'}`}
              >
                <User size={13} /> Aluno específico
              </button>
            </div>

            {target !== 'all' && (
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="input-field"
                required={target !== 'all'}
              >
                <option value="">Selecione um aluno...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors text-left
                    ${type === t.value
                      ? 'border-[var(--border-hi)] bg-white/5 text-white'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/[0.02]'}`}
                  style={type === t.value ? { borderColor: t.color, color: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">Título *</label>
            <input
              required value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ex: Novo conteúdo disponível!"
              maxLength={100}
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">Mensagem *</label>
            <textarea
              required value={message}
              onChange={e => setMessage(e.target.value)}
              className="input-field resize-none"
              rows={4}
              placeholder="Digite a mensagem que o aluno vai receber..."
              maxLength={500}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{message.length}/500</p>
          </div>

          {/* Link (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">Link (opcional)</label>
            <input
              type="url"
              value={actionUrl}
              onChange={e => setActionUrl(e.target.value)}
              className="input-field"
              placeholder="https://... ou /performance"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Se preenchido, a notificação terá um botão "Ver mais".</p>
          </div>

          {error && <p className="text-sm text-[var(--red)]">{error}</p>}

          {sent !== null && (
            <div className="flex items-center gap-2 text-sm text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/20 px-4 py-3 rounded-xl">
              <Check size={14} /> Enviado para {sent} destinatário{sent !== 1 ? 's' : ''}!
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-black text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? 'Enviando...' : 'Enviar Notificação'}
          </button>
        </form>
      </div>

      {/* ── Histórico ──────────────────────────── */}
      <div className="lg:col-span-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="font-black text-white text-sm flex items-center gap-2 mb-4">
          <Clock size={14} className="text-[var(--text-muted)]" /> Enviadas recentemente
        </h2>
        {recentNotifications.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">Nenhuma notificação enviada ainda.</p>
        ) : (
          <div className="space-y-2">
            {recentNotifications.map(n => (
              <div key={n.id} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-xs font-semibold text-white line-clamp-1">{n.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{n.message}</p>
                {n.created_at && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
