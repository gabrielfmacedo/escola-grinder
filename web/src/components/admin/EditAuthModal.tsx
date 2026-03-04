'use client'

import { useState } from 'react'
import { X, KeyRound, Mail, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  student: { id: string; full_name: string; email: string }
  onClose: () => void
  onSaved?: () => void
}

export default function EditAuthModal({ student, onClose, onSaved }: Props) {
  const [email, setEmail] = useState(student.email)
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setError(null)
    if (password && password !== confirmPw) {
      setError('As senhas não coincidem.')
      return
    }
    if (password && password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    const body: Record<string, string> = { id: student.id }
    if (email && email !== student.email) body.email = email
    if (password) body.password = password

    if (Object.keys(body).length === 1) {
      onClose()
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/update-student', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      onSaved?.()
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold text-white text-sm">Editar Credenciais</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{student.full_name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
              <Mail size={11} className="inline mr-1 mb-0.5" />E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field w-full"
            />
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
              <KeyRound size={11} className="inline mr-1 mb-0.5" />Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                className="input-field w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          {password && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
                Confirmar Senha
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repita a nova senha"
                className="input-field w-full"
              />
            </div>
          )}

          {error && <p className="text-[var(--red)] text-xs">{error}</p>}
          {success && <p className="text-[var(--green)] text-xs">Salvo com sucesso!</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold bg-[var(--cyan)] text-black transition-opacity',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
